import axios from 'axios';

const proxy = '/api/proxy';

export const getItems = (params?: any) => {
  return axios.get(`${proxy}/items`, { params });
};

export const createItem = (data: any) => {
  return axios.post(`${proxy}/items`, data);
};