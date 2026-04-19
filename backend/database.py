import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# 在最上方載入環境變數
load_dotenv()

DB_PATH = os.path.join(os.path.dirname(__file__), 'nutrition.db')
DATABASE_URL = os.getenv("DATABASE_URL")

def normalize_query(query: str, is_postgres: bool):
    if is_postgres:
        # 轉換佔位符 ? 為 %s
        query = query.replace('?', '%s')
        # 轉換日期函數
        query = query.replace("DATE('now', 'localtime')", "CURRENT_DATE")
        query = query.replace("DATE('now')", "CURRENT_DATE")
        # 處理 SQLite 的 GROUP_CONCAT -> PostgreSQL 的 STRING_AGG
        if 'GROUP_CONCAT' in query:
             query = query.replace('GROUP_CONCAT', 'STRING_AGG').replace(' food_names', " food_names || ''")
    return query

class WrappedConnection:
    def __init__(self, conn):
        self.conn = conn
        self.is_postgres = not isinstance(conn, sqlite3.Connection)

    def execute(self, query, params=None):
        sql = normalize_query(query, self.is_postgres)
        if self.is_postgres:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(sql, params or ())
            return cursor
        else:
            return self.conn.execute(sql, params or ())

    def commit(self):
        self.conn.commit()

    def close(self):
        try:
            self.conn.close()
        except:
            pass

    def cursor(self):
        if self.is_postgres:
            return self.conn.cursor(cursor_factory=RealDictCursor)
        return self.conn.cursor()

def init_db():
    print(f"Initializing database... (Postgres: {DATABASE_URL is not None})")
    try:
        if DATABASE_URL:
            # 確保連線字串包含必要的參數 (有些環境需要 sslmode)
            conn_str = DATABASE_URL
            if 'sslmode' not in conn_str and 'localhost' not in conn_str:
                separator = '&' if '?' in conn_str else '?'
                conn_str += f"{separator}sslmode=require"
            
            raw_conn = psycopg2.connect(conn_str)
        else:
            raw_conn = sqlite3.connect(DB_PATH)
            
        is_postgres = DATABASE_URL is not None
        
        tables = [
            'CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(50) NOT NULL, email VARCHAR(100) UNIQUE NOT NULL, hashed_password TEXT NOT NULL, height_cm FLOAT NOT NULL, weight_kg FLOAT NOT NULL, age INTEGER NOT NULL, gender VARCHAR(10) NOT NULL, activity_level FLOAT NOT NULL, tdee FLOAT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
            'CREATE TABLE IF NOT EXISTS food_items (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, calories FLOAT NOT NULL, protein FLOAT NOT NULL, carbs FLOAT NOT NULL, fat FLOAT NOT NULL, unit_g INTEGER DEFAULT 100, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
            'CREATE TABLE IF NOT EXISTS diet_logs (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, food_item_id INTEGER NOT NULL, record_date DATE NOT NULL DEFAULT CURRENT_DATE, amount_g FLOAT NOT NULL, total_calories FLOAT NOT NULL, total_protein FLOAT NOT NULL, total_carbs FLOAT NOT NULL, total_fat FLOAT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
            'CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, author_name VARCHAR(50), content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
            'CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, post_id INTEGER NOT NULL, user_id INTEGER NOT NULL, author_name VARCHAR(50), content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
            'CREATE TABLE IF NOT EXISTS feedback (id SERIAL PRIMARY KEY, name VARCHAR(50), content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'
        ]

        cursor = raw_conn.cursor()
        for table_sql in tables:
            sql = table_sql
            if not is_postgres:
                sql = sql.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT')
                sql = sql.replace('CURRENT_DATE', "DATE('now', 'localtime')")
            cursor.execute(sql)
        
        raw_conn.commit()
        raw_conn.close()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"FAILED TO INITIALIZE DATABASE: {e}")
        # 在生產環境中，如果資料庫連不上，我們可能希望崩潰以引起注意
        raise e

def get_db():
    try:
        if DATABASE_URL:
            conn_str = DATABASE_URL
            if 'sslmode' not in conn_str and 'localhost' not in conn_str:
                separator = '&' if '?' in conn_str else '?'
                conn_str += f"{separator}sslmode=require"
            conn = psycopg2.connect(conn_str)
        else:
            conn = sqlite3.connect(DB_PATH, check_same_thread=False)
            conn.row_factory = sqlite3.Row
        
        wrapped = WrappedConnection(conn)
        try:
            yield wrapped
        finally:
            wrapped.close()
    except Exception as e:
        print(f"Database connection error: {e}")
        raise e
