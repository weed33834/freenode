"""Backend integration tests: DB models + API endpoints with sample data.

Run with: cd backend && python3 -m pytest tests/test_api.py -v
Or standalone: cd backend && python3 tests/test_api.py
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

# Ensure backend/ is on the path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Use a temp DB before importing app
os.environ["FREENODE_DEBUG"] = "true"
os.environ["FREENODE_DATABASE_URL"] = f"sqlite:///{BACKEND_DIR / 'data' / 'test.db'}"
os.environ["FREENODE_ADMIN_API_KEY"] = "test-key"


def _rm_test_db() -> None:
    for suffix in ("", "-wal", "-shm", "-journal"):
        p = BACKEND_DIR / "data" / f"test.db{suffix}"
        if p.exists():
            p.unlink()


async def _seed_and_test() -> None:
    """Seed the database with sample nodes and run API checks."""
    from app.database import Base, db_session, get_engine, reset_engine
    from app.models import Node, NodeCheck, ProxySource

    # Reset engine in case a previous test imported it with a different URL.
    reset_engine()
    engine = get_engine()

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed sample data
    async with db_session() as session:
        # Add a source
        src = ProxySource(
            name="test-source",
            url="https://example.com/sub",
            category="nodes",
            source_type="subscription",
            enabled=True,
        )
        session.add(src)
        await session.flush()

        # Add sample nodes
        samples = [
            ("vmess", "1.2.3.4", 443, "uuid-1", True, 120, "HK", "vmess://abc#HK-1"),
            ("vless", "5.6.7.8", 443, "uuid-2", True, 200, "US", "vless://def#US-1"),
            ("ss", "9.10.11.12", 8388, "pass1", False, None, "JP", "ss://ghi#JP-1"),
            ("trojan", "13.14.15.16", 443, "pass2", True, 350, "SG", "trojan://jkl#SG-1"),
        ]
        for proto, server, port, secret, alive, lat, region, link in samples:
            fp = Node.compute_fingerprint(proto, server, port, secret)
            node = Node(
                fingerprint=fp,
                raw_link=link,
                protocol=proto,
                server=server,
                port=port,
                auth_secret=secret,
                network="tcp",
                transport_config="{}",
                tls=True,
                remark=f"{region}-test",
                region=region,
                source_id=src.id,
                source_name="test-source",
                is_alive=alive,
                last_latency_ms=lat,
                fail_reason=None if alive else "timeout",
            )
            session.add(node)
            await session.flush()
            session.add(NodeCheck(node_id=node.id, is_alive=alive, latency_ms=lat, fail_reason=None if alive else "timeout"))

        await session.commit()

    # Now test API endpoints via httpx AsyncClient
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        results = {}

        # Health
        r = await client.get("/api/health")
        results["health"] = r.json()
        assert r.status_code == 200
        assert results["health"]["status"] == "ok"
        assert results["health"]["total_nodes"] == 4
        assert results["health"]["alive_nodes"] == 3

        # Stats
        r = await client.get("/api/stats")
        results["stats"] = r.json()
        assert r.status_code == 200
        assert results["stats"]["total_nodes"] == 4
        assert results["stats"]["alive_nodes"] == 3
        assert results["stats"]["survival_rate"] == 75.0

        # Protocol stats
        r = await client.get("/api/stats/protocols")
        results["protocols"] = r.json()
        assert r.status_code == 200
        assert len(results["protocols"]) == 4

        # Region stats
        r = await client.get("/api/stats/regions")
        results["regions"] = r.json()
        assert r.status_code == 200
        assert len(results["regions"]) == 4

        # Nodes list
        r = await client.get("/api/nodes?limit=2")
        results["nodes"] = r.json()
        assert r.status_code == 200
        assert results["nodes"]["total"] == 4
        assert len(results["nodes"]["items"]) == 2

        # Nodes filter by protocol
        r = await client.get("/api/nodes?protocol=vmess")
        results["nodes_vmess"] = r.json()
        assert r.status_code == 200
        assert results["nodes_vmess"]["total"] == 1

        # Nodes filter by alive
        r = await client.get("/api/nodes?alive=true")
        results["nodes_alive"] = r.json()
        assert r.status_code == 200
        assert results["nodes_alive"]["total"] == 3

        # Node detail
        r = await client.get("/api/nodes/1")
        results["node_detail"] = r.json()
        assert r.status_code == 200
        assert results["node_detail"]["protocol"] == "vmess"

        # Node history
        r = await client.get("/api/nodes/1/history")
        results["node_history"] = r.json()
        assert r.status_code == 200
        assert len(results["node_history"]) == 1

        # Sources
        r = await client.get("/api/sources")
        results["sources"] = r.json()
        assert r.status_code == 200
        assert len(results["sources"]) == 1
        assert results["sources"][0]["name"] == "test-source"

        # Admin without key → 401
        r = await client.post("/api/admin/refresh", json={"verify": False})
        assert r.status_code == 401

        # Admin with key → accepted
        r = await client.post(
            "/api/admin/refresh",
            json={"verify": False},
            headers={"X-API-Key": "test-key"},
        )
        results["admin_refresh"] = r.json()
        assert r.status_code == 200
        assert results["admin_refresh"]["status"] == "accepted"

        # Search
        r = await client.get("/api/nodes?q=HK")
        results["search"] = r.json()
        assert r.status_code == 200
        assert results["search"]["total"] == 1

        # 多值协议筛选：vmess + ss 共 2 个
        r = await client.get("/api/nodes?protocol=vmess,ss")
        results["nodes_multi_protocol"] = r.json()
        assert r.status_code == 200
        assert results["nodes_multi_protocol"]["total"] == 2

        # 多值地区筛选：HK + US 共 2 个
        r = await client.get("/api/nodes?region=HK,US")
        results["nodes_multi_region"] = r.json()
        assert r.status_code == 200
        assert results["nodes_multi_region"]["total"] == 2

        # 筛选下拉用的 filters 端点
        r = await client.get("/api/nodes/filters")
        results["filters"] = r.json()
        assert r.status_code == 200
        assert len(results["filters"]["protocols"]) == 4
        assert len(results["filters"]["regions"]) == 4
        # protocols[0] 的计数应该是最大的
        max_proto_count = max(p["count"] for p in results["filters"]["protocols"])
        assert results["filters"]["protocols"][0]["count"] == max_proto_count

        # ===== metrics 端点（只读，放写操作前跑，数值还是初始状态）=====
        # 没 key → 401
        r = await client.get("/api/admin/metrics")
        assert r.status_code == 401

        # 带 key → 200，结构里有 nodes / sources / last_pipeline
        r = await client.get(
            "/api/admin/metrics",
            headers={"X-API-Key": "test-key"},
        )
        results["metrics"] = r.json()
        assert r.status_code == 200
        assert "nodes" in results["metrics"]
        assert "sources" in results["metrics"]
        assert "last_pipeline" in results["metrics"]
        # 初始状态：4 个节点 3 个存活，1 个源 1 个启用
        assert results["metrics"]["nodes"]["total"] == 4
        assert results["metrics"]["nodes"]["alive"] == 3
        assert results["metrics"]["sources"]["total"] == 1
        assert results["metrics"]["sources"]["enabled"] == 1

        # ===== admin 软删节点 & 切换数据源（放最后，会改 DB 状态）=====
        # 没 key 删节点 → 401
        r = await client.delete("/api/admin/nodes/1")
        results["admin_delete_node_noauth"] = r.status_code
        assert r.status_code == 401

        # 带 key 删节点 → 200，deleted 为 true
        r = await client.delete(
            "/api/admin/nodes/1",
            headers={"X-API-Key": "test-key"},
        )
        results["admin_delete_node"] = r.json()
        assert r.status_code == 200
        assert results["admin_delete_node"]["deleted"] is True

        # 删完再查 detail → 404（get_node 对软删节点返回 404）
        r = await client.get("/api/nodes/1")
        assert r.status_code == 404

        # 没 key 切换源 → 401
        r = await client.patch("/api/admin/sources/1", json={"enabled": False})
        results["admin_patch_source_noauth"] = r.status_code
        assert r.status_code == 401

        # 带 key 切换源 → 200，enabled 变成 false
        r = await client.patch(
            "/api/admin/sources/1",
            json={"enabled": False},
            headers={"X-API-Key": "test-key"},
        )
        results["admin_patch_source"] = r.json()
        assert r.status_code == 200
        assert results["admin_patch_source"]["enabled"] is False

        # 切换后再查 sources，确认 enabled 是 false
        r = await client.get("/api/sources")
        assert r.status_code == 200
        assert r.json()[0]["enabled"] is False

        # ===== 数据源增删改（POST / PATCH / DELETE）=====
        # 没 key POST 源 → 401
        r = await client.post(
            "/api/admin/sources",
            json={"name": "test-new-source", "url": "https://example.com/new.txt",
                  "category": "free_node_sources", "source_type": "node", "enabled": True},
        )
        assert r.status_code == 401

        # 带 key POST 创建源 → 200，name/url 正确
        r = await client.post(
            "/api/admin/sources",
            json={"name": "test-new-source", "url": "https://example.com/new.txt",
                  "category": "free_node_sources", "source_type": "node", "enabled": True},
            headers={"X-API-Key": "test-key"},
        )
        results["admin_create_source"] = r.json()
        assert r.status_code == 200
        assert results["admin_create_source"]["name"] == "test-new-source"
        assert results["admin_create_source"]["url"] == "https://example.com/new.txt"
        new_source_id = results["admin_create_source"]["id"]

        # 重复 url 再 POST → 409
        r = await client.post(
            "/api/admin/sources",
            json={"name": "dup-source", "url": "https://example.com/new.txt",
                  "category": "free_node_sources", "source_type": "node", "enabled": True},
            headers={"X-API-Key": "test-key"},
        )
        assert r.status_code == 409

        # 带 key PATCH 改 name 和 enabled → 200，name 变了 enabled=false
        r = await client.patch(
            f"/api/admin/sources/{new_source_id}",
            json={"name": "renamed-source", "enabled": False},
            headers={"X-API-Key": "test-key"},
        )
        results["admin_update_source"] = r.json()
        assert r.status_code == 200
        assert results["admin_update_source"]["name"] == "renamed-source"
        assert results["admin_update_source"]["enabled"] is False

        # 没 key DELETE 源 → 401
        r = await client.delete(f"/api/admin/sources/{new_source_id}")
        assert r.status_code == 401

        # 带 key DELETE 删刚创建的源 → 200，deleted=true
        r = await client.delete(
            f"/api/admin/sources/{new_source_id}",
            headers={"X-API-Key": "test-key"},
        )
        results["admin_delete_source"] = r.json()
        assert r.status_code == 200
        assert results["admin_delete_source"]["deleted"] is True

        # 删完 GET sources，确认不含这个源
        r = await client.get("/api/sources")
        assert r.status_code == 200
        ids = [s["id"] for s in r.json()]
        assert new_source_id not in ids

        # ===== 趋势 & 数据源抓取日志端点 =====
        # trend 没 key → 401
        r = await client.get("/api/admin/metrics/trend")
        assert r.status_code == 401

        # trend 带 key → 200，结构里有 days 字段
        r = await client.get(
            "/api/admin/metrics/trend",
            headers={"X-API-Key": "test-key"},
        )
        results["trend"] = r.json()
        assert r.status_code == 200
        assert "days" in results["trend"]

        # 源日志：不存在的源 → 404
        r = await client.get(
            "/api/admin/sources/999/logs",
            headers={"X-API-Key": "test-key"},
        )
        assert r.status_code == 404

        # 源日志：source id=1 存在 → 200，返回 list（可能为空）
        r = await client.get(
            "/api/admin/sources/1/logs",
            headers={"X-API-Key": "test-key"},
        )
        results["source_logs"] = r.json()
        assert r.status_code == 200
        assert isinstance(results["source_logs"], list)

    # Print summary
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED")
    print("=" * 60)
    for name, data in results.items():
        print(f"\n--- {name} ---")
        if isinstance(data, dict) and "items" in data:
            print(f"  total={data['total']}, returned={len(data['items'])}")
        elif isinstance(data, list):
            print(f"  count={len(data)}")
        else:
            print(f"  {data}")

    # Cleanup
    await engine.dispose()
    _rm_test_db()


if __name__ == "__main__":
    _rm_test_db()
    asyncio.run(_seed_and_test())


# pytest 入口：让 `pytest backend/tests/` 也能收集到这组集成测试。
# 保留 __main__ 块，方便 `python3 tests/test_api.py` 直接跑。
def test_api_endpoints():
    _rm_test_db()
    try:
        asyncio.run(_seed_and_test())
    finally:
        _rm_test_db()
