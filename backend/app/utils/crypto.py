"""
Encryption for sensitive health data (GDPR Art. 9).
Uses Fernet (symmetric AES) to encrypt insurance_number and care_level at rest.
"""
import base64
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.config import settings

_FERNET: Optional[Fernet] = None


def _get_fernet() -> Optional[Fernet]:
    global _FERNET
    if _FERNET is not None:
        return _FERNET
    key = settings.encryption_key
    if not key or not key.strip():
        return None
    try:
        _FERNET = Fernet(key.strip().encode() if isinstance(key, str) else key)
        return _FERNET
    except Exception:
        return None


def encrypt_value(plaintext: str) -> str:
    """
    Encrypt a string for storage. Returns base64 ciphertext.
    If encryption is not configured, returns plaintext (dev fallback).
    """
    f = _get_fernet()
    if f is None:
        return plaintext
    return f.encrypt(plaintext.encode("utf-8")).decode("ascii")


def decrypt_value(ciphertext: str) -> str:
    """
    Decrypt a stored value. If decryption fails (e.g. legacy plaintext), returns as-is.
    """
    if not ciphertext:
        return ciphertext
    f = _get_fernet()
    if f is None:
        return ciphertext
    try:
        return f.decrypt(ciphertext.encode("ascii")).decode("utf-8")
    except (InvalidToken, Exception):
        return ciphertext  # Legacy plaintext or corrupted
