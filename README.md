# Nutrition Tracker Pro (精準飲食追蹤專家)

Nutrition Tracker Pro 是一款基於現代 Web 技術建構的個人健康管理系統。它結合了實時數據視覺化、智慧飲食建議以及社群討論功能，旨在幫助使用者更精確地管理每日熱量攝取，達成健康目標。

---

## 🚀 主要功能 (Core Features)

### 1. 個人資料引導與 TDEE 自動計算 (User Onboarding)
- **智慧引導頁面**：新使用者進入時會自動引導設定身高、體重、年齡及活動量。
- **自動化熱量目標**：採用 Mifflin-St Jeor 公式，根據個人體位數據自動計算每日建議攝取熱量 (TDEE)。
- **隨時更新**：可在 Profile 分頁隨時修正數據，系統會立即動態更新追蹤目標。

### 2. 即時熱量攝取曲線 (Real-time Calorie Chart)
- **平滑曲線視覺化**：使用 Recharts 繪製當日累積攝取熱量的 monotone 曲線。
- **即時更新**：每次新增飲食紀錄後，圖表會無縫重新載入，無需重新整理頁面。

### 3. 智慧飲食建議 (Smart Recommendations)
- **剩餘熱量計算**：根據使用者的計算出的 TDEE 與已攝取熱量自動計算剩餘額度。
- **動態推薦邏輯**：優先推薦高蛋白、低卡食物，並根據今日剩餘熱量動態調整顯示內容。

### 4. 社群討論論壇 (Community Forum)
- **玻璃擬態 UI**：極具現代感的 Premium 透明磨砂質感介面。
- **互動體驗**：支援發布新貼文與撰寫留言，與社群交流健康進度。

### 5. 一鍵清除數據 (Data Reset)
- **快速重置**：提供「清除今日紀錄」功能，方便測試或修正錯誤紀錄，讓數據管理更靈活。

---

## 🛠 技術棧 (Tech Stack)

- **Frontend**: React (Vite), TypeScript, Recharts (v3), Vanilla CSS (Glass-morphism)
- **Backend**: FastAPI (Python), Uvicorn
- **Database**: SQLite3
- **Dev Tools**: ESLint, Prettier

---

## 📦 快速安裝與啟動 (Quick Start)

### 1. 後端啟動 (Backend)
需安裝 Python 3.8+ 並建立虛擬環境：
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python seed.py            # 初始化資料庫與預設食物
uvicorn main:app --reload
```

### 2. 前端啟動 (Frontend)
需安裝 Node.js (建議 v18+)：
```bash
cd frontend
npm install
npm run dev
```
啟動後請訪問：`http://localhost:5173`

---

## 🔒 開發備註 (Development Notes)
目前系統處於開發模式，已移除 JWT 驗證邏輯並預設使用 `user_id=1` 進行所有操作，以便開發者快速進行測試與功能驗證。

---

## 📄 授權 (License)
MIT License.
