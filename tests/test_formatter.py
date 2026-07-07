import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from formatter import _compute_stats, to_clash_yaml, to_proxy_list, to_v2ray_subscription

from utils import is_private_host


def test_to_clash_yaml_basic():
    links = [
        "ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@example.com:443#test",
        "trojan://pass@example.com:443#trojan-test",
    ]
    yaml = to_clash_yaml(links)
    assert "proxies:" in yaml
    assert 'name: "test"' in yaml or "name: test" in yaml
    assert 'name: "trojan-test"' in yaml or "name: trojan-test" in yaml
    assert "proxy-groups:" in yaml


def test_to_clash_yaml_duplicate_names():
    links = [
        "ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@example.com:443#same",
        "trojan://pass@example.com:443#same",
    ]
    yaml = to_clash_yaml(links)
    assert ('name: "same"' in yaml or "name: same" in yaml)
    assert ('name: "same_2"' in yaml or "name: same_2" in yaml)


def test_to_clash_yaml_private_ip_filtered():
    links = [
        "ss://YWVzLTI1Ni1nY206cGFzcw==@127.0.0.1:1080#local",
        "ss://YWVzLTI1Ni1nY206cGFzcw==@192.168.1.1:1080#local",
    ]
    yaml = to_clash_yaml(links)
    # Proxies section starts after "proxies:" and ends before "proxy-groups:"
    proxies_section = yaml.split("proxies:")[1].split("proxy-groups:")[0]
    assert "127.0.0.1" not in proxies_section
    assert "192.168.1.1" not in proxies_section
    # No nodes should be written, so group falls back to DIRECT
    assert "DIRECT" in yaml


def test_to_clash_yaml_disclaimer():
    yaml = to_clash_yaml([])
    assert "DISCLAIMER" in yaml
    assert "educational" in yaml.lower() or "research" in yaml.lower()


def test_to_v2ray_subscription():
    links = ["ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@example.com:443#test"]
    sub = to_v2ray_subscription(links)
    assert sub
    assert not sub.startswith("#")
    import base64
    decoded = base64.b64decode(sub).decode()
    assert "example.com" in decoded


def test_to_v2ray_subscription_private_ip_filtered():
    links = [
        "ss://YWVzLTI1Ni1nY206cGFzcw==@127.0.0.1:1080#local",
        "ss://YWVzLTI1Ni1nY206cGFzcw==@example.com:443#public",
    ]
    sub = to_v2ray_subscription(links)
    import base64
    decoded = base64.urlsafe_b64decode(sub + "=" * (-len(sub) % 4)).decode()
    assert "127.0.0.1" not in decoded
    assert "example.com" in decoded


def test_to_proxy_list():
    proxies = ["http://1.2.3.4:8080", "socks5://5.6.7.8:1080"]
    text = to_proxy_list(proxies)
    assert "http://1.2.3.4:8080" in text
    assert "socks5://5.6.7.8:1080" in text


def test_to_proxy_list_private_ip_filtered():
    proxies = ["http://127.0.0.1:8080", "http://1.2.3.4:8080"]
    text = to_proxy_list(proxies)
    assert "127.0.0.1" not in text
    assert "1.2.3.4" in text


def test_to_proxy_list_ipv6_private_filtered():
    # Link-local IPv6 proxies must be filtered; public IPv6 proxies kept.
    proxies = ["http://[fe80::1]:8080", "http://[2606:4700:4700::1111]:8080"]
    text = to_proxy_list(proxies)
    assert "fe80::1" not in text
    assert "2606:4700:4700::1111" in text


def test_is_private_host():
    assert is_private_host("127.0.0.1") is True
    assert is_private_host("192.168.1.1") is True
    assert is_private_host("10.0.0.1") is True
    assert is_private_host("example.com") is False
    assert is_private_host("localhost.local") is True


def test_compute_stats_all_dead():
    items = [
        {"link": "ss://a", "alive": False, "latency_ms": None, "region": "unknown"},
        {"link": "ss://b", "alive": False, "latency_ms": None, "region": "unknown"},
    ]
    stats = _compute_stats(items)
    assert stats["total"] == 2
    assert stats["alive"] == 0
    assert stats["survival_rate"] == 0.0


def test_compute_stats_mixed():
    items = [
        {"link": "ss://a", "alive": True, "latency_ms": 120, "region": "HK"},
        {"link": "ss://b", "alive": False, "latency_ms": None, "region": "unknown"},
    ]
    stats = _compute_stats(items)
    assert stats["total"] == 2
    assert stats["alive"] == 1
    assert stats["survival_rate"] == 50.0
    assert stats["avg_latency"] == 120.0


def test_compute_stats_raw_links():
    items = ["ss://a", "ss://b"]
    stats = _compute_stats(items)
    assert stats["total"] == 2
    # Raw links carry no liveness flag; survival must be reported as unknown.
    assert stats["alive"] is None
    assert stats["survival_rate"] is None


if __name__ == "__main__":
    test_to_clash_yaml_basic()
    test_to_clash_yaml_duplicate_names()
    test_to_clash_yaml_private_ip_filtered()
    test_to_clash_yaml_disclaimer()
    test_to_v2ray_subscription()
    test_to_v2ray_subscription_private_ip_filtered()
    test_to_proxy_list()
    test_to_proxy_list_private_ip_filtered()
    test_to_proxy_list_ipv6_private_filtered()
    test_is_private_host()
    test_compute_stats_all_dead()
    test_compute_stats_mixed()
    test_compute_stats_raw_links()
    print("formatter tests passed")
