import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

# 優先載入環境變數
load_dotenv()

# ── 安全性設定 ──────────────────────────────────────────
# 從環境變數讀取金鑰，如果沒設定則給予警告（生產環境務必設定）
SECRET_KEY = os.getenv("SECRET_KEY", "DEVELOPMENT_INSECURE_KEY_REPLACE_ME")
if SECRET_KEY == "DEVELOPMENT_INSECURE_KEY_REPLACE_ME":
    print("WARNING: SECRET_KEY not set in environment! JWT sessions are insecure.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 小時

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
