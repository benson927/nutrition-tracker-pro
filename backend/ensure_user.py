import sqlite3
import os

DB_PATH = 'nutrition.db'

def ensure_user_one():
    if not os.path.exists(DB_PATH):
        print("Database not found. Make sure backend is initialized.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if user 1 exists
    cursor.execute("SELECT id FROM users WHERE id = 1")
    if not cursor.fetchone():
        print("Creating default user with ID 1...")
        cursor.execute('''
            INSERT INTO users (id, username, email, hashed_password, height_cm, weight_kg, age, gender, activity_level, tdee)
            VALUES (1, 'Guest', 'guest@example.com', 'nopassword', 175.0, 70.0, 25, 'male', 1.2, 2100.0)
        ''')
        conn.commit()
    else:
        print("User 1 already exists.")
    
    conn.close()

if __name__ == "__main__":
    ensure_user_one()
