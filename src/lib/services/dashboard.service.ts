import axios from 'axios';

export const getDashboardStats = async () => {
  try {
    const response = await axios.get('/api/proxy/dashboard');
    console.log('Dashboard stats received:', response.data);
    return response;
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    console.error('Error response:', error.response?.data);
    // Return default values on error
    return {
      data: {
        today_sales: 0,
        invoice_count: 0,
        paid_invoice_count: 0,
        draft_invoice_count: 0,
        customer_count: 0,
        average_invoice: 0,
        date: new Date().toISOString().split('T')[0],
        invoices: [],
      }
    };
  }
};

export const getRecentOrders = async () => {
  try {
    const response = await axios.get('/api/proxy/pos-invoice', {
      params: {
        filters: '[["docstatus","=",1]]',
        fields: '["name","grand_total","customer","posting_date"]',
        limit: 10
      }
    });
    return response;
  } catch (error: any) {
    console.error('Error fetching recent orders:', error);
    return { data: { data: [] } };
  }
};
