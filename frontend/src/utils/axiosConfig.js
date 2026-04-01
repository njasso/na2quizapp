import axios from 'axios';
import { API_URL } from '../config';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token') || localStorage.getItem('userToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    const msg = error.response?.data?.message || error.message || 'Erreur de connexion';
    return Promise.reject(new Error(msg));
  }
);

export default apiClient;
