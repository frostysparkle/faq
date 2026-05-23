import { api } from "@/lib/api.js";

export const login = async (payload) => {
  const response = await api.post("/auth/login", payload);
  return response.data.data;
};

export const register = async (payload) => {
  const response = await api.post("/auth/register", payload);
  return response.data.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data.data;
};
