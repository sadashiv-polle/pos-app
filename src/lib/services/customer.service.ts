import axios from 'axios';

const proxy = '/api/proxy';

export const getCustomers = (params?: any) => {
  return axios.get(`${proxy}/customers`, { params });
};

export const createCustomer = (data: any) => {
  return axios.post(`${proxy}/customers`, data);
};