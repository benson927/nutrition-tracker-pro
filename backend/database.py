import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'nutrition.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. 使用者表（加入帳密與電子郵件）
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        height_cm FLOAT NOT NULL CHECK (height_cm > 0),
        weight_kg FLOAT NOT NULL CHECK (weight_kg > 0),
        age INTEGER NOT NULL CHECK (age > 0),
        gender VARCHAR(10) NOT NULL,
        activity_level FLOAT NOT NULL,
        tdee FLOAT NOT NULL CHECK (tdee > 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # 確保舊版資料庫也能加上 email 欄位 (簡單遷移)
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN email VARCHAR(100)")
        cursor.execute("ALTER TABLE users ADD COLUMN hashed_password TEXT")
    except sqlite3.OperationalError:
        pass # Columns already exist

    # 2. 食物資料表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS food_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        calories FLOAT NOT NULL CHECK (calories >= 0),
        protein FLOAT NOT NULL CHECK (protein >= 0),
        carbs FLOAT NOT NULL CHECK (carbs >= 0),
        fat FLOAT NOT NULL CHECK (fat >= 0),
        unit_g INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # 3. 飲食紀錄表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS diet_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        food_item_id INTEGER NOT NULL,
        record_date DATE NOT NULL DEFAULT CURRENT_DATE,
        amount_g FLOAT NOT NULL CHECK (amount_g > 0),
        total_calories FLOAT NOT NULL CHECK (total_calories >= 0),
        total_protein FLOAT NOT NULL CHECK (total_protein >= 0),
        total_carbs FLOAT NOT NULL CHECK (total_carbs >= 0),
        total_fat FLOAT NOT NULL CHECK (total_fat >= 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE
    )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_diet_logs_user_id ON diet_logs(user_id)')

    # 4. 論壇文章表（加入 author_name 以凍結發文者名稱）
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        author_name VARCHAR(50),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')

    # 5. 文章留言表（加入 author_name 以凍結留言者名稱）
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        author_name VARCHAR(50),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')

    # 簡單遷移：若欄位不存在則新增，並同步當前使用者名稱
    try:
        cursor.execute("ALTER TABLE posts ADD COLUMN author_name VARCHAR(50)")
        cursor.execute("UPDATE posts SET author_name = (SELECT username FROM users WHERE users.id = posts.user_id)")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE comments ADD COLUMN author_name VARCHAR(50)")
        cursor.execute("UPDATE comments SET author_name = (SELECT username FROM users WHERE users.id = comments.user_id)")
    except sqlite3.OperationalError:
        pass

    # 6. 意見箱表 (Feedback)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized.")
