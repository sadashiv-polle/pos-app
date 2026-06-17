import axios from 'axios';

const frappe = axios.create({
  baseURL: process.env.NEXT_PUBLIC_FRAPPE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

frappe.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default frappe;