"""app.core.crypto 的单元测试。

覆盖：明文透传、配 key 后加解密往返、解密失败抛 ValueError、单例缓存。
"""

from __future__ import annotations

import secrets

import pytest

from app.core import crypto


def test_encrypt_without_key_returns_plaintext(clean_env, reset_crypto_singleton):
    # 没配 secret_key_hex，encrypt 直接透传
    assert crypto.encrypt("hello") == "hello"
    assert crypto.encrypt("") == ""


def test_decrypt_without_key_returns_ciphertext(clean_env, reset_crypto_singleton):
    assert crypto.decrypt("anything") == "anything"
    assert crypto.decrypt("") == ""


def test_encrypt_decrypt_roundtrip_with_key(monkeypatch, reset_crypto_singleton):
    # 配一个 32 字节 hex key
    key_hex = secrets.token_hex(32)
    monkeypatch.setenv("FREENODE_SECRET_KEY_HEX", key_hex)
    from app.config import get_settings

    get_settings.cache_clear()

    plaintext = "vmess://secret-uuid@host:443"
    ct = crypto.encrypt(plaintext)
    # 密文必须是 hex 字符串，且不等于明文
    assert ct != plaintext
    assert all(c in "0123456789abcdef" for c in ct)
    # 解密还原
    assert crypto.decrypt(ct) == plaintext


def test_encrypt_produces_different_ciphertexts(monkeypatch, reset_crypto_singleton):
    # 同一明文两次加密，因 nonce 随机，密文必须不同
    monkeypatch.setenv("FREENODE_SECRET_KEY_HEX", secrets.token_hex(32))
    from app.config import get_settings

    get_settings.cache_clear()

    a = crypto.encrypt("same-secret")
    b = crypto.encrypt("same-secret")
    assert a != b
    # 但都能解回同一明文
    assert crypto.decrypt(a) == "same-secret"
    assert crypto.decrypt(b) == "same-secret"


def test_decrypt_with_wrong_key_raises_value_error(monkeypatch, reset_crypto_singleton):
    # 用 key A 加密，换 key B 解密，必须抛 ValueError
    key_a = secrets.token_hex(32)
    monkeypatch.setenv("FREENODE_SECRET_KEY_HEX", key_a)
    from app.config import get_settings

    get_settings.cache_clear()
    ct = crypto.encrypt("secret-data")

    # 换 key
    monkeypatch.setenv("FREENODE_SECRET_KEY_HEX", secrets.token_hex(32))
    get_settings.cache_clear()
    crypto._aesgcm = None  # 强制重建单例

    with pytest.raises(ValueError, match="解密失败"):
        crypto.decrypt(ct)


def test_decrypt_invalid_hex_raises_value_error(monkeypatch, reset_crypto_singleton):
    monkeypatch.setenv("FREENODE_SECRET_KEY_HEX", secrets.token_hex(32))
    from app.config import get_settings

    get_settings.cache_clear()

    with pytest.raises(ValueError):
        crypto.decrypt("not-valid-hex!!")


def test_aesgcm_singleton_cached(monkeypatch, reset_crypto_singleton):
    key_hex = secrets.token_hex(32)
    monkeypatch.setenv("FREENODE_SECRET_KEY_HEX", key_hex)
    from app.config import get_settings

    get_settings.cache_clear()

    g1 = crypto._get_aesgcm()
    g2 = crypto._get_aesgcm()
    # 第二次调用返回同一个实例（单例）
    assert g1 is g2
