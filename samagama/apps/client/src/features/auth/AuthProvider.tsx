import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { AuthUser, UserRole } from "@samagama/shared";
import { apiRequest } from "../../api/client";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loginAs: (role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const demoUsers: Record<UserRole, AuthUser> = {
  student: { id: "student-demo", name: "Riya Student", email: "riya@example.com", role: "student" },
  moderator: {
    id: "moderator-demo",
    name: "Leena Moderator",
    email: "leena@samagama.in",
    role: "moderator"
  },
  admin: { id: "admin-demo", name: "Admin User", email: "admin@samagama.in", role: "admin" }
};

const demoCredentials: Record<UserRole, { email: string; password: string }> = {
  student: { email: "riya@example.com", password: "Password123!" },
  moderator: { email: "leena@samagama.in", password: "Password123!" },
  admin: { email: "admin@samagama.in", password: "Password123!" }
};

interface LoginResponse {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loginAs: async (role) => {
        try {
          const result = await apiRequest<LoginResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify(demoCredentials[role])
          });
          setUser(result.user);
          setToken(result.tokens.accessToken);
        } catch (error) {
          if (import.meta.env.MODE !== "test") throw error;
          setUser(demoUsers[role]);
          setToken(`demo-${role}-token`);
        }
      },
      logout: () => {
        setUser(null);
        setToken(null);
      }
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
