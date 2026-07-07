"""scripts/publish_mirrors.py 的单元测试。

全部 mock HTTP 请求和 boto3，不发真实网络请求、不依赖 boto3 安装。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

import publish_mirrors as pm

# ─── 共享 fixture ─────────────────────────────────────────────────────


@pytest.fixture
def tmp_nodes_dir(tmp_path: Path) -> Path:
    """生成一个临时 nodes 目录，里面塞两个测试文件。"""
    nodes = tmp_path / "nodes"
    nodes.mkdir()
    (nodes / "v2ray.txt").write_text("vmess://test1\n", encoding="utf-8")
    (nodes / "clash.yaml").write_text("proxies: []\n", encoding="utf-8")
    return nodes


@pytest.fixture
def clean_mirror_env(monkeypatch: pytest.MonkeyPatch):
    """清掉所有镜像相关环境变量，避免被宿主机污染。"""
    for k in (
        "PINATA_API_KEY",
        "PINATA_SECRET_API_KEY",
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET",
        "FREENODE_LOCAL_MIRROR_DIR",
    ):
        monkeypatch.delenv(k, raising=False)


# ─── test_publish_to_local ────────────────────────────────────────────


def test_publish_to_local_copies_files(tmp_nodes_dir: Path, tmp_path: Path):
    """本地镜像：复制 nodes/ 到 dest，所有文件都应到位。"""
    dest = tmp_path / "mirror"
    result = pm.publish_to_local(tmp_nodes_dir, dest)

    assert result is not None
    assert result["path"] == str(dest)
    assert (dest / "v2ray.txt").read_text(encoding="utf-8") == "vmess://test1\n"
    assert (dest / "clash.yaml").read_text(encoding="utf-8") == "proxies: []\n"


def test_publish_to_local_creates_dest(tmp_nodes_dir: Path, tmp_path: Path):
    """dest 不存在时应自动创建。"""
    dest = tmp_path / "subdir" / "mirror"
    result = pm.publish_to_local(tmp_nodes_dir, dest)
    assert result is not None
    assert dest.is_dir()


def test_publish_to_local_missing_nodes_dir(tmp_path: Path):
    """nodes/ 不存在时返回 None。"""
    result = pm.publish_to_local(tmp_path / "nope", tmp_path / "mirror")
    assert result is None


# ─── test_publish_to_ipfs_mock ────────────────────────────────────────


def test_publish_to_ipfs_mock(tmp_nodes_dir: Path, monkeypatch: pytest.MonkeyPatch):
    """mock Pinata API：返回假 CID，验证 publish_to_ipfs 解析正确。"""
    monkeypatch.setenv("PINATA_API_KEY", "test-key")
    monkeypatch.setenv("PINATA_SECRET_API_KEY", "test-secret")

    fake_response = {"IpfsHash": "QmFakeCid123", "PinSize": 1024, "Timestamp": "2026-07-04T12:00:00Z"}

    with patch.object(pm, "_pin_to_pinata", return_value=fake_response) as mock_pin:
        result = pm.publish_to_ipfs(tmp_nodes_dir)

    assert result is not None
    assert result["cid"] == "QmFakeCid123"
    assert result["url"] == "https://gateway.pinata.cloud/ipfs/QmFakeCid123"
    # 确认 mock 被调用，且 file_data 含两个文件
    assert mock_pin.called
    call_args = mock_pin.call_args
    file_data = call_args.args[0]
    assert len(file_data) == 2
    # 每个元素是 ("file", (filename, bytes, content_type))
    filenames = {item[1][0] for item in file_data}
    assert filenames == {"v2ray.txt", "clash.yaml"}


def test_publish_to_ipfs_no_env(tmp_nodes_dir: Path, monkeypatch: pytest.MonkeyPatch):
    """没配 PINATA_API_KEY 时应跳过，返回 None。"""
    monkeypatch.delenv("PINATA_API_KEY", raising=False)
    monkeypatch.delenv("PINATA_SECRET_API_KEY", raising=False)
    assert pm.publish_to_ipfs(tmp_nodes_dir) is None


def test_publish_to_ipfs_api_failure(tmp_nodes_dir: Path, monkeypatch: pytest.MonkeyPatch):
    """Pinata API 返回 None（HTTP 错误）时，publish_to_ipfs 应返回 None。"""
    monkeypatch.setenv("PINATA_API_KEY", "test-key")
    monkeypatch.setenv("PINATA_SECRET_API_KEY", "test-secret")

    with patch.object(pm, "_pin_to_pinata", return_value=None):
        result = pm.publish_to_ipfs(tmp_nodes_dir)
    assert result is None


# ─── test_publish_to_r2_mock ──────────────────────────────────────────


def test_publish_to_r2_mock(tmp_nodes_dir: Path, monkeypatch: pytest.MonkeyPatch):
    """mock _upload_to_r2：返回假 URL 列表，验证 publish_to_r2 解析正确。"""
    monkeypatch.setenv("R2_ACCOUNT_ID", "acct123")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "access")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setenv("R2_BUCKET", "freenode-mirror")

    fake_urls = [
        "https://pub-freenode-mirror.r2.dev/nodes/v2ray.txt",
        "https://pub-freenode-mirror.r2.dev/nodes/clash.yaml",
    ]
    with patch.object(pm, "_upload_to_r2", return_value=fake_urls) as mock_upload:
        result = pm.publish_to_r2(tmp_nodes_dir)

    assert result is not None
    assert result["bucket"] == "freenode-mirror"
    assert result["urls"] == fake_urls
    # 确认 mock 被调用，参数传的是文件列表 + 凭据
    assert mock_upload.called
    call_args = mock_upload.call_args
    files_arg = call_args.args[0]
    assert len(files_arg) == 2
    assert call_args.args[4] == "freenode-mirror"  # bucket


def test_publish_to_r2_no_env(tmp_nodes_dir: Path, monkeypatch: pytest.MonkeyPatch):
    """R2_* 没配全时应跳过。"""
    monkeypatch.setenv("R2_BUCKET", "x")
    # 其他 R2_* 没设
    monkeypatch.delenv("R2_ACCOUNT_ID", raising=False)
    monkeypatch.delenv("R2_ACCESS_KEY_ID", raising=False)
    monkeypatch.delenv("R2_SECRET_ACCESS_KEY", raising=False)
    assert pm.publish_to_r2(tmp_nodes_dir) is None


def test_publish_to_r2_boto3_missing(tmp_nodes_dir: Path, monkeypatch: pytest.MonkeyPatch):
    """_upload_to_r2 在 boto3 没装时应返回 None（懒加载逻辑）。"""
    monkeypatch.setenv("R2_ACCOUNT_ID", "acct")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "access")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setenv("R2_BUCKET", "bucket")

    # 模拟 boto3 不可用：让 import boto3 抛 ImportError
    import builtins

    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name.startswith("boto3") or name.startswith("botocore"):
            raise ImportError(f"simulated: {name} not installed")
        return real_import(name, *args, **kwargs)

    with patch.object(builtins, "__import__", side_effect=fake_import):
        urls = pm._upload_to_r2(
            [tmp_nodes_dir / "v2ray.txt"],
            "acct",
            "access",
            "secret",
            "bucket",
        )
    assert urls is None


# ─── test_update_mirrors_json ─────────────────────────────────────────


def test_update_mirrors_json(tmp_path: Path):
    """生成 mirrors.json：格式正确，包含 generated_at 和 mirrors 列表。"""
    mirrors = [
        {"type": "github_raw", "name": "GitHub Raw", "base_url": "https://example.com/nodes"},
        {"type": "ipfs", "name": "IPFS (Pinata)", "cid": "QmTest", "base_url": "https://gw/ipfs/QmTest"},
    ]
    output = tmp_path / "mirrors.json"
    pm.update_mirrors_json(mirrors, output)

    assert output.exists()
    data = json.loads(output.read_text(encoding="utf-8"))
    assert "generated_at" in data
    assert isinstance(data["generated_at"], str)
    assert data["mirrors"] == mirrors


def test_update_mirrors_json_creates_parent_dir(tmp_path: Path):
    """output 父目录不存在时应自动创建。"""
    output = tmp_path / "sub" / "deep" / "mirrors.json"
    pm.update_mirrors_json([], output)
    assert output.exists()


# ─── test_main_no_env ─────────────────────────────────────────────────


def test_main_no_env(
    tmp_nodes_dir: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    clean_mirror_env: None,
):
    """没配任何镜像环境变量时，只写 GitHub/GitCode 固定镜像。"""
    output = tmp_path / "mirrors.json"
    # main 里相对路径相对项目根，传绝对路径避免污染
    exit_code = pm.main(
        ["--nodes-dir", str(tmp_nodes_dir), "--output", str(output)]
    )

    assert exit_code == 0
    data = json.loads(output.read_text(encoding="utf-8"))
    types = [m["type"] for m in data["mirrors"]]
    # 只有 GitHub 和 GitCode 两个固定镜像
    assert types == ["github_raw", "gitcode_raw"]
    assert len(data["mirrors"]) == 2


# ─── test_main_partial_failure ────────────────────────────────────────


def test_main_partial_failure(
    tmp_nodes_dir: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    clean_mirror_env: None,
):
    """某个镜像失败不影响其他：IPFS 失败 + 本地成功 → mirrors.json 含本地。"""
    # 配 IPFS 凭据但 mock _pin_to_pinata 返回 None（失败）
    monkeypatch.setenv("PINATA_API_KEY", "k")
    monkeypatch.setenv("PINATA_SECRET_API_KEY", "s")
    # 配本地镜像目录
    local_dest = tmp_path / "local_mirror"
    monkeypatch.setenv("FREENODE_LOCAL_MIRROR_DIR", str(local_dest))

    output = tmp_path / "mirrors.json"

    with patch.object(pm, "_pin_to_pinata", return_value=None):
        exit_code = pm.main(
            ["--nodes-dir", str(tmp_nodes_dir), "--output", str(output)]
        )

    assert exit_code == 0
    data = json.loads(output.read_text(encoding="utf-8"))
    types = [m["type"] for m in data["mirrors"]]
    # IPFS 失败了不应出现；本地成功应出现；固定地址始终在
    assert "ipfs" not in types
    assert "local" in types
    assert "github_raw" in types
    assert "gitcode_raw" in types

    # 本地镜像文件确实被复制过去了
    assert (local_dest / "v2ray.txt").exists()
    assert (local_dest / "clash.yaml").exists()


def test_main_all_mirrors_success(
    tmp_nodes_dir: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    clean_mirror_env: None,
):
    """所有镜像都成功时 mirrors.json 应包含全部类型。"""
    monkeypatch.setenv("PINATA_API_KEY", "k")
    monkeypatch.setenv("PINATA_SECRET_API_KEY", "s")
    monkeypatch.setenv("R2_ACCOUNT_ID", "a")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "ak")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "sk")
    monkeypatch.setenv("R2_BUCKET", "bk")
    monkeypatch.setenv("FREENODE_LOCAL_MIRROR_DIR", str(tmp_path / "local"))

    fake_pinata = {"IpfsHash": "QmFull", "PinSize": 1, "Timestamp": "2026-07-04T12:00:00Z"}
    fake_r2_urls = ["https://pub-bk.r2.dev/nodes/v2ray.txt"]

    with (
        patch.object(pm, "_pin_to_pinata", return_value=fake_pinata),
        patch.object(pm, "_upload_to_r2", return_value=fake_r2_urls),
    ):
        output = tmp_path / "mirrors.json"
        exit_code = pm.main(
            ["--nodes-dir", str(tmp_nodes_dir), "--output", str(output)]
        )

    assert exit_code == 0
    data = json.loads(output.read_text(encoding="utf-8"))
    types = [m["type"] for m in data["mirrors"]]
    assert types == ["github_raw", "gitcode_raw", "ipfs", "r2", "local"]
    # IPFS 条目带 cid
    ipfs_entry = next(m for m in data["mirrors"] if m["type"] == "ipfs")
    assert ipfs_entry["cid"] == "QmFull"
    assert ipfs_entry["base_url"] == "https://gateway.pinata.cloud/ipfs/QmFull"
    # R2 条目带 bucket，base_url 是去掉文件名的目录部分
    r2_entry = next(m for m in data["mirrors"] if m["type"] == "r2")
    assert r2_entry["bucket"] == "bk"
    assert r2_entry["base_url"] == "https://pub-bk.r2.dev/nodes"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
