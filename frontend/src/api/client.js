import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://backend-gamma-sooty-63.vercel.app",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("expense_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
