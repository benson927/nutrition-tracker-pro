"""建立預設使用者 (id=1)，供無 auth 模式使用"""
import sqlite3
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from database import DB_PATH, init_db
from auth import get_password_hash

init_db()

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

existing = conn.execute("SELECT id FROM users WHERE id = 1").fetchone()
if existing:
    print(f"User id=1 already exists, skipping.")
else:
    hashed = get_password_hash("defaultpassword")
    # BMR male: 10*70 + 6.25*175 - 5*25 + 5 = 1698.75, TDEE x1.55 = 2633
    conn.execute("""
        INSERT INTO users (username, email, hashed_password, height_cm, weight_kg, age, gender, activity_level, tdee)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, ("default_user", "default@example.com", hashed, 175.0, 70.0, 25, "male", 1.55, 2633.0))
    conn.commit()
    print("Default user created: id=1, username=default_user, TDEE=2633 kcal")

conn.close()
