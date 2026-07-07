"""backend/app/config.py 的单元测试。

覆盖 Settings 默认值、环境变量覆盖、get_settings 缓存行为。
运行：cd backend && python3 -m pytest tests/test_config.py -v
或   ：python3 -m pytest backend/tests/test_config.py -v（从根目录）
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# backend/ 加入 path，便于直接 import app
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))


import app.config as config_module


def _reload_config():
    """重新加载 config 模块，让 lru_cache 的 get_settings 失效并重读环境变量。"""
    config_module.get_settings.cache_clear()
    return config_module.get_settings()


def test_defaults():
    # test_api.py 在模块顶层会设这几个变量，pytest 一起跑时会污染，这里显式清掉。
    for k in (
        "FREENODE_DEBUG",
        "FREENODE_MAX_NODES",
        "FREENODE_MAX_PROXIES",
        "FREENODE_VERIFY_NODES",
        "FREENODE_ADMIN_API_KEY",
        "FREENODE_DATABASE_URL",
        "FREENODE_CORS_ORIGINS",
        "FREENODE_SECRET_KEY_HEX",
    ):
        os.environ.pop(k, None)
    s = _reload_config()
    assert s.app_name == "FreeNode API"
    assert s.debug is False
    assert s.api_prefix == "/api"
    assert s.max_nodes == 800
    assert s.max_proxies == 300
    assert s.verify_nodes is True
    assert s.verify_timeout == 5
    assert s.verify_workers == 50
    assert s.geo_enabled is False
    assert s.crawl_workers == 16
    assert s.admin_api_key == ""
    # 调度默认值
    assert s.schedule_full_refresh == "0 3 * * *"
    assert s.schedule_verify_alive == "*/30 * * * *"
    assert s.schedule_verify_dead == "0 */6 * * *"
    assert s.schedule_cleanup == "0 4 * * *"


def test_env_overrides():
    os.environ["FREENODE_DEBUG"] = "true"
    os.environ["FREENODE_MAX_NODES"] = "42"
    os.environ["FREENODE_MAX_PROXIES"] = "7"
    os.environ["FREENODE_VERIFY_NODES"] = "false"
    os.environ["FREENODE_ADMIN_API_KEY"] = "secret"
    os.environ["FREENODE_CORS_ORIGINS"] = "https://a.com,https://b.com"
    try:
        s = _reload_config()
        assert s.debug is True
        assert s.max_nodes == 42
        assert s.max_proxies == 7
        assert s.verify_nodes is False
        assert s.admin_api_key == "secret"
        assert s.cors_origins == "https://a.com,https://b.com"
    finally:
        for k in (
            "FREENODE_DEBUG",
            "FREENODE_MAX_NODES",
            "FREENODE_MAX_PROXIES",
            "FREENODE_VERIFY_NODES",
            "FREENODE_ADMIN_API_KEY",
            "FREENODE_CORS_ORIGINS",
        ):
            os.environ.pop(k, None)


def test_get_settings_is_cached():
    config_module.get_settings.cache_clear()
    first = config_module.get_settings()
    second = config_module.get_settings()
    # lru_cache 保证同一实例
    assert first is second


def test_paths_resolve_to_project_root():
    s = _reload_config()
    # sources_config_path 必须指向项目根的 config/sources.json
    assert s.sources_config_path.endswith(os.path.join("config", "sources.json"))
    assert s.nodes_output_dir.endswith(os.path.join("nodes"))
    # 路径确实存在
    assert Path(s.sources_config_path).parent.exists()
