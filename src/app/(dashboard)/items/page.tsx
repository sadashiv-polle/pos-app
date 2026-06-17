'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getItems, createItem } from '@/lib/services/item.service';

export default function ItemsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    item_code: '',
    item_name: '',
    standard_rate: 0,
    stock_uom: 'Nos',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: getItems,
  });

  const mutation = useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setShowForm(false);
      setFormData({ item_code: '', item_name: '', standard_rate: 0, stock_uom: 'Nos' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Items</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add Item
        </button>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-4">Loading...</td></tr>
            ) : (
              data?.data?.data?.map((item: any) => (
                <tr key={item.name}>
                  <td className="px-6 py-4">{item.item_code}</td>
                  <td className="px-6 py-4">{item.item_name}</td>
                  <td className="px-6 py-4">₹{item.standard_rate}</td>
                  <td className="px-6 py-4">{item.stock_uom}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Add New Item</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="block text-sm font-medium">Item Code *</label>
                <input
                  type="text"
                  className="w-full border rounded p-2"
                  required
                  value={formData.item_code}
                  onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium">Item Name *</label>
                <input
                  type="text"
                  className="w-full border rounded p-2"
                  required
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium">Rate</label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={formData.standard_rate}
                  onChange={(e) => setFormData({ ...formData, standard_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium">UOM</label>
                <input
                  type="text"
                  className="w-full border rounded p-2"
                  value={formData.stock_uom}
                  onChange={(e) => setFormData({ ...formData, stock_uom: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}