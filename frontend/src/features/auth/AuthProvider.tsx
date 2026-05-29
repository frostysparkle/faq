// Auth state. Boots from a stored refresh token, exposes login/logout, and keeps the user object in sync.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthTokenPayload, LoginInput, PublicUser } from '@samagama/shared';
import { apiClient, tokenStorage } from '../../lib/api-client';

interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const applyAuth = useCallback((payload: AuthTokenPayload) => {
    tokenStorage.setTokens(payload.accessToken, payload.refreshToken);
    setUser(payload.user);
  }, []);

  // On mount: if we have an access token, fetch /me. If only a refresh token, exchange it.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const access = tokenStorage.getAccess();
      const refresh = tokenStorage.getRefresh();
      try {
        if (access) {
          const res = await apiClient.get('/api/auth/me');
          if (!cancelled) setUser(res.data.data);
        } else if (refresh) {
          const res = await apiClient.post('/api/auth/refresh', { refreshToken: refresh });
          if (!cancelled) applyAuth(res.data.data);
        }
      } catch {
        tokenStorage.clear();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applyAuth]);

  const login = useCallback(
    async (input: LoginInput) => {
      const res = await apiClient.post('/api/auth/login', input);
      applyAuth(res.data.data);
    },
    [applyAuth],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
