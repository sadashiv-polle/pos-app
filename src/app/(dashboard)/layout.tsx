'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: '/dashboard', label: '📊 Dashboard' },
    { href: '/pos', label: '🛒 POS' },
    { href: '/items', label: '📦 Items' },
    { href: '/customers', label: '👥 Customers' },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/proxy/logout');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100 flex">
        {/* Sidebar */}
        <aside className="bg-gray-800 text-white w-64 space-y-6 py-7 px-2 flex flex-col">
          <div className="text-2xl font-semibold text-center">🛒 POS</div>
          <nav className="flex-1">
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
          <button
            onClick={handleLogout}
            className="block w-full text-left py-2.5 px-4 rounded hover:bg-gray-700 transition duration-200 text-red-400 hover:text-red-300"
          >
            🚪 Logout
          </button>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </QueryClientProvider>
  );
}
