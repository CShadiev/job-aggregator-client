import { jwtDecode } from "jwt-decode";
import { publicClient } from "../http/clients";
import type { LoginResponse } from "../types/auth";

const ACCESS_TOKEN_KEY = "job_aggregator_at";
const REFRESH_TOKEN_KEY = "job_aggregator_rt";
const EXPIRY_BUFFER_SECONDS = 30;

let refreshPromise: Promise<string> | null = null;
const listeners = new Set<() => void>();

interface JwtPayload {
  exp?: number;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(
  accessToken: string,
  refreshToken: string | null | undefined
): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasStoredTokens(): boolean {
  return Boolean(getAccessToken());
}

export function subscribeAuthExpired(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function onAuthExpired(): void {
  clearTokens();
  listeners.forEach((listener) => listener());
}

function isTokenExpired(token: string): boolean {
  try {
    const { exp } = jwtDecode<JwtPayload>(token);
    if (!exp) return true;
    return Date.now() >= (exp - EXPIRY_BUFFER_SECONDS) * 1000;
  } catch {
    return true;
  }
}

export async function getValidAccessToken(): Promise<string> {
  const accessToken = getAccessToken();
  if (accessToken && !isTokenExpired(accessToken)) {
    return accessToken;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    onAuthExpired();
    throw new Error("No refresh token");
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const { data } = await publicClient.post<LoginResponse>(
        "/users/refresh",
        { refresh_token: refreshToken }
      );
      setTokens(data.access_token, data.refresh_token);
      return data.access_token;
    } catch (error) {
      onAuthExpired();
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
