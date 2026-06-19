import axios from 'axios';

export const getCustomers = async () => {
  const res = await axios.get("/api/proxy/customers");

  console.log("RAW API RESPONSE:", res.data);

  return res.data;
};

export const createCustomer = async (data: any) => {
  try {
    const response = await axios.post('/api/proxy/customers', data, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return response;
  } catch (error: any) {
    console.error('Error creating customer:', error.response?.data || error.message);
    throw error;
  }
};
