import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { publicClient } from "../http/clients";
import type { LoginResponse } from "../types/auth";
import {
  clearTokens,
  getRefreshToken,
  hasStoredTokens,
  setTokens,
  subscribeAuthExpired,
} from "../utils/tokenStore";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    hasStoredTokens(),
  );
  const [isLoading] = useState(false);

  useEffect(() => {
    return subscribeAuthExpired(() => {
      setIsAuthenticated(false);
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await publicClient.post<LoginResponse>("/users/login", {
      username,
      password,
    });
    setTokens(data.access_token, data.refresh_token);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await publicClient.post("/users/logout", {
          refresh_token: refreshToken,
        });
      }
    } finally {
      clearTokens();
      setIsAuthenticated(false);
    }
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, isLoading, login, logout }),
    [isAuthenticated, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
