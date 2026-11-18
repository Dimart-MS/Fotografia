"""
Seguridad para usuarios de Luz & Memoria.

- Hash de contraseñas con PBKDF2-SHA256.
- Verificación de contraseñas.
- Generación y validación de tokens JWT.
"""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError

import jwt


ALGORITHM = "HS256"
TOKEN_EXPIRATION_MINUTES = 60


def hash_password(password: str) -> str:
    """Genera un hash seguro para almacenar una contraseña."""
    salt = secrets.token_bytes(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        600_000,
    )

    return (
        f"pbkdf2_sha256$600000$"
        f"{salt.hex()}${password_hash.hex()}"
    )


def verify_password(password: str, stored_hash: str) -> bool:
    """Comprueba una contraseña sin almacenar su valor original."""
    try:
        algorithm, iterations, salt_hex, hash_hex = stored_hash.split("$")

        if algorithm != "pbkdf2_sha256":
            return False

        expected_hash = bytes.fromhex(hash_hex)
        salt = bytes.fromhex(salt_hex)

        calculated_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            int(iterations),
        )

        return hmac.compare_digest(calculated_hash, expected_hash)

    except (ValueError, TypeError, OverflowError):
        return False


def get_jwt_secret() -> str:
    """Obtiene la clave secreta utilizada para firmar tokens."""
    secret = os.environ.get("JWT_SECRET_KEY", "")

    if len(secret) < 32:
        raise RuntimeError(
            "JWT_SECRET_KEY debe configurarse con "
            "al menos 32 caracteres."
        )

    return secret


def create_access_token(user_id: int, role: str) -> str:
    """Genera un token de acceso con vencimiento."""
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + timedelta(
            minutes=TOKEN_EXPIRATION_MINUTES
        ),
    }

    return jwt.encode(
        payload,
        get_jwt_secret(),
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    """Valida la firma y vencimiento de un token."""
    return jwt.decode(
        token,
        get_jwt_secret(),
        algorithms=[ALGORITHM],
        options={"require": ["sub", "iat", "exp"]},
    )


bearer_scheme = HTTPBearer(auto_error=False)


def require_user(repository):
    """Exige un usuario autenticado y activo."""
    def validate_user(
        credentials: HTTPAuthorizationCredentials | None = Depends(
            bearer_scheme
        ),
    ):
        if credentials is None:
            raise HTTPException(
                status_code=401,
                detail="Debes iniciar sesión",
            )
        try:
            payload = decode_access_token(
                credentials.credentials
            )
            user_id = int(payload["sub"])
            if user_id <= 0:
                raise ValueError("Identificador inválido")
        except (InvalidTokenError, ValueError, KeyError, TypeError):
            raise HTTPException(
                status_code=401,
                detail="Token inválido o expirado",
            )
        user = repository.get_by_id(user_id)
        if not user or not user["is_active"]:
            raise HTTPException(
                status_code=401,
                detail="Usuario inactivo o inexistente",
            )
        if payload.get("role") != user["role"]:
            raise HTTPException(
                status_code=401,
                detail="El rol del usuario ha cambiado",
            )
        return user
    return validate_user


def require_role(repository, *allowed_roles):
    """Permite acceder solamente a los roles autorizados."""
    get_current_user = require_user(repository)
    def validate_role(user=Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="No tienes permisos para esta operación",
            )
        return user
    return validate_role