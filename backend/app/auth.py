from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import os
import secrets

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


security = HTTPBearer()
SECRET = os.getenv("ONBOARDIQ_SECRET", "dev-secret-change-me")
DEMO_USERS = {
    "admin@onboardiq.io": {
        "name": "Radhika Sharma",
        "role": "Product Strategy Lead",
        "password_hash": hashlib.sha256("OnboardIQ@2026".encode()).hexdigest(),
    },
    "demo@onboardiq.io": {
        "name": "Demo Executive",
        "role": "Business Executive",
        "password_hash": hashlib.sha256("demo123".encode()).hexdigest(),
    },
}


def _sign(payload: str) -> str:
    return hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_token(email: str) -> str:
    expires = int((datetime.now(timezone.utc) + timedelta(hours=10)).timestamp())
    nonce = secrets.token_hex(8)
    payload = f"{email}|{expires}|{nonce}"
    return f"{payload}|{_sign(payload)}"


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        email, expires, nonce, signature = token.split("|")
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    payload = f"{email}|{expires}|{nonce}"
    if not hmac.compare_digest(_sign(payload), signature):
        raise HTTPException(status_code=401, detail="Invalid token")
    if int(expires) < int(datetime.now(timezone.utc).timestamp()):
        raise HTTPException(status_code=401, detail="Session expired")
    user = DEMO_USERS.get(email)
    if not user:
        raise HTTPException(status_code=401, detail="Unknown user")
    return {"email": email, "name": user["name"], "role": user["role"]}


def authenticate(email: str, password: str) -> dict | None:
    user = DEMO_USERS.get(email)
    if not user:
        return None
    if hashlib.sha256(password.encode()).hexdigest() != user["password_hash"]:
        return None
    return {"email": email, "name": user["name"], "role": user["role"]}
