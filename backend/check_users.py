import sqlite3
conn = sqlite3.connect('nutrition.db')
conn.row_factory = sqlite3.Row
rows = conn.execute('SELECT id, username, tdee FROM users LIMIT 5').fetchall()
if rows:
    for r in rows:
        print(dict(r))
else:
    print("NO USERS FOUND - need to create user id=1")
conn.close()
