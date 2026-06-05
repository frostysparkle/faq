// Single axios instance. Reads the access token from localStorage on every request,
// so token rotation is picked up without further wiring.
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

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

// Queue of callers waiting for a refresh in flight.
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function drainQueue(newToken: string) {
  refreshQueue.forEach((resolve) => resolve(newToken));
  refreshQueue = [];
}

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    // Surface the API error envelope's message instead of axios's generic one when present.
    const apiMessage = (err?.response?.data as Record<string, any>)?.error?.message;
    if (apiMessage) err.message = apiMessage;

    const config = err.config as RetryableConfig | undefined;

    // Silent token refresh on 401. Skip for the refresh endpoint itself and retried requests.
    if (
      err.response?.status === 401 &&
      config &&
      !config._retry &&
      !config.url?.includes('/auth/refresh')
    ) {
      const refreshToken = tokenStorage.getRefresh();
      if (!refreshToken) {
        tokenStorage.clear();
        window.location.replace('/login');
        return Promise.reject(err);
      }

      if (isRefreshing) {
        // Another refresh is already in flight — queue this request.
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
            resolve(apiClient(config));
          });
        });
      }

      config._retry = true;
      isRefreshing = true;

      try {
        const baseURL = apiClient.defaults.baseURL ?? '';
        const res = await axios.post(
          `${baseURL}/api/auth/refresh`,
          { refreshToken },
          { timeout: 15_000 },
        );
        const { accessToken, refreshToken: newRefresh } = res.data.data;
        tokenStorage.setTokens(accessToken, newRefresh);
        drainQueue(accessToken);
        config.headers = { ...config.headers, Authorization: `Bearer ${accessToken}` };
        return apiClient(config);
      } catch {
        refreshQueue = [];
        tokenStorage.clear();
        window.location.replace('/login');
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  },
);
