import axios from 'axios';

export const getItemGroups = async () => {
  try {
    const response = await axios.get('/api/proxy/item-groups', {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return response;
  } catch (error: any) {
    console.error('Error fetching item groups:', error.response?.data || error.message);
    throw error;
  }
};
