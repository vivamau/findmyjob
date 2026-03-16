import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Proxied to http://localhost:3000/api via vite.config.ts Proxy
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
