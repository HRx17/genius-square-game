const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
}

export async function signup(data: { username: string; email: string; password: string }) {
  const res = await apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) });
  return res.json();
}

export async function login(data: { email: string; password: string }) {
  const res = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
  return res.json();
}

export async function logout() {
  const res = await apiFetch('/api/auth/logout', { method: 'POST' });
  return res.json();
}

export async function getMe() {
  const res = await apiFetch('/api/auth/me');
  if (!res.ok) return null;
  return res.json();
}

export async function getProfile(username: string) {
  const res = await apiFetch(`/api/users/profile/${username}`);
  return res.json();
}

export async function getLeaderboard() {
  const res = await apiFetch('/api/users/leaderboard');
  return res.json();
}
