from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import httpx
import os
from dotenv import load_dotenv
from typing import List, Optional

from database import get_db, init_db
from models import (
    FoodCreate, FoodResponse,
    RecommendationResponse,
    PostResponse, PostCreate, CommentResponse, CommentCreate,
    UserUpdate, UserResponse, QuickUserCreate, FeedbackCreate
)

app = FastAPI(title="Nutrition Tracker Pro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 啟動時初始化資料庫
@app.on_event("startup")
def startup():
    init_db()
    load_dotenv()

# ── 工具函式 ──────────────────────────────────────────

def calculate_tdee(weight_kg: float, height_cm: float, age: int,
                   gender: str, activity_level: float) -> float:
    if gender == 'male':
        bmr = 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age + 5.0
    else:
        bmr = 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age - 161.0
    return bmr * activity_level

def get_safe_remaining_calories(tdee: float, consumed: float) -> float:
    return max(0.0, tdee - consumed)

def get_user_or_404(user_id: int, db: sqlite3.Connection) -> dict:
    row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return dict(row)

# ── 使用者端點 ────────────────────────────────────────

@app.get("/api/users/{user_id}", response_model=UserResponse)
def get_user_profile(user_id: int, db: sqlite3.Connection = Depends(get_db)):
    return get_user_or_404(user_id, db)

@app.put("/api/users/{user_id}")
def update_user_profile(user_id: int, profile: UserUpdate, db: sqlite3.Connection = Depends(get_db)):
    # 確保使用者存在
    get_user_or_404(user_id, db)

    # 計算新 TDEE
    new_tdee = calculate_tdee(
        weight_kg=profile.weight_kg,
        height_cm=profile.height_cm,
        age=profile.age,
        gender=profile.gender,
        activity_level=profile.activity_level
    )

    db.execute('''
        UPDATE users
        SET username = ?, height_cm = ?, weight_kg = ?, age = ?, gender = ?, activity_level = ?, tdee = ?
        WHERE id = ?
    ''', (profile.username, profile.height_cm, profile.weight_kg, profile.age, profile.gender,
          profile.activity_level, new_tdee, user_id))
    db.commit()

    return {"message": "Profile updated", "new_tdee": new_tdee}

@app.post("/api/users")
def create_quick_user(profile: QuickUserCreate, db: sqlite3.Connection = Depends(get_db)):
    import uuid
    # 直接建立新使用者並計算 TDEE
    tdee = calculate_tdee(
        weight_kg=profile.weight_kg,
        height_cm=profile.height_cm,
        age=profile.age,
        gender=profile.gender,
        activity_level=profile.activity_level
    )
    
    unique_email = f"user_{uuid.uuid4().hex[:8]}@temp.com"
    cursor = db.cursor()
    cursor.execute('''
        INSERT INTO users (username, email, hashed_password, height_cm, weight_kg, age, gender, activity_level, tdee)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (profile.username, unique_email, "nopassword", 
          profile.height_cm, profile.weight_kg, profile.age, profile.gender,
          profile.activity_level, tdee))
    db.commit()
    new_id = cursor.lastrowid
    
    return {"id": new_id, "username": profile.username, "tdee": tdee}

# ── 食物端點 ──────────────────────────────────────────

@app.get("/api/foods", response_model=List[FoodResponse])
def get_foods(db: sqlite3.Connection = Depends(get_db)):
    return [dict(r) for r in db.execute("SELECT * FROM food_items").fetchall()]

@app.post("/api/foods")
def create_food(food: FoodCreate, db: sqlite3.Connection = Depends(get_db)):
    # 檢查是否已存在同名且同熱量的食物
    existing = db.execute(
        "SELECT id FROM food_items WHERE name = ? AND calories = ?", 
        (food.name, food.calories)
    ).fetchone()
    
    if existing:
        return {"id": existing["id"], "message": "Food already exists, returning existing ID"}

    cursor = db.cursor()
    cursor.execute('''
        INSERT INTO food_items (name, calories, protein, carbs, fat, unit_g)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (food.name, food.calories, food.protein, food.carbs, food.fat, food.unit_g))
    db.commit()
    return {"id": cursor.lastrowid, "message": "Food created"}

# ── 飲食紀錄端點 ──────────────────────────────────────

class RecordCreate:
    pass

from pydantic import BaseModel

class DietLogRequest(BaseModel):
    user_id: int
    food_item_id: int
    amount_g: float
    meal_type: str = "早餐"

@app.post("/api/records")
def add_record(record: DietLogRequest, db: sqlite3.Connection = Depends(get_db)):
    food_row = db.execute("SELECT * FROM food_items WHERE id = ?", (record.food_item_id,)).fetchone()
    if not food_row:
        raise HTTPException(status_code=404, detail="Food not found")

    total_calories = (float(food_row["calories"]) / float(food_row["unit_g"])) * record.amount_g
    total_protein = (float(food_row["protein"]) / float(food_row["unit_g"])) * record.amount_g
    total_carbs = (float(food_row["carbs"]) / float(food_row["unit_g"])) * record.amount_g
    total_fat = (float(food_row["fat"]) / float(food_row["unit_g"])) * record.amount_g

    db.execute('''
        INSERT INTO diet_logs (user_id, food_item_id, amount_g, total_calories, total_protein, total_carbs, total_fat, record_date, meal_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, DATE('now', 'localtime'), ?)
    ''', (record.user_id, record.food_item_id, record.amount_g, total_calories, total_protein, total_carbs, total_fat, record.meal_type))
    db.commit()
    return {"message": "Record added"}

@app.get("/api/records")
def get_records(user_id: int = 1, db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute('''
        SELECT d.id, d.amount_g, d.total_calories, d.total_protein, f.name
        FROM diet_logs d
        JOIN food_items f ON d.food_item_id = f.id
        WHERE d.user_id = ? AND d.record_date = DATE('now', 'localtime')
        ORDER BY d.created_at ASC
    ''', (user_id,)).fetchall()
    return [dict(r) for r in rows]

@app.delete("/api/records/{record_id}")
def delete_record(record_id: int, db: sqlite3.Connection = Depends(get_db)):
    db.execute("DELETE FROM diet_logs WHERE id = ?", (record_id,))
    db.commit()
    return {"message": "Record deleted"}

@app.delete("/api/records")
def clear_records(user_id: int = 1, db: sqlite3.Connection = Depends(get_db)):
    db.execute("DELETE FROM diet_logs WHERE user_id = ? AND record_date = DATE('now', 'localtime')", (user_id,))
    db.commit()
    return {"message": "Today's records cleared"}

# ── 圖表端點 (支援下劃線與連字符兩種路徑) ──────────────

@app.get("/api/chart_data")
@app.get("/api/chart-data")
def get_chart_data(user_id: int = 1, db: sqlite3.Connection = Depends(get_db)):
    meal_order = ["早餐", "午餐", "下午茶", "晚餐", "宵夜"]
    
    # 撈取今日所有的紀錄，並按餐別分組
    rows = db.execute('''
        SELECT meal_type, SUM(total_calories) as added_calories, GROUP_CONCAT(f.name) as food_names
        FROM diet_logs d
        JOIN food_items f ON d.food_item_id = f.id
        WHERE d.user_id = ? AND d.record_date = DATE('now', 'localtime')
        GROUP BY meal_type
    ''', (user_id,)).fetchall()

    # 轉為 dict 方便查詢
    meal_data = {row["meal_type"]: row for row in rows}
    
    result = []
    cumulative = 0.0
    
    for meal in meal_order:
        row = meal_data.get(meal)
        added = float(row["added_calories"]) if row else 0.0
        names = row["food_names"] if row else ""
        cumulative += added
        
        result.append({
            "mealType": meal,
            "cumulativeCalories": round(cumulative, 1),
            "foodNames": names,
            "addedCalories": round(added, 1)
        })

    return {"status": "success", "data": result}

# ── 推薦端點 ──────────────────────────────────────────

@app.get("/api/recommendations", response_model=RecommendationResponse)
def get_recommendations(user_id: int = 1, db: sqlite3.Connection = Depends(get_db)):
    user = get_user_or_404(user_id, db)
    tdee_budget = float(user["tdee"])
    weight_kg = float(user["weight_kg"])
    daily_protein_target = weight_kg * 1.5

    record_row = db.execute("""
        SELECT COALESCE(SUM(total_calories), 0) AS consumed_cal,
               COALESCE(SUM(total_protein), 0)  AS consumed_protein
        FROM diet_logs WHERE user_id = ? AND record_date = DATE('now', 'localtime')
    """, (user_id,)).fetchone()

    consumed_cal = float(record_row["consumed_cal"])
    consumed_protein = float(record_row["consumed_protein"])
    remaining_cal = get_safe_remaining_calories(tdee_budget, consumed_cal)

    if remaining_cal == 0.0:
        return RecommendationResponse(remainingCalories=0.0, message="今日熱量預算已達標，建議停止攝取高熱量食物。", recommendations=[])

    if consumed_protein < daily_protein_target:
        query = "SELECT * FROM food_items WHERE calories <= ? ORDER BY protein DESC LIMIT 10"
        msg = "基於熱量餘額與蛋白質缺口，推薦以下高蛋白食物"
    else:
        query = "SELECT * FROM food_items WHERE calories <= ? ORDER BY calories ASC LIMIT 10"
        msg = "蛋白質已達標，推薦以下低卡食物"

    recs = [dict(r) for r in db.execute(query, (remaining_cal,)).fetchall()]
    return RecommendationResponse(remainingCalories=remaining_cal, message=msg, recommendations=recs)

# ── 論壇端點 ──────────────────────────────────────────

@app.get("/api/posts", response_model=List[PostResponse])
def get_posts(db: sqlite3.Connection = Depends(get_db)):
    # 讀取發文時凍結的 author_name 並別名為 username 以供前端使用
    # 使用 COALESCE 確保即便資料缺失也能回傳預設名稱，避免 Pydantic 驗證失敗
    posts = db.execute('''
        SELECT id, content, created_at, COALESCE(author_name, 'Unknown') AS username
        FROM posts ORDER BY created_at DESC
    ''').fetchall()

    result = []
    for post in posts:
        comments = db.execute('''
            SELECT id, content, created_at, COALESCE(author_name, 'Unknown') AS username
            FROM comments 
            WHERE post_id = ? ORDER BY created_at ASC
        ''', (post["id"],)).fetchall()
        result.append({**dict(post), "comments": [dict(c) for c in comments]})
    return result

@app.post("/api/posts")
def create_post(post: PostCreate, user_id: int = 1, db: sqlite3.Connection = Depends(get_db)):
    # 抓取當前的使用者名稱以進行凍結
    user = db.execute("SELECT username FROM users WHERE id = ?", (user_id,)).fetchone()
    current_username = user["username"] if user else "Unknown"
    
    db.execute("INSERT INTO posts (user_id, author_name, content) VALUES (?, ?, ?)", 
               (user_id, current_username, post.content))
    db.commit()
    return {"message": "Post created"}

@app.post("/api/posts/{post_id}/comments")
def add_comment(post_id: int, comment: CommentCreate, user_id: int = 1, db: sqlite3.Connection = Depends(get_db)):
    # 抓取當前的使用者名稱以進行凍結
    user = db.execute("SELECT username FROM users WHERE id = ?", (user_id,)).fetchone()
    current_username = user["username"] if user else "Unknown"

    db.execute("INSERT INTO comments (post_id, user_id, author_name, content) VALUES (?, ?, ?, ?)", 
               (post_id, user_id, current_username, comment.content))
    db.commit()
    return {"message": "Comment added"}

# ── 意見箱端點 (Feedback) ────────────────────────────────

@app.post("/api/feedback")
async def receive_feedback(feedback: FeedbackCreate, db: sqlite3.Connection = Depends(get_db)):
    # 0. 蜜罐 (Honeypot) 檢查：如果隱藏欄位有值，判定為機器人，直接回傳成功但不處理
    if feedback.message_field_v2:
        print(f"Bot detected: {feedback.name}")
        return {"message": "Feedback received. Thank you!"}

    # 1. 存入資料庫備份
    db.execute("INSERT INTO feedback (name, content) VALUES (?, ?)", 
               (feedback.name or "Anonymous", feedback.content))
    db.commit()

    # 2. 發送到 Discord Webhook (由環境變數讀取)
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
    
    if webhook_url and "http" in webhook_url:
        payload = {
            "embeds": [
                {
                    "title": "🎉 收到新建議！",
                    "description": feedback.content,
                    "color": 0x74b9ff,
                    "fields": [
                        {"name": "來自", "value": feedback.name or "Anonymous", "inline": True}
                    ],
                    "footer": {"text": "Nutrition Tracker Pro - Feedback System"}
                }
            ]
        }
        try:
            async with httpx.AsyncClient() as client:
                await client.post(webhook_url, json=payload)
        except Exception as e:
            print(f"Error sending to Discord: {e}")

    return {"message": "Feedback received. Thank you!"}
