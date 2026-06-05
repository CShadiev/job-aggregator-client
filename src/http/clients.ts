import axios, { type InternalAxiosRequestConfig } from "axios";
import { getValidAccessToken, onAuthExpired } from "../utils/tokenStore";

const baseURL = import.meta.env.VITE_API_URL ?? "";

export const publicClient = axios.create({ baseURL });

export const apiClient = axios.create({ baseURL });

apiClient.interceptors.request.use(async (config) => {
  config.headers.Authorization = `Bearer ${await getValidAccessToken()}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        await getValidAccessToken();
        return apiClient(original);
      } catch {
        onAuthExpired();
      }
    }

    return Promise.reject(error);
  },
);
