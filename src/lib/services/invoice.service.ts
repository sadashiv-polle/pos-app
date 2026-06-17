import axios from 'axios';

const proxy = '/api/proxy';

export const createPOSInvoice = (data: any) => {
  return axios.post(`${proxy}/pos-invoice`, data);
};
