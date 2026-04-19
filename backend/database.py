import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# 優先載入環境變數
load_dotenv()

DB_PATH = os.path.join(os.path.dirname(__file__), 'nutrition.db')

def clean_db_url(url: str):
    if not url:
        return None
    url = url.strip()
    # 修正常見的開頭問題
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url

class WrappedConnection:
    def __init__(self, conn):
        self.conn = conn
        self.is_postgres = not isinstance(conn, sqlite3.Connection)

    def execute(self, query, params=None):
        from database import normalize_query # 延遲導入避免循環
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

def normalize_query(query: str, is_postgres: bool):
    if is_postgres:
        query = query.replace('?', '%s')
        query = query.replace("DATE('now', 'localtime')", "CURRENT_DATE")
        query = query.replace("DATE('now')", "CURRENT_DATE")
        if 'GROUP_CONCAT' in query:
             query = query.replace('GROUP_CONCAT', 'STRING_AGG').replace(' food_names', " food_names || ''")
    return query

def init_db():
    raw_url = os.getenv("DATABASE_URL")
    url = clean_db_url(raw_url)
    print(f"DEBUG: Initializing database. Cloud Mode: {url is not None}")
    
    try:
        if url:
            conn_str = url
            if 'sslmode' not in conn_str and 'localhost' not in conn_str:
                separator = '&' if '?' in conn_str else '?'
                conn_str += f"{separator}sslmode=require"
            print(f"DEBUG: Attempting connection to Postgres...")
            raw_conn = psycopg2.connect(conn_str)
        else:
            print(f"DEBUG: Using local SQLite...")
            raw_conn = sqlite3.connect(DB_PATH)
            
        is_postgres = url is not None
        
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
        print("DEBUG: Database initialization complete.")
    except Exception as e:
        print(f"CRITICAL ERROR IN init_db: {str(e)}")
        raise e

def get_db():
    raw_url = os.getenv("DATABASE_URL")
    url = clean_db_url(raw_url)
    try:
        if url:
            conn_str = url
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
        print(f"CRITICAL: Database get_db error: {str(e)}")
        raise e
