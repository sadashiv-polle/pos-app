import axios from 'axios';

export const getItems = async (params?: any) => {
  try {
    const response = await axios.get('/api/proxy/items', { 
      params,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return response;
  } catch (error: any) {
    console.error('Error fetching items:', error.response?.data || error.message);
    throw error;
  }
};

export const createItem = async (data: any) => {
  try {
    const response = await axios.post('/api/proxy/items', data, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return response;
  } catch (error: any) {
    console.error('Error creating item:', error.response?.data || error.message);
    throw error;
  }
};
