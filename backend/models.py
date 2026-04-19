from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# ── 認證模型 ──────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

# ── 使用者模型 ────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    height_cm: float
    weight_kg: float
    age: int
    gender: str
    activity_level: float

class UserUpdate(BaseModel):
    username: str
    height_cm: float
    weight_kg: float
    age: int
    gender: str
    activity_level: float

class QuickUserCreate(BaseModel):
    username: str
    height_cm: float
    weight_kg: float
    age: int
    gender: str
    activity_level: float

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    height_cm: float
    weight_kg: float
    age: int
    gender: str
    activity_level: float
    tdee: float

class UserWithToken(UserResponse):
    access_token: str
    token_type: str = "bearer"

# ── 食物與攝取模型 ────────────────────────────────────

class FoodCreate(BaseModel):
    name: str
    calories: float
    protein: float
    carbs: float
    fat: float
    unit_g: Optional[int] = 100

class FoodResponse(BaseModel):
    id: int
    name: str
    calories: float
    protein: float
    carbs: float
    fat: float
    unit_g: int

class DietLogCreate(BaseModel):
    food_item_id: int
    amount_g: float
    meal_type: str = "早餐"

class RecommendationResponse(BaseModel):
    remainingCalories: float
    message: str
    recommendations: List[FoodResponse]

class ChartPoint(BaseModel):
    mealType: str       # e.g. "早餐", "午餐"
    cumulativeCalories: float
    foodNames: str      # 合併後的食物名稱清單
    addedCalories: float # 該餐別新增的總熱量

# ── 論壇模型 ─────────────────────────────────────────

class CommentResponse(BaseModel):
    id: int
    username: str
    content: str
    created_at: str

class PostResponse(BaseModel):
    id: int
    username: str
    content: str
    created_at: str
    comments: List[CommentResponse]

class PostCreate(BaseModel):
    content: str

class CommentCreate(BaseModel):
    content: str

class FeedbackCreate(BaseModel):
    name: Optional[str] = "Anonymous"
    content: str
    message_field_v2: Optional[str] = None # Honeypot field
