'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/lib/services/dashboard.service';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
  });

  const stats = data?.data;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Today's Sales</h3>
          <p className="text-3xl font-bold">
            ₹{isLoading ? '...' : stats?.today_sales?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Invoices Today</h3>
          <p className="text-3xl font-bold">{isLoading ? '...' : stats?.invoice_count || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Quick Actions</h3>
          <div className="space-y-2 mt-2">
            <a href="/pos" className="block text-blue-600 hover:underline">New Sale</a>
            <a href="/items" className="block text-blue-600 hover:underline">Manage Items</a>
          </div>
        </div>
      </div>
    </div>
  );
}