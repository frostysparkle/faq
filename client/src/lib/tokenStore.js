const ACCESS_TOKEN_KEY = "samagama.accessToken";
const REFRESH_TOKEN_KEY = "samagama.refreshToken";
const USER_KEY = "samagama.user";

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

export const tokenStore = {
  getAccessToken() {
    return canUseStorage() ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  },
  getRefreshToken() {
    return canUseStorage() ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  },
  setTokens(tokens) {
    if (!canUseStorage()) {
      return;
    }

    window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  getUser() {
    if (!canUseStorage()) {
      return null;
    }

    const rawUser = window.localStorage.getItem(USER_KEY);
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser);
    } catch {
      window.localStorage.removeItem(USER_KEY);
      return null;
    }
  },
  setUser(user) {
    if (!canUseStorage()) {
      return;
    }

    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearTokens() {
    if (!canUseStorage()) {
      return;
    }

    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }
};
