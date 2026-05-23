const RECENT_SEARCHES_KEY = "samagama.recentFaqSearches";

export const readRecentFaqSearches = () => {
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]");
  } catch {
    return [];
  }
};

export const rememberFaqSearch = (query) => {
  if (!query?.trim()) return;

  const normalized = query.trim();
  const next = [normalized, ...readRecentFaqSearches().filter((item) => item !== normalized)].slice(0, 6);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
};
