const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('onboardiq_token');
}

export function setToken(token) {
  localStorage.setItem('onboardiq_token', token);
}

export function clearToken() {
  localStorage.removeItem('onboardiq_token');
}

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function downloadCsv(kind, filters) {
  const token = getToken();
  const response = await fetch(`${API_BASE}/export/${kind}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(filters),
  });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `onboardiq-${kind}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
