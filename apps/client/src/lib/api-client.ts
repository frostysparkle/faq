// Single axios instance. Reads the access token from localStorage on every request,
// so token rotation by the AuthProvider is picked up without further wiring.
import axios from 'axios';

const TOKEN_STORAGE_KEY = 'samagama:accessToken';
const REFRESH_STORAGE_KEY = 'samagama:refreshToken';

export const tokenStorage = {
  getAccess: (): string | null => localStorage.getItem(TOKEN_STORAGE_KEY),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_STORAGE_KEY),
  setTokens: (access: string, refresh: string): void => {
    localStorage.setItem(TOKEN_STORAGE_KEY, access);
    localStorage.setItem(REFRESH_STORAGE_KEY, refresh);
  },
  clear: (): void => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_STORAGE_KEY);
  },
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    // Surface the API error envelope's message instead of axios's generic one when present.
    const apiMessage = err?.response?.data?.error?.message;
    if (apiMessage) err.message = apiMessage;
    return Promise.reject(err);
  },
);
