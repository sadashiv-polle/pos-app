'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [priceMap, setPriceMap] = useState<Map<string, number>>(new Map());
  const [formData, setFormData] = useState({
    item_code: "",
    item_name: "",
    item_group: "",
    standard_rate: "",
    stock_uom: "",
    description: "",
    opening_stock: "",
    is_stock_item: 1,
  });

  useEffect(() => {
    loadItems();
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const response = await axios.get('/api/proxy/item-prices');
      console.log('Price API Response:', response.data);
      
      if (response.data?.data) {
        const map = new Map<string, number>();
        response.data.data.forEach((p: any) => {
          if (p.item_code && p.price_list_rate) {
            map.set(p.item_code, parseFloat(p.price_list_rate) || 0);
          }
        });
        setPriceMap(map);
        console.log(`✅ Price map created with ${map.size} items`);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/proxy/items', {
        credentials: 'include',
      });
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      
      const data = await response.json();
      const itemsList = data.data || [];
      setItems(itemsList);
      console.log('Items loaded:', itemsList.length);
      
      // Log opening stock info
      const stockItems = itemsList.filter((item: any) => item.is_stock_item === 1);
      const totalStock = stockItems.reduce((sum: number, item: any) => sum + (parseFloat(item.opening_stock) || 0), 0);
      console.log(`📊 Total stock: ${totalStock} units across ${stockItems.length} items`);
    } catch (err: any) {
      console.error("Error loading items:", err);
      setError(err.message || "Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // First create the item
      const itemResponse = await fetch('/api/proxy/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          standard_rate: parseFloat(formData.standard_rate) || 0,
          opening_stock: parseFloat(formData.opening_stock) || 0,
          is_stock_item: parseInt(formData.is_stock_item as any) || 1,
        }),
      });
      
      if (itemResponse.status === 401) {
        router.push('/login');
        return;
      }
      
      if (!itemResponse.ok) {
        const error = await itemResponse.json();
        throw new Error(error.message || 'Failed to create item');
      }
      
      const itemData = await itemResponse.json();
      console.log('Item created:', itemData);
      
      // Then create Item Price record for "Standard Selling" price list
      if (formData.standard_rate && parseFloat(formData.standard_rate) > 0) {
        try {
          const priceResponse = await fetch('/api/proxy/item-prices', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              item_code: formData.item_code,
              price_list: "Standard Selling",
              price_list_rate: parseFloat(formData.standard_rate) || 0,
              uom: formData.stock_uom || "Nos",
            }),
          });
          
          if (!priceResponse.ok) {
            console.warn('Failed to create Item Price record:', await priceResponse.text());
          } else {
            console.log('Item Price record created successfully');
            await fetchPrices();
          }
        } catch (priceError) {
          console.warn('Error creating Item Price record:', priceError);
        }
      }
      
      setFormData({
        item_code: "",
        item_name: "",
        item_group: "",
        standard_rate: "",
        stock_uom: "",
        description: "",
        opening_stock: "",
        is_stock_item: 1,
      });
      setShowAddModal(false);
      await loadItems();
      alert('✅ Item created successfully!');
    } catch (err: any) {
      console.error("Error creating item:", err);
      alert(err.message || 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? e.target.value : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  // Get price from price map or standard_rate
  const getItemPrice = (item: any) => {
    const itemCode = item.item_code || item.name;
    if (priceMap.has(itemCode)) {
      return priceMap.get(itemCode) || 0;
    }
    return parseFloat(item.standard_rate) || 0;
  };

  const filteredItems = items.filter(item => {
    const search = searchTerm.toLowerCase();
    return (
      (item.item_name?.toLowerCase().includes(search) ||
      item.item_code?.toLowerCase().includes(search) ||
      item.item_group?.toLowerCase().includes(search) ||
      item.name?.toLowerCase().includes(search))
    );
  });

  // Calculate stats
  const totalItems = items.length;
  const stockItems = items.filter(item => item.is_stock_item === 1);
  const totalStock = stockItems.reduce((sum, item) => sum + (parseFloat(item.opening_stock) || 0), 0);
  const outOfStockItems = items.filter(item => item.is_stock_item === 1 && (parseFloat(item.opening_stock) || 0) === 0);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <span style={styles.errorIcon}>⚠️</span>
          <h3 style={styles.errorTitle}>Error Loading Items</h3>
          <p style={styles.errorMessage}>{error}</p>
          <button onClick={loadItems} style={styles.retryButton}>
            Try Again
          </button>
          <Link href="/dashboard" style={styles.backLink}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href="/dashboard" style={styles.backButton}>
          ← Back to Dashboard
        </Link>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>📦 Inventory Items</h1>
            <p style={styles.subtitle}>Manage your product catalog</p>
          </div>
          <div style={styles.headerActions}>
            <div style={styles.statsBadge}>
              <span style={styles.statsNumber}>{totalItems}</span>
              <span style={styles.statsLabel}>Total Items</span>
            </div>
            <div style={styles.statsBadge}>
              <span style={styles.statsNumber}>{stockItems.length}</span>
              <span style={styles.statsLabel}>Stock Items</span>
            </div>
            <div style={styles.statsBadge}>
              <span style={styles.statsNumber}>{totalStock.toFixed(0)}</span>
              <span style={styles.statsLabel}>Total Stock</span>
            </div>
            {outOfStockItems.length > 0 && (
              <div style={{...styles.statsBadge, backgroundColor: '#fef3c7'}}>
                <span style={{...styles.statsNumber, color: '#92400e'}}>{outOfStockItems.length}</span>
                <span style={{...styles.statsLabel, color: '#92400e'}}>Out of Stock</span>
              </div>
            )}
            <button onClick={() => setShowAddModal(true)} style={styles.addButton}>
              + Add New Item
            </button>
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div style={styles.searchBar}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search items by name, code or group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={styles.clearButton}>
              ✕
            </button>
          )}
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div style={styles.emptyState}>
          {searchTerm ? (
            <>
              <span style={styles.emptyIcon}>🔍</span>
              <h3>No matching items found</h3>
              <p>Try adjusting your search terms</p>
              <button onClick={() => setSearchTerm("")} style={styles.clearSearchButton}>
                Clear Search
              </button>
            </>
          ) : (
            <>
              <span style={styles.emptyIcon}>📦</span>
              <h3>No Items Found</h3>
              <p>Click the "Add New Item" button to create your first item.</p>
              <button onClick={() => setShowAddModal(true)} style={styles.clearSearchButton}>
                + Add Your First Item
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div style={styles.resultsInfo}>
            Showing {filteredItems.length} of {items.length} items
          </div>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Item Code</th>
                  <th style={styles.th}>Item Name</th>
                  <th style={styles.th}>Item Group</th>
                  <th style={styles.th}>Quantity</th>
                  <th style={styles.th}>Price List Rate</th>
                  <th style={styles.th}>Standard Rate</th>
                  <th style={styles.th}>Stock UOM</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => {
                  const priceListRate = getItemPrice(item);
                  const standardRate = parseFloat(item.standard_rate) || 0;
                  const hasPriceList = priceListRate > 0;
                  const quantity = parseFloat(item.opening_stock) || 0;
                  const isStockItem = item.is_stock_item === 1;
                  const isOutOfStock = isStockItem && quantity === 0;
                  
                  return (
                    <tr key={item.name || index} style={index % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{index + 1}</td>
                      <td style={styles.td}>
                        <div style={styles.codeCell}>
                          <span style={styles.codeBadge}>{item.item_code || item.name || '-'}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <strong>{item.item_name || '-'}</strong>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.groupBadge}>{item.item_group || '-'}</span>
                      </td>
                      <td style={styles.td}>
                        {isStockItem ? (
                          <span style={{
                            ...styles.quantityBadge,
                            backgroundColor: isOutOfStock ? '#fee2e2' : quantity > 10 ? '#d1fae5' : '#fef3c7',
                            color: isOutOfStock ? '#dc2626' : quantity > 10 ? '#065f46' : '#92400e',
                          }}>
                            {isOutOfStock ? '⚠️ 0' : quantity.toFixed(0)}
                          </span>
                        ) : (
                          <span style={{
                            ...styles.quantityBadge,
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                          }}>
                            N/A
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={hasPriceList ? styles.rateCell : styles.noRateCell}>
                          {hasPriceList ? `₹ ${priceListRate.toFixed(2)}` : 'No Price'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={standardRate > 0 ? styles.rateCell : styles.noRateCell}>
                          {standardRate > 0 ? `₹ ${standardRate.toFixed(2)}` : '-'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {item.stock_uom || item.uom || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add New Item</h2>
              <button onClick={() => setShowAddModal(false)} style={styles.modalClose}>
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Item Code <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="item_code"
                  value={formData.item_code}
                  onChange={handleChange}
                  required
                  placeholder="e.g., ITEM-001"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Item Name <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="item_name"
                  value={formData.item_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Laptop"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Item Group <span style={styles.required}>*</span>
                </label>
                <select
                  name="item_group"
                  value={formData.item_group}
                  onChange={handleChange}
                  required
                  style={styles.select}
                >
                  <option value="">Select Item Group</option>
                  <option value="Products">Products</option>
                  <option value="Services">Services</option>
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="Finished Goods">Finished Goods</option>
                  <option value="Sub Assemblies">Sub Assemblies</option>
                </select>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Stock UOM <span style={styles.required}>*</span>
                  </label>
                  <select
                    name="stock_uom"
                    value={formData.stock_uom}
                    onChange={handleChange}
                    required
                    style={styles.select}
                  >
                    <option value="">Select UOM</option>
                    <option value="Nos">Nos</option>
                    <option value="Unit">Unit</option>
                    <option value="Kg">Kg</option>
                    <option value="Gram">Gram</option>
                    <option value="Liter">Liter</option>
                    <option value="Meter">Meter</option>
                    <option value="Box">Box</option>
                    <option value="Pack">Pack</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Opening Stock</label>
                  <input
                    type="number"
                    name="opening_stock"
                    value={formData.opening_stock}
                    onChange={handleChange}
                    placeholder="0"
                    step="1"
                    min="0"
                    style={styles.input}
                  />
                  <div style={styles.fieldNote}>Initial stock quantity</div>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Price List Rate (Standard Selling) <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    name="standard_rate"
                    value={formData.standard_rate}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                    step="0.01"
                    style={styles.input}
                  />
                  <div style={styles.fieldNote}>This will be added to Standard Selling price list</div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Is Stock Item?</label>
                  <select
                    name="is_stock_item"
                    value={formData.is_stock_item}
                    onChange={handleChange}
                    style={styles.select}
                  >
                    <option value={1}>Yes</option>
                    <option value={0}>No</option>
                  </select>
                  <div style={styles.fieldNote}>Can this item be tracked in inventory?</div>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter item description..."
                  rows={3}
                  style={styles.textarea}
                />
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={submitting ? styles.submitButtonDisabled : styles.submitButton}
                >
                  {submitting ? 'Creating...' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: any = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px',
    backgroundColor: '#f5f5f5',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #e0e0e0',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  errorCard: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    maxWidth: '400px',
  },
  errorIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
  errorTitle: {
    fontSize: '24px',
    color: '#333',
    marginBottom: '8px',
  },
  errorMessage: {
    color: '#666',
    marginBottom: '24px',
  },
  retryButton: {
    padding: '10px 24px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: '16px',
  },
  backLink: {
    display: 'inline-block',
    color: '#667eea',
    textDecoration: 'none',
    fontSize: '14px',
  },
  header: {
    maxWidth: '1200px',
    margin: '0 auto',
    marginBottom: '24px',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: '#667eea',
    textDecoration: 'none',
    marginBottom: '20px',
    padding: '8px 16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '32px',
    color: '#333',
    margin: 0,
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  statsBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
    minWidth: '60px',
  },
  statsNumber: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#667eea',
  },
  statsLabel: {
    fontSize: '10px',
    color: '#666',
    textTransform: 'uppercase',
  },
  addButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
  searchBar: {
    maxWidth: '1200px',
    margin: '0 auto 20px auto',
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '18px',
    color: '#999',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 48px',
    fontSize: '14px',
    border: '2px solid #94a3b8',
    borderRadius: '10px',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    backgroundColor: '#ffffff',
    color: '#1e293b',
  },
  clearButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#999',
    padding: '4px 8px',
  },
  resultsInfo: {
    maxWidth: '1200px',
    margin: '0 auto 16px auto',
    fontSize: '13px',
    color: '#666',
  },
  tableContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'auto',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #e0e0e0',
    fontWeight: '600',
    color: '#333',
    fontSize: '13px',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
    fontSize: '13px',
    color: '#555',
  },
  trEven: {
    backgroundColor: 'white',
  },
  trOdd: {
    backgroundColor: '#fafafa',
  },
  codeCell: {
    display: 'flex',
    alignItems: 'center',
  },
  codeBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: '#e8eaf6',
    color: '#5c6bc0',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  groupBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
  },
  quantityBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
  },
  rateCell: {
    fontWeight: '600',
    color: '#2e7d32',
  },
  noRateCell: {
    fontWeight: '500',
    color: '#ef4444',
    fontStyle: 'italic',
  },
  fieldNote: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '4px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '500px',
    margin: '40px auto',
  },
  emptyIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
  clearSearchButton: {
    marginTop: '16px',
    padding: '8px 20px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  modalTitle: {
    fontSize: '24px',
    color: '#333',
    margin: 0,
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
    padding: '4px 8px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#1e293b',
    fontSize: '14px',
  },
  required: {
    color: '#dc3545',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    border: '2px solid #94a3b8',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    border: '2px solid #94a3b8',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.3s ease',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontFamily: 'inherit',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    border: '2px solid #94a3b8',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    resize: 'vertical',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e0e0e0',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f1f3f4',
    color: '#333',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
  submitButton: {
    padding: '10px 20px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
  },
  submitButtonDisabled: {
    padding: '10px 20px',
    backgroundColor: '#cbd5e1',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '8px',
    cursor: 'not-allowed',
    fontSize: '14px',
    fontWeight: '500',
  },
};

// Add animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .back-button:hover {
      background-color: #667eea;
      color: white !important;
    }
    .add-button:hover {
      background-color: #218838;
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(40, 167, 69, 0.3);
    }
    tr:hover {
      background-color: #f0f0f0 !important;
      transition: background-color 0.2s ease;
    }
    input:focus, select:focus, textarea:focus {
      border-color: #667eea !important;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15) !important;
      outline: none !important;
    }
    input:hover:not(:focus), select:hover:not(:focus), textarea:hover:not(:focus) {
      border-color: #667eea !important;
    }
    input::placeholder, textarea::placeholder {
      color: #94a3b8;
      opacity: 1;
    }
    input:disabled, select:disabled, textarea:disabled {
      background-color: #f1f5f9 !important;
      color: #64748b !important;
      cursor: not-allowed !important;
      opacity: 0.7 !important;
    }
    input, select, textarea {
      background-color: #ffffff !important;
    }
    .cancel-button:hover {
      background-color: #e5e7eb;
      border-color: #9ca3af;
    }
    .submit-button:hover {
      background-color: #5a67d8;
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(102, 126, 234, 0.3);
    }
  `;
  document.head.appendChild(style);
}