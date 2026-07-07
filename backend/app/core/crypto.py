"""节点密钥的 AES-GCM 加解密。key 没配就降级明文，只用于开发。"""

from __future__ import annotations

import os
import threading

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import get_settings

_aesgcm: AESGCM | None = None
_aesgcm_lock = threading.Lock()


def _get_aesgcm() -> AESGCM | None:
    """单例 AESGCM，线程安全。

    没配 key 就返回 None，上层走明文（开发/测试模式）。
    """
    global _aesgcm
    if _aesgcm is not None:
        return _aesgcm
    with _aesgcm_lock:
        if _aesgcm is not None:
            return _aesgcm
        key_hex = get_settings().secret_key_hex
        if not key_hex:
            return None
        # AESGCM(bytes.fromhex(key_hex)) 会校验长度（16/24/32 字节），
        # 配错长度时直接抛 ValueError，调用方能在启动后第一次加解密时发现。
        _aesgcm = AESGCM(bytes.fromhex(key_hex))
        return _aesgcm


def encrypt(plaintext: str) -> str:
    # 没配 key 直接透传，保证开发环境和测试能跑
    gcm = _get_aesgcm()
    if gcm is None:
        return plaintext
    # 12 字节随机 nonce，拼到密文前一起存
    nonce = os.urandom(12)
    ct = gcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return (nonce + ct).hex()


def decrypt(ciphertext_hex: str) -> str:
    gcm = _get_aesgcm()
    if gcm is None:
        return ciphertext_hex
    try:
        data = bytes.fromhex(ciphertext_hex)
        nonce, ct = data[:12], data[12:]
        return gcm.decrypt(nonce, ct, None).decode("utf-8")
    except Exception as e:
        # 解密失败（key 换了 / 数据损坏）抛 ValueError，调用方决定怎么处理
        raise ValueError(f"解密失败: {e}") from e


def reset_aesgcm_singleton() -> None:
    """清掉 AESGCM 单例。给测试用，业务代码不要调。"""
    global _aesgcm
    with _aesgcm_lock:
        _aesgcm = None
