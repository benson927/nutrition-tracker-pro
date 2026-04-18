import httpx
import json

BASE_URL = "http://127.0.0.1:8000"

def test_auth_flow():
    print("--- 測試開始 ---")
    
    if resp1.status_code == 200:
        print(f"[OK] Registration success! Response: {resp1.json()}")
    elif resp1.status_code == 400 and "Email already registered" in resp1.text:
        print(f"[WARN] Account already exists, skipping registration.")
    else:
        print(f"[FAIL] Registration failed! Status: {resp1.status_code}, {resp1.text}")
        return

    # 2. 登入取得 JWT
    print("\n2. [Login & Get JWT]")
    login_data = {
        "email": "test@example.com",
        "password": "securepassword123"
    }
    resp2 = httpx.post(f"{BASE_URL}/api/auth/login", json=login_data)
    if resp2.status_code == 200:
        token_data = resp2.json()
        access_token = token_data.get("access_token")
        print(f"[OK] Login success! JWT (Length: {len(access_token)} chars)")
    else:
        print(f"[FAIL] Login failed! Status: {resp2.status_code}, {resp2.text}")
        return
        
    # 3. 測試授權端點 (讀取個資)
    print("\n3. [Read /api/users/me with JWT]")
    headers = {"Authorization": f"Bearer {access_token}"}
    resp3 = httpx.get(f"{BASE_URL}/api/users/me", headers=headers)
    if resp3.status_code == 200:
        me_data = resp3.json()
        print(f"[OK] Read success! Welcome, {me_data['username']} (TDEE: {me_data['tdee']:.2f})")
    else:
        print(f"[FAIL] Read failed! Status: {resp3.status_code}, {resp3.text}")
        
    # 4. 測試無權限存取 (預期被擋下)
    print("\n4. [Test Unauthenticated Access - Expect Block]")
    post_data = {"content": "This is a test post"}
    resp4 = httpx.post(f"{BASE_URL}/api/posts", json=post_data) # no headers
    if resp4.status_code == 401:
        print(f"[OK] Successfully blocked! Returned 401 Unauthorized.")
    else:
        print(f"[FAIL] Block failed, how did it pass? Status: {resp4.status_code}, {resp4.text}")
        
    print("\n--- 測試結束 ---")

if __name__ == "__main__":
    test_auth_flow()
