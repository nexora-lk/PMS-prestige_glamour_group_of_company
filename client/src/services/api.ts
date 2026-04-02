import axios, { type InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4500/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── In-memory access token (never persisted) ─────────────────

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ── Request interceptor — attach access token ────────────────

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Response interceptor — silent refresh on 401 ─────────────

let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (config: InternalAxiosRequestConfig) => void;
  reject: (error: unknown) => void;
}> = [];

function processPendingRequests(newToken: string | null): void {
  for (const { resolve, reject } of pendingRequests) {
    if (newToken) {
      resolve({ headers: { Authorization: `Bearer ${newToken}` } } as InternalAxiosRequestConfig);
    } else {
      reject(new Error('Refresh failed'));
    }
  }
  pendingRequests = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh attempts for auth endpoints or already-retried requests
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/')
    ) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: () => {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Get encrypted refresh token from Electron main process
      const refreshToken = await window.electronAPI?.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Exchange refresh token for new access token
      const { data } = await axios.post('http://localhost:4500/api/auth/refresh', { refreshToken });

      accessToken = data.accessToken;
      processPendingRequests(data.accessToken);

      // Retry the original request with new token
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch {
      // Refresh failed — clear everything and redirect to login
      accessToken = null;
      processPendingRequests(null);
      await window.electronAPI?.deleteRefreshToken();

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
