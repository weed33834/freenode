"""app.models 的单元测试。

覆盖 Node.compute_fingerprint 稳定性与唯一性、encrypt_secret/decrypt_secret 透传与加解密。
"""

from __future__ import annotations

import hashlib
import secrets

from app.models.node import Node

# ─── compute_fingerprint ─────────────────────────────────────────────


def test_fingerprint_stable_across_calls():
    # 同一输入必须产生同一指纹
    fp1 = Node.compute_fingerprint("vmess", "1.2.3.4", 443, "uuid-1")
    fp2 = Node.compute_fingerprint("vmess", "1.2.3.4", 443, "uuid-1")
    assert fp1 == fp2


def test_fingerprint_is_sha256_hex():
    fp = Node.compute_fingerprint("ss", "example.com", 8388, "pass")
    assert len(fp) == 64
    assert all(c in "0123456789abcdef" for c in fp)


def test_fingerprint_changes_with_protocol():
    fp1 = Node.compute_fingerprint("vmess", "1.2.3.4", 443, "secret")
    fp2 = Node.compute_fingerprint("vless", "1.2.3.4", 443, "secret")
    assert fp1 != fp2


def test_fingerprint_changes_with_server():
    fp1 = Node.compute_fingerprint("vmess", "1.2.3.4", 443, "secret")
    fp2 = Node.compute_fingerprint("vmess", "5.6.7.8", 443, "secret")
    assert fp1 != fp2


def test_fingerprint_changes_with_port():
    fp1 = Node.compute_fingerprint("vmess", "1.2.3.4", 443, "secret")
    fp2 = Node.compute_fingerprint("vmess", "1.2.3.4", 8443, "secret")
    assert fp1 != fp2


def test_fingerprint_changes_with_secret():
    fp1 = Node.compute_fingerprint("vmess", "1.2.3.4", 443, "secret-a")
    fp2 = Node.compute_fingerprint("vmess", "1.2.3.4", 443, "secret-b")
    assert fp1 != fp2


def test_fingerprint_protocol_case_insensitive():
    # 协议名大小写不敏感，VMESS 和 vmess 指纹一致
    fp1 = Node.compute_fingerprint("VMESS", "1.2.3.4", 443, "secret")
    fp2 = Node.compute_fingerprint("vmess", "1.2.3.4", 443, "secret")
    assert fp1 == fp2


def test_fingerprint_server_case_insensitive():
    # server 主机名大小写不敏感
    fp1 = Node.compute_fingerprint("vmess", "Example.COM", 443, "secret")
    fp2 = Node.compute_fingerprint("vmess", "example.com", 443, "secret")
    assert fp1 == fp2


def test_fingerprint_matches_manual_sha256():
    # 确认实现就是 sha256("proto|server|port|secret") 小写
    raw = "vmess|example.com|443|secret"
    expected = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    assert Node.compute_fingerprint("vmess", "Example.COM", 443, "secret") == expected


# ─── encrypt_secret / decrypt_secret ─────────────────────────────────


def test_encrypt_secret_without_key_passthrough(clean_env, reset_crypto_singleton):
    # 没配 key，encrypt_secret 透传
    assert Node.encrypt_secret("hello") == "hello"
    assert Node.encrypt_secret("") == ""


def test_decrypt_secret_without_key_passthrough(clean_env, reset_crypto_singleton):
    assert Node.decrypt_secret("anything") == "anything"


def test_encrypt_decrypt_secret_roundtrip(monkeypatch, reset_crypto_singleton):
    monkeypatch.setenv("FREENODE_SECRET_KEY_HEX", secrets.token_hex(32))
    from app.config import get_settings

    get_settings.cache_clear()

    original = "super-secret-uuid"
    ct = Node.encrypt_secret(original)
    assert ct != original  # 确实加密了
    assert Node.decrypt_secret(ct) == original  # 能解回来


def test_decrypt_secret_returns_original_on_failure(monkeypatch, reset_crypto_singleton):
    # decrypt_secret 内部捕获 ValueError，解密失败时原样返回（避免详情接口 500）
    monkeypatch.setenv("FREENODE_SECRET_KEY_HEX", secrets.token_hex(32))
    from app.config import get_settings

    get_settings.cache_clear()

    # 喂一个非法的密文，decrypt_secret 不抛异常，原样返回
    result = Node.decrypt_secret("not-valid-cipher-text")
    assert result == "not-valid-cipher-text"


def test_encrypt_secret_handles_none_as_empty(clean_env, reset_crypto_singleton):
    # Node.encrypt_secret 内部用 `plaintext or ""` 兜底 None
    assert Node.encrypt_secret(None) == ""
