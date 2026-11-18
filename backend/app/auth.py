"""Autenticación de usuarios de Luz & Memoria."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import IntegrityError

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.domain.schemas import (
    TokenResponse,
    UserLoginInput,
    UserRegisterInput,
    UserResponse,
)


def create_auth_router(repository):
    router = APIRouter(prefix="/api/auth", tags=["Autenticación"])
    bearer = HTTPBearer(auto_error=False)

    def current_user(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    ):
        if credentials is None:
            raise HTTPException(
                status_code=401,
                detail="Debes iniciar sesión",
            )

        try:
            payload = decode_access_token(credentials.credentials)
            user_id = int(payload["sub"])
        except (ValueError, KeyError, TypeError, Exception):
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

    @router.post(
        "/register",
        response_model=UserResponse,
        status_code=201,
    )
    def register(body: UserRegisterInput):
        if repository.get_by_email(body.email):
            raise HTTPException(
                status_code=409,
                detail="El correo ya está registrado",
            )

        try:
            return repository.register_client(
                body,
                hash_password(body.password),
            )
        except IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="El correo ya está registrado como cliente o usuario",
            )

    @router.post("/login", response_model=TokenResponse)
    def login(body: UserLoginInput):
        user = repository.get_by_email(body.email)

        if (
            not user
            or not user["is_active"]
            or not verify_password(
                body.password,
                user["password_hash"],
            )
        ):
            raise HTTPException(
                status_code=401,
                detail="Correo o contraseña incorrectos",
            )

        token = create_access_token(
            user["id"],
            user["role"],
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user,
        }

    @router.get("/me", response_model=UserResponse)
    def me(user=Depends(current_user)):
        return user

    return router
