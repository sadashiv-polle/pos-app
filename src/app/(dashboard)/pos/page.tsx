'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '@/store/cart.store';
import { getItems } from '@/lib/services/item.service';
import { getCustomers } from '@/lib/services/customer.service';
import { createPOSInvoice } from '@/lib/services/invoice.service';

export default function POSPage() {
  const {
    items: cartItems,
    customer,
    addItem,
    updateQty,
    removeItem,
    setCustomer,
    clearCart,
    total,
  } = useCartStore();

  const [search, setSearch] = useState('');

  const { data: itemsData } = useQuery({
    queryKey: ['items', search],
    queryFn: () => getItems({ params: { filters: `[["item_name","like","%${search}%"]]` } }),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const handleSubmit = async () => {
    if (!customer) { alert('Select a customer'); return; }
    if (cartItems.length === 0) { alert('Cart is empty'); return; }

    // IMPORTANT: Replace "Default" with your actual POS Profile name in ERPNext
    const payload = {
      customer,
      pos_profile: 'Default',
      items: cartItems.map((i) => ({
        item_code: i.item_code,
        qty: i.qty,
        rate: i.rate,
      })),
      payments: [{ mode_of_payment: 'Cash', amount: total() }],
      set_posting_date: new Date().toISOString().split('T')[0],
    };

    try {
      await createPOSInvoice(payload);
      alert('Invoice created successfully!');
      clearCart();
    } catch (error) {
      console.error(error);
      alert('Failed to create invoice');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)]">
      {/* Left: Item Browser */}
      <div className="w-full md:w-1/2 p-4 bg-white rounded shadow overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Items</h2>
        <input
          type="text"
          placeholder="Search items..."
          className="w-full border rounded p-2 mb-4"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          {itemsData?.data?.data?.map((item: any) => (
            <div
              key={item.name}
              className="p-3 border rounded cursor-pointer hover:bg-blue-50"
              onClick={() => addItem({
                item_code: item.item_code,
                item_name: item.item_name,
                rate: item.standard_rate || 0,
                uom: item.stock_uom,
              })}
            >
              <div className="font-semibold">{item.item_name}</div>
              <div className="text-sm text-gray-500">{item.item_code}</div>
              <div className="text-green-600">₹{item.standard_rate || 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-full md:w-1/2 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Cart</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium">Customer</label>
          <select
            className="w-full border rounded p-2"
            value={customer || ''}
            onChange={(e) => setCustomer(e.target.value)}
          >
            <option value="">Select...</option>
            {customersData?.data?.data?.map((c: any) => (
              <option key={c.name} value={c.name}>{c.customer_name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto border rounded bg-gray-50 p-2">
          {cartItems.length === 0 ? (
            <p className="text-gray-400 text-center mt-10">No items added</p>
          ) : (
            cartItems.map((item) => (
              <div key={item.item_code} className="flex justify-between items-center border-b py-2">
                <div>
                  <div className="font-medium">{item.item_name}</div>
                  <div className="text-sm text-gray-500">₹{item.rate} x {item.qty}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.item_code, item.qty - 1)} className="px-2 py-1 bg-gray-200 rounded">-</button>
                  <span>{item.qty}</span>
                  <button onClick={() => updateQty(item.item_code, item.qty + 1)} className="px-2 py-1 bg-gray-200 rounded">+</button>
                  <button onClick={() => removeItem(item.item_code)} className="text-red-500 ml-2">✕</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 p-4 bg-white border rounded">
          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>₹{total().toFixed(2)}</span>
          </div>
          <button
            onClick={handleSubmit}
            className="w-full mt-2 bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700"
          >
            Create Invoice
          </button>
        </div>
      </div>
    </div>
  );
}