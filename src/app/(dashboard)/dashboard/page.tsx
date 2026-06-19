'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/lib/services/dashboard.service';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

export default function DashboardPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
  });

  const stats = data?.data;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Sample data for charts (you can replace with real data from your API)
  const topItems = [
    { name: 'Coffee', quantity: 45, revenue: 900 },
    { name: 'Tea', quantity: 30, revenue: 300 },
    { name: 'Sprite', quantity: 25, revenue: 1250 },
    { name: 'Water', quantity: 20, revenue: 400 },
    { name: 'Shre', quantity: 15, revenue: 1350 },
  ];

  const categorySales = [
    { category: 'Products', amount: 4200 },
    { category: 'Services', amount: 1800 },
    { category: 'Raw Materials', amount: 600 },
  ];

  // Pie chart data - Top Items by Revenue
  const pieData = {
    labels: topItems.map(item => item.name),
    datasets: [
      {
        data: topItems.map(item => item.revenue),
        backgroundColor: [
          '#667eea',
          '#764ba2',
          '#f093fb',
          '#4facfe',
          '#43e97b',
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
            weight: '500' as const,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
          }
        }
      }
    },
  };

  // Bar chart data - Category Sales
  const barData = {
    labels: categorySales.map(item => item.category),
    datasets: [
      {
        label: 'Sales by Category',
        data: categorySales.map(item => item.amount),
        backgroundColor: [
          'rgba(102, 126, 234, 0.8)',
          'rgba(118, 75, 162, 0.8)',
          'rgba(79, 172, 254, 0.8)',
        ],
        borderColor: [
          '#667eea',
          '#764ba2',
          '#4facfe',
        ],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `₹${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '₹' + value;
          }
        }
      }
    }
  };

  // Recent sales data for line chart (optional)
  const recentSales = [
    { day: 'Mon', amount: 1200 },
    { day: 'Tue', amount: 1900 },
    { day: 'Wed', amount: 1500 },
    { day: 'Thu', amount: 2400 },
    { day: 'Fri', amount: 2100 },
    { day: 'Sat', amount: 1800 },
    { day: 'Sun', amount: 900 },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📊 Dashboard</h1>
          <p style={styles.subtitle}>Overview of your business performance</p>
        </div>
        <div style={styles.headerActions}>
          <button 
            onClick={handleRefresh} 
            style={styles.refreshButton}
            disabled={isRefreshing}
          >
            {isRefreshing ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
          <Link href="/pos" style={styles.primaryButton}>
            + New Sale
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div style={styles.statContent}>
            <div style={styles.statLabel}>Today's Sales</div>
            <div style={styles.statValue}>
              ₹{isLoading ? '...' : stats?.today_sales?.toFixed(2) || '0.00'}
            </div>
            <div style={styles.statTrend}>
              <span style={styles.trendLabel}>Total revenue today</span>
            </div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>📄</div>
          <div style={styles.statContent}>
            <div style={styles.statLabel}>Total Invoices</div>
            <div style={styles.statValue}>
              {isLoading ? '...' : stats?.total_invoice_count || 0}
            </div>
            <div style={styles.statTrend}>
              <span style={styles.trendLabel}>All time invoices</span>
            </div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>👥</div>
          <div style={styles.statContent}>
            <div style={styles.statLabel}>Total Customers</div>
            <div style={styles.statValue}>
              {isLoading ? '...' : stats?.customer_count || 0}
            </div>
            <div style={styles.statTrend}>
              <span style={styles.trendLabel}>Registered customers</span>
            </div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>📈</div>
          <div style={styles.statContent}>
            <div style={styles.statLabel}>Average Invoice</div>
            <div style={styles.statValue}>
              ₹{isLoading ? '...' : stats?.average_invoice?.toFixed(2) || '0.00'}
            </div>
            <div style={styles.statTrend}>
              <span style={styles.trendLabel}>Average per invoice</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={styles.chartsSection}>
        <div style={styles.chartRow}>
          {/* Pie Chart - Revenue Distribution */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>💰 Revenue by Item</h3>
              <p style={styles.chartSubtitle}>Top selling items by revenue</p>
            </div>
            <div style={styles.pieChartContainer}>
              <Pie data={pieData} options={pieOptions} />
            </div>
          </div>

          {/* Bar Chart - Category Sales */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>📊 Sales by Category</h3>
              <p style={styles.chartSubtitle}>Revenue distribution across categories</p>
            </div>
            <div style={styles.barChartContainer}>
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </div>

        {/* Additional Chart - Weekly Sales Trend (Optional) */}
        <div style={styles.chartRow}>
          <div style={{...styles.chartCard, width: '100%'}}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>📈 Weekly Sales Trend</h3>
              <p style={styles.chartSubtitle}>Daily sales performance this week</p>
            </div>
            <div style={styles.weeklyChartContainer}>
              <Bar 
                data={{
                  labels: recentSales.map(item => item.day),
                  datasets: [{
                    label: 'Daily Sales',
                    data: recentSales.map(item => item.amount),
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: '#667eea',
                    borderWidth: 2,
                    borderRadius: 8,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context: any) {
                          return `₹${context.parsed.y.toFixed(2)}`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value: any) {
                          return '₹' + value;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        <h2 style={styles.sectionTitle}>⚡ Quick Actions</h2>
        <div style={styles.actionGrid}>
          <Link href="/pos" style={styles.actionCard}>
            <span style={styles.actionIcon}>🛒</span>
            <span style={styles.actionLabel}>New Sale</span>
            <span style={styles.actionDesc}>Create a new POS invoice</span>
          </Link>
          <Link href="/items" style={styles.actionCard}>
            <span style={styles.actionIcon}>📦</span>
            <span style={styles.actionLabel}>Manage Items</span>
            <span style={styles.actionDesc}>Add or update inventory</span>
          </Link>
          <Link href="/customers" style={styles.actionCard}>
            <span style={styles.actionIcon}>👥</span>
            <span style={styles.actionLabel}>Customers</span>
            <span style={styles.actionDesc}>Manage customer data</span>
          </Link>
          <Link href="/invoices" style={styles.actionCard}>
            <span style={styles.actionIcon}>📄</span>
            <span style={styles.actionLabel}>Invoices</span>
            <span style={styles.actionDesc}>View all invoices</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: 0,
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '8px 0 0 0',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  refreshButton: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textDecoration: 'none',
    display: 'inline-block',
  },
  primaryButton: {
    padding: '12px 24px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    display: 'inline-block',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.3s ease',
    minHeight: '100px',
  },
  statIcon: {
    fontSize: '32px',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
    borderRadius: '12px',
    flexShrink: 0,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: '12px',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '500',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: '2px',
  },
  statTrend: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
  },
  trendLabel: {
    color: '#999',
  },
  chartsSection: {
    marginBottom: '32px',
  },
  chartRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px',
  },
  chartCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'all 0.3s ease',
  },
  chartHeader: {
    marginBottom: '16px',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a2e',
    margin: 0,
  },
  chartSubtitle: {
    fontSize: '12px',
    color: '#999',
    margin: '4px 0 0 0',
  },
  pieChartContainer: {
    height: '280px',
    position: 'relative',
  },
  barChartContainer: {
    height: '280px',
    position: 'relative',
  },
  weeklyChartContainer: {
    height: '250px',
    position: 'relative',
  },
  quickActions: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a2e',
    margin: '0 0 20px 0',
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  actionCard: {
    padding: '20px',
    backgroundColor: '#f8f9ff',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '6px',
  },
  actionIcon: {
    fontSize: '28px',
  },
  actionLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  actionDesc: {
    fontSize: '11px',
    color: '#999',
  },
};

// Add global styles for animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .action-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      background-color: #f0f4ff;
    }
    .primary-btn:hover {
      background-color: #5a67d8;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    .refresh-btn:hover {
      background-color: #f0f4ff;
    }
    .chart-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      transform: translateY(-2px);
    }
  `;
  document.head.appendChild(style);
}