# auth.py
import os
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# ── Setup ─────────────────────────────────────────────────────────────────
SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SECRET_KEY           = os.getenv("SECRET_KEY", "fallback-secret")
ALGORITHM            = "HS256"
TOKEN_EXPIRE_HOURS   = 24 * 7  # 1 week

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
bearer_scheme = HTTPBearer()


# ── Password Utils ────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT Utils ─────────────────────────────────────────────────────────────
def create_token(user_id: str, email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": expire},
        SECRET_KEY, algorithm=ALGORITHM
    )

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(401, "Token is invalid or has expired")


# ── Auth Dependency — for protected routes ───────────────────────────
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    return decode_token(credentials.credentials)


# ── Register ──────────────────────────────────────────────────────────────
def register_user(email: str, password: str, name: str) -> dict:
    existing = supabase.table("users").select("id").eq("email", email).execute()
    if existing.data:
        raise HTTPException(400, "Email is already registered")

    hashed = hash_password(password)
    result = supabase.table("users").insert({
        "email": email,
        "name": name,
        "password_hash": hashed,
    }).execute()

    user = result.data[0]
    token = create_token(user["id"], email)
    return {"user": {"id": user["id"], "email": email, "name": name}, "token": token}


# ── Login ─────────────────────────────────────────────────────────────────
def login_user(email: str, password: str) -> dict:
    result = supabase.table("users").select("*").eq("email", email).execute()
    if not result.data:
        raise HTTPException(401, "Email or password is incorrect")

    user = result.data[0]
    if not verify_password(password, user["password_hash"]):
        raise HTTPException(401, "Email or password is incorrect")

    token = create_token(user["id"], email)
    return {"user": {"id": user["id"], "email": email, "name": user["name"]}, "token": token}


# ── Change Password ───────────────────────────────────────────────────────
def change_password(user_id: str, old_password: str, new_password: str) -> dict:
    result = supabase.table("users").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(404, "User not found")

    user = result.data[0]
    if not verify_password(old_password, user["password_hash"]):
        raise HTTPException(400, "Old password is incorrect")

    hashed = hash_password(new_password)
    supabase.table("users").update({"password_hash": hashed}).eq("id", user_id).execute()

    return {"success": True, "message": "Password updated successfully ✅"}