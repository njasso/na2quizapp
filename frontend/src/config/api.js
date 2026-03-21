import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token') || localStorage.getItem('userToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response.data,
  error => {
    const msg = error.response?.data?.message || error.response?.data?.error || error.message;
    return Promise.reject(new Error(msg));
  }
);

export default api;
