import axios from "axios";
import { tokenStore } from "./tokenStore.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

let refreshPromise = null;

api.interceptors.request.use((config) => {
  const accessToken = tokenStore.getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = tokenStore.getRefreshToken();

    if (error.response?.status !== 401 || originalRequest?._retry || !refreshToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshPromise ??= axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const response = await refreshPromise;
      refreshPromise = null;

      const tokens = {
        accessToken: response.data.data.accessToken,
        refreshToken: response.data.data.refreshToken
      };
      tokenStore.setTokens(tokens);
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      refreshPromise = null;
      tokenStore.clearTokens();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("samagama:auth-expired"));
      }

      return Promise.reject(refreshError);
    }
  }
);
