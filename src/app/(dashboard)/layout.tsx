'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/pos', label: 'POS' },
    { href: '/items', label: 'Items' },
    { href: '/customers', label: 'Customers' },
  ];

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100 flex">
        {/* Sidebar */}
        <aside className={`bg-gray-800 text-white w-64 space-y-6 py-7 px-2 ${sidebarOpen ? 'block' : 'hidden'} md:block`}>
          <div className="text-2xl font-semibold text-center">POS App</div>
          <nav>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block py-2.5 px-4 rounded transition duration-200 ${
                  pathname === item.href ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="absolute bottom-4 w-56">
            <Link
              href="/api/proxy/logout"
              className="block py-2.5 px-4 rounded hover:bg-gray-700"
              onClick={async (e) => {
                e.preventDefault();
                await fetch('/api/proxy/logout');
                window.location.href = '/login';
              }}
            >
              Logout
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </QueryClientProvider>
  );
}