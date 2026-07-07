"""把 nodes/ 目录的订阅文件发布到多个镜像，生成 mirrors.json 清单。

支持的镜像类型（按环境变量启用，互不依赖）：
- IPFS (Pinata)：PINATA_API_KEY + PINATA_SECRET_API_KEY
- Cloudflare R2：R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY + R2_BUCKET
- 本地文件镜像：FREENODE_LOCAL_MIRROR_DIR

GitHub Raw 和 GitCode Raw 是固定地址，始终写入 mirrors.json。
某个镜像失败不影响其他镜像，最终 mirrors.json 只包含成功的镜像 + 固定地址。
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

import httpx

# 让脚本能直接 import utils（pytest 走 pyproject 的 pythonpath 也能找到）
sys.path.insert(0, str(Path(__file__).parent))

from utils import get_logger  # noqa: E402

logger = get_logger("publish_mirrors")

# 固定镜像地址，始终写入 mirrors.json
GITHUB_RAW_BASE = "https://raw.githubusercontent.com/MS33834/freenode/main/nodes"
GITCODE_RAW_BASE = "https://api.gitcode.com/api/v5/repos/badhope/freenode/raw/nodes"

# Pinata pinning API
PINATA_PIN_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"
PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs"

# 请求超时（秒），订阅文件不大但网络可能慢
HTTP_TIMEOUT = 60.0


def _iso_now() -> str:
    """当前 UTC 时间的 ISO 8601 字符串。"""
    from datetime import UTC, datetime

    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _list_node_files(nodes_dir: Path) -> list[Path]:
    """列出 nodes/ 下的所有文件（不递归子目录），按文件名排序。"""
    if not nodes_dir.is_dir():
        logger.warning("nodes 目录不存在: %s", nodes_dir)
        return []
    return sorted(p for p in nodes_dir.iterdir() if p.is_file())


def _pin_to_pinata(
    file_data: list[tuple[str, tuple[str, bytes, str]]],
    api_key: str,
    secret: str,
) -> dict | None:
    """实际调 Pinata pinFileToIPFS 接口；返回响应 JSON 或 None。

    file_data 是 httpx 的 multipart files 参数格式：
    [("file", (filename, bytes, content_type)), ...]
    Pinata 支持同名 file 字段传多个文件，会 pin 成一个目录 CID。
    """
    headers = {
        "pinata_api_key": api_key,
        "pinata_secret_api_key": secret,
    }
    try:
        with httpx.Client(timeout=HTTP_TIMEOUT) as client:
            resp = client.post(PINATA_PIN_FILE_URL, headers=headers, files=file_data)
    except httpx.HTTPError as exc:
        logger.error("Pinata 上传失败（网络错误）: %s", exc)
        return None

    if resp.status_code != 200:
        logger.error("Pinata 上传失败（HTTP %d）: %s", resp.status_code, resp.text[:200])
        return None

    try:
        return resp.json()
    except json.JSONDecodeError:
        logger.error("Pinata 响应不是 JSON: %s", resp.text[:200])
        return None


def publish_to_ipfs(nodes_dir: Path) -> dict | None:
    """上传 nodes/ 到 Pinata，返回 {cid, url} 或 None。

    需要 PINATA_API_KEY + PINATA_SECRET_API_KEY 环境变量。
    Pinata 把整个 nodes/ 目录 pin 成一个目录 CID，客户端能通过
    gateway/<cid>/<filename> 访问单个文件。
    """
    api_key = os.environ.get("PINATA_API_KEY")
    secret = os.environ.get("PINATA_SECRET_API_KEY")
    if not api_key or not secret:
        logger.warning("PINATA_API_KEY / PINATA_SECRET_API_KEY 未配置，跳过 IPFS 镜像")
        return None

    files = _list_node_files(nodes_dir)
    if not files:
        return None

    # 读进内存再传，订阅文件都是 KB 级别，没必要流式
    file_data = [
        ("file", (p.name, p.read_bytes(), "application/octet-stream")) for p in files
    ]
    data = _pin_to_pinata(file_data, api_key, secret)
    if not data:
        return None

    # Pinata 返回 {"IpfsHash": "Qm...", "PinSize": ..., "Timestamp": ...}
    cid = data.get("IpfsHash")
    if not cid:
        logger.error("Pinata 响应里没有 IpfsHash: %s", data)
        return None

    base_url = f"{PINATA_GATEWAY}/{cid}"
    logger.info("IPFS 上传成功: cid=%s, url=%s", cid, base_url)
    return {"cid": cid, "url": base_url}


def _upload_to_r2(
    files: list[Path],
    account_id: str,
    access_key: str,
    secret_key: str,
    bucket: str,
) -> list[str] | None:
    """实际上传文件到 R2；返回公开访问 URL 列表或 None。

    R2 用 S3 兼容 API，需要 boto3。boto3 没装就返回 None，保持默认安装轻量。
    生产用：pip install boto3 后即可启用。
    """
    try:
        import boto3  # type: ignore[import-not-found]
        from botocore.config import Config  # type: ignore[import-not-found]
    except ImportError:
        logger.warning(
            "R2 上传需要 boto3，但未安装。装一下：pip install boto3，"
            "或者用其他镜像类型（ipfs/local）。R2 镜像跳过。"
        )
        return None

    endpoint = f"https://{account_id}.r2.cloudflarestorage.com"
    urls: list[str] = []
    try:
        client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
        for p in files:
            key = f"nodes/{p.name}"
            client.upload_file(str(p), bucket, key)
            # R2 公开访问需要绑定 r2.dev 子域或自定义域；这里假设配了 pub-<bucket>.r2.dev
            urls.append(f"https://pub-{bucket}.r2.dev/{key}")
    except Exception as exc:
        logger.error("R2 上传失败: %s", exc)
        return None

    return urls


def publish_to_r2(nodes_dir: Path) -> dict | None:
    """上传 nodes/ 到 R2，返回 {bucket, urls: [...]} 或 None。

    需要 R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY + R2_BUCKET 环境变量。
    实际上传用 boto3（懒加载，没装就跳过，不强制依赖）。
    """
    account_id = os.environ.get("R2_ACCOUNT_ID")
    access_key = os.environ.get("R2_ACCESS_KEY_ID")
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")
    bucket = os.environ.get("R2_BUCKET")
    if not all([account_id, access_key, secret_key, bucket]):
        logger.warning("R2_* 环境变量未配置全，跳过 R2 镜像")
        return None

    files = _list_node_files(nodes_dir)
    if not files:
        return None

    urls = _upload_to_r2(files, account_id, access_key, secret_key, bucket)
    if not urls:
        return None

    logger.info("R2 上传成功: %d 个文件，bucket=%s", len(urls), bucket)
    return {"bucket": bucket, "urls": urls}


def publish_to_local(nodes_dir: Path, dest: Path) -> dict | None:
    """复制 nodes/ 到本地目录，返回 {path} 或 None。

    dest 目录不存在会自动创建；已存在则覆盖同名文件。
    适合做 nginx/Caddy 静态镜像，或者挂在另一台机器上做备份。
    """
    if not nodes_dir.is_dir():
        logger.warning("nodes 目录不存在: %s", nodes_dir)
        return None

    try:
        dest.mkdir(parents=True, exist_ok=True)
        # nodes/ 本来就是平铺文件，不递归子目录
        for p in nodes_dir.iterdir():
            if p.is_file():
                shutil.copy2(p, dest / p.name)
    except OSError as exc:
        logger.error("本地镜像复制失败: %s", exc)
        return None

    logger.info("本地镜像写入: %s", dest)
    return {"path": str(dest)}


def update_mirrors_json(mirrors: list[dict], output_path: Path) -> None:
    """更新 mirrors.json，列出所有可用的镜像地址。

    输出格式：
    {
      "generated_at": "2026-07-04T12:00:00Z",
      "mirrors": [
        {"type": "github_raw", "name": "GitHub Raw", "base_url": "..."},
        ...
      ]
    }
    """
    payload = {
        "generated_at": _iso_now(),
        "mirrors": mirrors,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    logger.info("mirrors.json 已写入: %s (%d 个镜像)", output_path, len(mirrors))


def _fixed_mirrors() -> list[dict]:
    """GitHub Raw 和 GitCode Raw 是固定地址，始终写入。"""
    return [
        {
            "type": "github_raw",
            "name": "GitHub Raw",
            "base_url": GITHUB_RAW_BASE,
        },
        {
            "type": "gitcode_raw",
            "name": "GitCode Raw",
            "base_url": GITCODE_RAW_BASE,
        },
    ]


def main(argv: list[str] | None = None) -> int:
    """主入口：尝试所有配置的镜像，更新 mirrors.json。

    某个镜像失败不影响其他镜像，最终 mirrors.json 只包含成功的 + 固定地址。
    """
    parser = argparse.ArgumentParser(
        description="把 nodes/ 发布到多个镜像，生成 mirrors.json 清单。",
    )
    parser.add_argument(
        "--nodes-dir",
        default="nodes",
        help="nodes/ 目录路径，默认 nodes/（相对路径相对项目根）",
    )
    parser.add_argument(
        "--output",
        default="nodes/mirrors.json",
        help="输出 mirrors.json 路径，默认 nodes/mirrors.json（相对路径相对项目根）",
    )
    args = parser.parse_args(argv)

    # 相对路径相对项目根
    project_root = Path(__file__).parent.parent
    nodes_dir = Path(args.nodes_dir)
    if not nodes_dir.is_absolute():
        nodes_dir = project_root / nodes_dir
    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = project_root / output_path

    # 固定镜像始终在
    mirrors = _fixed_mirrors()

    # IPFS（Pinata）
    try:
        ipfs_result = publish_to_ipfs(nodes_dir)
        if ipfs_result:
            mirrors.append(
                {
                    "type": "ipfs",
                    "name": "IPFS (Pinata)",
                    "cid": ipfs_result["cid"],
                    "base_url": ipfs_result["url"],
                }
            )
    except Exception as exc:
        # 兜底：某个镜像异常不能影响其他镜像
        logger.error("IPFS 镜像异常: %s", exc)

    # Cloudflare R2
    try:
        r2_result = publish_to_r2(nodes_dir)
        if r2_result:
            # 取第一个 URL 的目录部分作为 base_url
            first_url = r2_result["urls"][0]
            base_url = first_url.rsplit("/", 1)[0]
            mirrors.append(
                {
                    "type": "r2",
                    "name": "Cloudflare R2",
                    "bucket": r2_result["bucket"],
                    "base_url": base_url,
                }
            )
    except Exception as exc:
        logger.error("R2 镜像异常: %s", exc)

    # 本地文件镜像
    local_dir = os.environ.get("FREENODE_LOCAL_MIRROR_DIR")
    if local_dir:
        try:
            local_result = publish_to_local(nodes_dir, Path(local_dir))
            if local_result:
                mirrors.append(
                    {
                        "type": "local",
                        "name": "Local Mirror",
                        "path": local_result["path"],
                    }
                )
        except Exception as exc:
            logger.error("本地镜像异常: %s", exc)

    update_mirrors_json(mirrors, output_path)
    print(f"mirrors.json 已生成: {output_path} ({len(mirrors)} 个镜像)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
