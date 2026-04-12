import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import { setAccessToken } from '../services/api';
import type { LoginResponse } from '../types';

interface AuthUser {
  username: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Session restore on app launch ──────────────────────────
  // Try to get encrypted refresh token from main process,
  // exchange it for a new access token, then fetch /me.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const refreshToken = await window.electronAPI?.getRefreshToken();
        if (!refreshToken) return;

        // Exchange refresh token for a new access token
        const { data } = await api.post<{ accessToken: string }>('/auth/refresh', { refreshToken });
        if (cancelled) return;

        setAccessToken(data.accessToken);

        // Fetch current user info
        const meRes = await api.get<AuthUser>('/auth/me');
        if (cancelled) return;

        setUser(meRes.data);
      } catch {
        // Refresh failed — token expired or revoked, stay logged out
        setAccessToken(null);
        await window.electronAPI?.deleteRefreshToken();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    // Fallback: if not running in Electron (e.g. dev browser), skip restore
    if (!window.electronAPI) {
      setIsLoading(false);
      return;
    }

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  // ── Login ──────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string) => {
    const response = await api.post<LoginResponse>('/auth/login', { username, password });
    const { accessToken, refreshToken, user: newUser } = response.data;

    // Access token → memory only
    setAccessToken(accessToken);

    // Refresh token → encrypted via Electron main process
    await window.electronAPI?.saveRefreshToken(refreshToken);

    setUser(newUser);
  }, []);

  // ── Logout ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      // Revoke refresh token server-side
      await api.post('/auth/logout');
    } catch {
      // Server unreachable — still clear local state
    }

    setAccessToken(null);
    setUser(null);
    await window.electronAPI?.deleteRefreshToken();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
