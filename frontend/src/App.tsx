import React, { useState, useEffect, useCallback } from 'react';
import CalorieChart, { ChartDataPoint } from './CalorieChart';
import Forum from './Forum';
import Swal from 'sweetalert2';
import Welcome from './components/Welcome';

// ── TypeScript 介面定義 ────────────────────────────────

interface FoodItem {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit_g: number;
}

interface DietRecord {
  id: number;
  name: string;
  amount_g: number;
  total_calories: number;
  total_protein: number;
}

interface RecommendationResponse {
  remainingCalories: number;
  message: string;
  recommendations: FoodItem[];
}

interface ChartApiResponse {
  status: string;
  data: ChartDataPoint[];
}

interface UserProfile {
  height_cm: number;
  weight_kg: number;
  age: number;
  gender: 'male' | 'female';
  activity_level: number;
  tdee?: number;
  username: string;
}

// ── 設定 ─────────────────────────────────────────────

const API_BASE = 'http://127.0.0.1:8000/api';

// ── API 函式 ────────────────────────────────────────

async function fetchChartData(userId: number): Promise<ChartDataPoint[]> {
  const res = await fetch(`${API_BASE}/chart_data?user_id=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch chart data');
  const json: ChartApiResponse = await res.json();
  return json.data ?? [];
}

async function fetchFoods(): Promise<FoodItem[]> {
  const res = await fetch(`${API_BASE}/foods`);
  if (!res.ok) throw new Error('Failed to fetch foods');
  return res.json();
}

async function fetchRecords(userId: number): Promise<DietRecord[]> {
  const res = await fetch(`${API_BASE}/records?user_id=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch records');
  return res.json();
}

async function fetchRecommendations(userId: number): Promise<RecommendationResponse> {
  const res = await fetch(`${API_BASE}/recommendations?user_id=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch recommendations');
  return res.json();
}

async function postRecord(userId: number, foodItemId: number, amountG: number, mealType: string = "早餐"): Promise<void> {
  const res = await fetch(`${API_BASE}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, food_item_id: foodItemId, amount_g: amountG, meal_type: mealType }),
  });
  if (!res.ok) throw new Error('Failed to add record');
}

async function postCustomFood(userId: number, name: string, calories: number, mealType: string = "早餐"): Promise<void> {
  const res = await fetch(`${API_BASE}/foods`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, calories, protein: 0, carbs: 0, fat: 0, unit_g: 100 }),
  });
  if (!res.ok) throw new Error('Failed to create food');
  const newFood = await res.json();
  await postRecord(userId, newFood.id, 100, mealType);
}

async function fetchUser(userId: number): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/users/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

async function updateUser(userId: number, profile: UserProfile): Promise<{ new_tdee: number }> {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error('Failed to update user');
  return res.json();
}

async function deleteRecord(recordId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/records/${recordId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete record');
}

async function clearRecords(userId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/records?user_id=${userId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear records');
}

// ── 主元件 ───────────────────────────────────────────

function App() {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [records, setRecords] = useState<DietRecord[]>([]);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const [selectedFoodId, setSelectedFoodId] = useState<string>('');
  const [amountG, setAmountG] = useState<string>('');
  const [customFoodName, setCustomFoodName] = useState<string>('');
  const [customCalories, setCustomCalories] = useState<string>('');

  const [isEntered, setIsEntered] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'forum' | 'profile'>('profile');
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string>('');
  const [activeRecordTab, setActiveRecordTab] = useState<'db' | 'quick'>('db');
  const [selectedMealType, setSelectedMealType] = useState<string>('早餐');
  const [profileName, setProfileName] = useState<string>('');

  const [profileForm, setProfileForm] = useState<UserProfile>({
    height_cm: 0, weight_kg: 0, age: 0, gender: 'male', activity_level: 1.2, username: ''
  });

  const [profileHeight, setProfileHeight] = useState<string>('');
  const [profileWeight, setProfileWeight] = useState<string>('');
  const [profileAge, setProfileAge] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // 3D 圖鑑資料已移除以優化效能

  const loadDashboard = useCallback(async (uid: number) => {
    setIsLoading(true);
    try {
      const [foodsData, recordsData, recData, chartRaw, userData] = await Promise.all([
        fetchFoods(), fetchRecords(uid), fetchRecommendations(uid), fetchChartData(uid), fetchUser(uid)
      ]);
      setFoods(foodsData);
      setRecords(recordsData);
      setRecommendation(recData);
      setChartData(chartRaw);
      
      // 只有在已經正式完成並儲存過 (hasOnboarded) 的情況下，才從後端同步個人資料 fields 到輸入框
      // 如果還在 Onboarding 階段，則保持輸入框空白
      if (hasOnboarded) {
        setProfileForm(userData); 
        setProfileName(userData.username);
        setProfileHeight(userData.height_cm.toString()); 
        setProfileWeight(userData.weight_kg.toString()); 
        setProfileAge(userData.age.toString());
      }
      
      if (foodsData.length > 0) setSelectedFoodId(prev => prev || foodsData[0].id.toString());
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [hasOnboarded]); // Re-add hasOnboarded here to ensure sync when flag flips

  // 初始掛載：取得用戶 ID
  useEffect(() => {
    const uidFromUrl = new URLSearchParams(window.location.search).get('user_id');
    const uid = uidFromUrl ? parseInt(uidFromUrl) : 1;
    setCurrentUserId(uid);
  }, []);

  // 反應式資料讀取：當用戶 ID 或 refreshTrigger 變更時觸發
  useEffect(() => {
    if (!currentUserId || !isEntered) return;
    
    // 如果是新進入系統（尚未完成當次 Onboarding），強制留在 Profile
    if (!hasOnboarded) {
      setActiveTab('profile');
      setIsLoading(false);
    } else {
      loadDashboard(currentUserId);
    }
  }, [currentUserId, isEntered, refreshTrigger, loadDashboard, hasOnboarded]);

  // 當切換到 Profile 且尚未完成 onboarding 時，再次確保狀態清空 (Global State Reset)
  useEffect(() => {
    if (activeTab === 'profile' && !hasOnboarded) {
      setProfileName('');
      setProfileAge('');
      setProfileHeight('');
      setProfileWeight('');
      setRecords([]);
      setChartData([]);
    }
  }, [activeTab, hasOnboarded]);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: '確定要登出？',
      text: '您將登出並清空本機暫存資料，確保帳號安全。',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: '是的，登出',
      cancelButtonText: '取消',
      background: '#1a1a1a',
      color: '#fff'
    });

    if (result.isConfirmed) {
      // 1. 清空所有相關 localStorage
      localStorage.clear(); 
      
      // 2. 重置所有關鍵狀態
      setCurrentUserId(null);
      setIsEntered(false);
      setHasOnboarded(false);
      setRecords([]);
      setChartData([]);
      setActiveTab('profile');
      
      Swal.fire({
        title: '已登出',
        text: '您的工作階段已結束。',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#1a1a1a',
        color: '#fff'
      });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!currentUserId) return;

    // 表單驗證
    if (!profileName.trim() || !profileAge || !profileHeight || !profileWeight) {
      Swal.fire({
        title: '⚠️ 系統提示',
        text: '請完整填寫所有基本資料，才能開啟健康旅程喔！',
        icon: 'warning',
        background: '#0a0a0a',
        color: '#fff',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: '我知道了'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (!hasOnboarded) {
        await clearRecords(currentUserId);
      }
      
      const updatedProfile = { 
        ...profileForm, username: profileName, 
        height_cm: parseFloat(profileHeight), weight_kg: parseFloat(profileWeight), age: parseInt(profileAge) 
      };
      await updateUser(currentUserId, updatedProfile);
      
      // 更新成功：持久化引導完成狀態
      setHasOnboarded(true); 
      localStorage.setItem(`onboarded_${currentUserId}`, 'true');
      
      // 成功提示與導向
      await Swal.fire({
        title: '🎉 設定成功！',
        text: '您的專屬健康數據已初始化，現在可以開始記錄您的飲食了。',
        icon: 'success',
        background: '#0a0a0a',
        color: '#fff',
        confirmButtonColor: '#10b981',
        confirmButtonText: '🚀 開始探索'
      });

      setActiveTab('dashboard'); 
      setRefreshTrigger(prev => prev + 1); // 觸發反應式讀取
    } catch (err) { 
      showNotification('❌ 更新失敗'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault(); if (!currentUserId || !selectedFoodId || !amountG) return; setIsSubmitting(true);
    try {
      await postRecord(currentUserId, parseInt(selectedFoodId), parseFloat(amountG), selectedMealType);
      showNotification('🥗 紀錄成功'); setAmountG(''); loadDashboard(currentUserId);
    } catch (err) { showNotification('❌ 新增失敗'); }
    finally { setIsSubmitting(false); }
  };

  const handleAddCustomRecord = async (e: React.FormEvent) => {
    e.preventDefault(); if (!currentUserId || !customFoodName || !customCalories) return; setIsSubmitting(true);
    try {
      await postCustomFood(currentUserId, customFoodName, parseFloat(customCalories), selectedMealType);
      showNotification('⚡ 快速紀錄成功'); setCustomFoodName(''); setCustomCalories(''); loadDashboard(currentUserId);
    } catch (err) { showNotification('❌ 新增失敗'); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!currentUserId) return;
    const result = await Swal.fire({
      title: '確定要刪除嗎？', text: '圖表將即時重算！', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#3f3f46',
      confirmButtonText: '🗑️ 確定', cancelButtonText: '取消', background: '#0a0a0a', color: '#fff'
    });
    if (result.isConfirmed) {
      try {
        await deleteRecord(recordId);
        Swal.fire({ title: '已刪除', icon: 'success', timer: 1000, showConfirmButton: false, background: '#0a0a0a', color: '#fff' });
        loadDashboard(currentUserId);
      } catch (err) { showNotification('❌ 刪除失敗'); }
    }
  };

  const handleClearRecords = async () => {
    if (!currentUserId || !window.confirm('確定要清空今日所有紀錄嗎？')) return;
    setIsSubmitting(true);
    try { await clearRecords(currentUserId); showNotification('🧹 已清空今日資料'); loadDashboard(currentUserId); }
    catch (err) { showNotification('❌ 清除失敗'); }
    finally { setIsSubmitting(false); }
  };

  const showNotification = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(''), 2500); };

  if (isLoading) return <div className="loading" style={{ color: 'white' }}>載入中...</div>;
  if (!isEntered) return <Welcome onEnter={() => { 
    setIsEntered(true); 
    const uidFromUrl = new URLSearchParams(window.location.search).get('user_id');
    const uid = uidFromUrl ? parseInt(uidFromUrl) : 1;
    setCurrentUserId(uid);
    
    // 每次點點擊進入系統，強制從 Profile 開始，並確保狀態清空 (Onboarding 鎖定)
    setHasOnboarded(false); 
    setActiveTab('profile');
    setProfileName('');
    setProfileAge('');
    setProfileHeight('');
    setProfileWeight('');
    
    setRefreshTrigger(prev => prev + 1);
  }} />;

  const consumedCal = records.reduce((acc, r) => acc + r.total_calories, 0);
  const remainingCal = (recommendation?.remainingCalories ?? 0);

  return (
    <div className="container" style={{ padding: '0 1rem' }}>
      {notification && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 1000, color: 'white',
          background: 'rgba(59, 130, 246, 0.9)', padding: '1rem 2rem', borderRadius: '12px'
        }}>
          {notification}
        </div>
      )}

      <header className="header">
        <h1>Nutrition Tracker Pro</h1>
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''} ${!hasOnboarded ? 'disabled' : ''}`} 
            onClick={() => hasOnboarded && setActiveTab('dashboard')}
            title={!hasOnboarded ? "請先完成個人設定" : ""}
          >
            🎯 今日進度
          </button>
          <button 
            className={`nav-tab ${activeTab === 'forum' ? 'active' : ''} ${!hasOnboarded ? 'disabled' : ''}`} 
            onClick={() => hasOnboarded && setActiveTab('forum')}
            title={!hasOnboarded ? "請先完成個人設定" : ""}
          >
            💬 Forum
          </button>
          <button className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>👤 Profile</button>
          
          <button 
            className="nav-tab ml-4 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all duration-300"
            onClick={handleLogout}
            title="登出系統"
          >
            🚪 登出
          </button>
        </div>
      </header>

      <main style={{ 
        display: 'grid', 
        gridTemplateColumns: activeTab === 'dashboard' ? '65fr 35fr' : '1fr', 
        gap: '2.5rem',
        alignItems: 'start'
      }}>
        {activeTab === 'profile' ? (
          <div className="glass-panel fade-in" style={{ maxWidth: '650px', margin: '0 auto', textAlign: 'left' }}>
            <div className="onboarding-guide">
              <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: '#fff' }}>👋 歡迎！</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', lineHeight: 1.5 }}>
                請先完成個人設定。設定完成後，舊有的數據將會被清空，並為您開啟全新的健康追蹤旅程。
              </p>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="mt-6">
              {/* 3x2 Symmetrical Grid Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Row 1: Name & Age */}
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-400 mb-2 ml-1">顯示名字</label>
                  <input 
                    type="text" 
                    value={profileName} 
                    onChange={(e) => setProfileName(e.target.value)} 
                    placeholder="例如：王小明" 
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-400 mb-2 ml-1">年齡</label>
                  <input 
                    type="number" 
                    value={profileAge} 
                    onChange={e => setProfileAge(e.target.value)} 
                    placeholder="例如：25" 
                    className="w-full"
                  />
                </div>

                {/* Row 2: Height & Weight */}
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-400 mb-2 ml-1">身高 (cm)</label>
                  <input 
                    type="number" 
                    value={profileHeight} 
                    onChange={e => setProfileHeight(e.target.value)} 
                    placeholder="例如：175" 
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-400 mb-2 ml-1">體重 (kg)</label>
                  <input 
                    type="number" 
                    value={profileWeight} 
                    onChange={e => setProfileWeight(e.target.value)} 
                    placeholder="例如：70" 
                    className="w-full"
                  />
                </div>

                {/* Row 3: Gender & Activity Level */}
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-400 mb-2 ml-1">性別</label>
                  <select 
                    value={profileForm.gender} 
                    onChange={e => setProfileForm({...profileForm, gender: e.target.value as any})}
                    className="w-full"
                  >
                    <option value="male">男性 (Male)</option>
                    <option value="female">女性 (Female)</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-400 mb-2 ml-1">活動量等級</label>
                  <select 
                    value={profileForm.activity_level} 
                    onChange={e => setProfileForm({...profileForm, activity_level: parseFloat(e.target.value)})}
                    className="w-full text-sm"
                  >
                    <option value="1.2">久坐 (幾乎不運動)</option>
                    <option value="1.375">輕量 (每週運動 1-3 天)</option>
                    <option value="1.55">中度 (每週運動 3-5 天)</option>
                    <option value="1.725">高度 (每週運動 6-7 天)</option>
                    <option value="1.9">極高 (勞力工作或運動員)</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary w-full mt-10 py-4 text-lg font-bold shadow-2xl hover-glow transform active:scale-[0.98] transition-all"
              >
                {hasOnboarded ? '儲存變更' : '儲存並開始追蹤'}
              </button>
            </form>
          </div>
        ) : activeTab === 'dashboard' ? (
          <>
            <div className="left-column">
              <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <h2>📈 今日熱量總覽</h2>
                <div className={`stat-box ${remainingCal < 0 ? 'danger' : ''}`}>
                  <p>{remainingCal < 0 ? '⚠️ 超標熱量' : '剩餘熱量'}</p>
                  <h3>{Math.abs(remainingCal).toFixed(0)}</h3>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <div className="stat-box" style={{ flex: 1 }}><h3>{consumedCal.toFixed(0)}</h3><p>已攝取</p></div>
                  <div className="stat-box" style={{ flex: 1 }}><h3>{((recommendation?.remainingCalories ?? 0) + consumedCal).toFixed(0)}</h3><p>目標</p></div>
                </div>
              </div>
              <div className="glass-panel" style={{ height: '500px' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>⚡ 即時熱量曲線</h2>
                <CalorieChart data={chartData} dailyTarget={(recommendation?.remainingCalories ?? 0) + consumedCal || undefined} />
              </div>
              <div className="glass-panel" style={{ marginTop: '2rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>📝 今日紀錄回顧</h2>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {records.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>尚未有今日紀錄</p>
                  ) : (
                    records.map(r => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.95rem' }}>
                        <div>
                          <span style={{ fontWeight: '600' }}>{r.name}</span>
                          <span style={{ marginLeft: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({r.amount_g}g)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: 'var(--accent-success)', fontWeight: 'bold' }}>+{r.total_calories.toFixed(0)} kcal</span>
                          <button 
                            onClick={() => handleDeleteRecord(r.id)} 
                            style={{ 
                              padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
                              border: '1px solid rgba(239, 68, 68, 0.2)', width: 'auto', margin: 0, borderRadius: '6px'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="right-column" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-panel">
                <div className="nav-tabs" style={{ marginBottom: '1.5rem' }}>
                  <button className={`nav-tab ${activeRecordTab === 'db' ? 'active' : ''}`} onClick={() => setActiveRecordTab('db')}>🥗 挑選食材</button>
                  <button className={`nav-tab ${activeRecordTab === 'quick' ? 'active' : ''}`} onClick={() => setActiveRecordTab('quick')}>⚡ 快速估算</button>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>用餐時間</label>
                  <select 
                    value={selectedMealType} 
                    onChange={e => setSelectedMealType(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}
                  >
                    <option value="早餐">早餐 🌅</option>
                    <option value="午餐">午餐 ☀️</option>
                    <option value="下午茶">下午茶 ☕</option>
                    <option value="晚餐">晚餐 🌙</option>
                    <option value="宵夜">宵夜 🌌</option>
                  </select>
                </div>

                {activeRecordTab === 'db' ? (
                  <form onSubmit={handleAddRecord}>
                    <div style={{ marginBottom: '0.8rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>食材名稱</label>
                      <select value={selectedFoodId} onChange={e => setSelectedFoodId(e.target.value)}>
                        {foods.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: '0.8rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>份量 (克)</label>
                      <input type="number" value={amountG} onChange={e => setAmountG(e.target.value)} placeholder="例如: 150" />
                    </div>
                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                      {isSubmitting ? '紀錄中...' : '➕ 加入今日記錄'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleAddCustomRecord}>
                    <div style={{ marginBottom: '0.8rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>食物說明</label>
                      <input type="text" value={customFoodName} onChange={e => setCustomFoodName(e.target.value)} placeholder="例如: 自製三明治" />
                    </div>
                    <div style={{ marginBottom: '0.8rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>估計熱量 (kcal)</label>
                      <input type="number" value={customCalories} onChange={e => setCustomCalories(e.target.value)} placeholder="例如: 450" />
                    </div>
                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                      {isSubmitting ? '紀錄中...' : '⚡ 快速紀錄'}
                    </button>
                  </form>
                )}
              </div>

              <div className="glass-panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>💡 智慧推薦</h2>
                {recommendation ? (
                  <div 
                    className="custom-scrollbar" 
                    style={{ 
                      maxHeight: '450px', 
                      overflowY: 'auto', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.8rem',
                      paddingRight: '6px' 
                    }}
                  >
                    {recommendation.recommendations.map(r => (
                      <div key={r.id} className="rec-card" style={{ margin: 0, padding: '1rem', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem' }}>{r.name}</h4>
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-success)', fontWeight: '500' }}>
                          {r.calories} kcal / 100g
                        </span>
                      </div>
                    ))}
                    {recommendation.recommendations.length === 0 && (
                      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                        🎉 已達成今日目標！
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>載入推薦中...</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ width: '100%' }}><Forum userId={currentUserId || 1} /></div>
        )}
      </main>
      <style>{`
        .left-column { grid-column: 1; } 
        .right-column { grid-column: 2; }
        @media (max-width: 1024px) { 
          main { grid-template-columns: 1fr !important; gap: 1.5rem !important; } 
          .left-column, .right-column { grid-column: 1 / -1; } 
        }
      `}</style>
    </div>
  );
}

export default App;
