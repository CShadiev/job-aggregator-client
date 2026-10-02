import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  demoLogin as requestDemoLogin,
  login as requestLogin,
  logout as requestLogout,
} from "../requests/auth";
import { DEMO_SESSION_NAME, type LoginResponse } from "../types/auth";
import {
  clearTokens,
  getRefreshToken,
  getSessionUsername,
  hasStoredTokens,
  setTokens,
  subscribeAuthExpired,
} from "../utils/tokenStore";

interface AuthContextValue {
  isAuthenticated: boolean;
  isDemo: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isDemoUsername(username: string | null): boolean {
  return username === DEMO_SESSION_NAME;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    hasStoredTokens(),
  );
  const [isDemo, setIsDemo] = useState(() =>
    isDemoUsername(getSessionUsername()),
  );
  const [isLoading] = useState(false);

  useEffect(() => {
    return subscribeAuthExpired(() => {
      setIsAuthenticated(false);
      setIsDemo(false);
    });
  }, []);

  const applySession = useCallback((data: LoginResponse, username: string) => {
    setTokens(data.access_token, data.refresh_token, username);
    setIsAuthenticated(true);
    setIsDemo(isDemoUsername(username));
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await requestLogin({ username, password });
      applySession(data, username);
    },
    [applySession],
  );

  const demoLogin = useCallback(async () => {
    const data = await requestDemoLogin();
    applySession(data, DEMO_SESSION_NAME);
  }, [applySession]);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await requestLogout(refreshToken);
      }
    } finally {
      clearTokens();
      setIsAuthenticated(false);
      setIsDemo(false);
    }
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, isDemo, isLoading, login, demoLogin, logout }),
    [isAuthenticated, isDemo, isLoading, login, demoLogin, logout],
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
