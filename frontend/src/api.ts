const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000/api'
  : 'https://nutrition-tracker-pro-api.onrender.com/api'; // 請替換為您在 Render 部署後的實際網址

// ── 權限管理 ──────────────────────────────────────────

const TOKEN_KEY = 'nutrition_app_token';

export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);
export const isAuthenticated = () => !!getToken();

async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    removeToken();
    window.location.reload(); // 簡單處理：過期就重新登入
  }
  return res;
}

// ── 型別定義 ──────────────────────────────────────────

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  height_cm: number;
  weight_kg: number;
  age: number;
  gender: string;
  activity_level: number;
  tdee: number;
  access_token?: string;
}

export interface FoodResponse {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit_g: number;
}

export interface DietRecord {
  id: number;
  name: string;
  amount_g: number;
  total_calories: number;
  total_protein: number;
}

export interface RecommendationResponse {
  remainingCalories: number;
  message: string;
  recommendations: FoodResponse[];
}

export interface ChartPoint {
  time: string;
  cumulativeCalories: number;
  foodName: string;
  addedCalories: number;
}

export interface CommentResponse {
  id: number;
  username: string;
  content: string;
  created_at: string;
}

export interface PostResponse {
  id: number;
  username: string;
  content: string;
  created_at: string;
  comments: CommentResponse[];
}

// ── API 呼叫函式 ──────────────────────────────────────

export const login = async (email: string, password: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  setToken(data.access_token);
};

export const createUser = async (user: any): Promise<UserResponse> => {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error('User creation failed');
  return res.json();
};

export const register = async (user: any): Promise<void> => {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error('Registration failed');
  const data = await res.json();
  setToken(data.access_token);
};

export const getCurrentUser = async (): Promise<UserResponse> => {
  const res = await authFetch(`${API_BASE}/users/me`);
  if (!res.ok) throw new Error('Failed to get user info');
  return res.json();
};

export const getFoods = async (): Promise<FoodResponse[]> => {
  const res = await authFetch(`${API_BASE}/foods`);
  if (!res.ok) throw new Error('Failed to get foods');
  return res.json();
};

export const createFood = async (food: any): Promise<{ id: number }> => {
  const res = await authFetch(`${API_BASE}/foods`, {
    method: 'POST',
    body: JSON.stringify(food),
  });
  if (!res.ok) throw new Error('Failed to create food');
  return res.json();
};

export const addRecord = async (foodItemId: number, amountG: number, userId: number = 1): Promise<void> => {
  const res = await fetch(`${API_BASE}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, food_item_id: foodItemId, amount_g: amountG }),
  });
  if (!res.ok) throw new Error('Failed to add record');
};

export const getRecords = async (): Promise<DietRecord[]> => {
  const res = await authFetch(`${API_BASE}/records`);
  if (!res.ok) throw new Error('Failed to get records');
  return res.json();
};

export const getChartData = async (): Promise<ChartPoint[]> => {
  const res = await authFetch(`${API_BASE}/chart-data`);
  if (!res.ok) throw new Error('Failed to get chart data');
  return res.json();
};

export const getRecommendations = async (): Promise<RecommendationResponse> => {
  const res = await authFetch(`${API_BASE}/recommendations`);
  if (!res.ok) throw new Error('Failed to get recommendations');
  return res.json();
};

// ── 論壇 API ──────────────────────────────────────────

export const getPosts = async (): Promise<PostResponse[]> => {
  const res = await authFetch(`${API_BASE}/posts`);
  if (!res.ok) throw new Error('Failed to get posts');
  return res.json();
};

export const createPost = async (content: string, userId: number = 1): Promise<void> => {
  const res = await fetch(`${API_BASE}/posts?user_id=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to create post');
};

export const createComment = async (postId: number, content: string, userId: number = 1): Promise<void> => {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments?user_id=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to create comment');
};
