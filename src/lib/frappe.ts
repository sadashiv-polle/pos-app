import axios from 'axios';

const frappe = axios.create({
  baseURL: process.env.NEXT_PUBLIC_FRAPPE_URL,
  withCredentials: true,
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});

// Add request interceptor to log requests (for debugging)
frappe.interceptors.request.use(
  (config) => {
    console.log('Making request to:', config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

frappe.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default frappe;
