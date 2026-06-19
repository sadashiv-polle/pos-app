import axios from 'axios';

export const createPOSInvoice = async (data: any) => {
  try {
    const response = await axios.post('/api/proxy/pos-invoice', data, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return response;
  } catch (error: any) {
    console.error('Error creating invoice:', error.response?.data || error.message);
    throw error;
  }
};
