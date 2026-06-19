'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '@/store/cart.store';
import { getItems } from '@/lib/services/item.service';
import { getCustomers } from '@/lib/services/customer.service';
import { createPOSInvoice } from '@/lib/services/invoice.service';
import { getRecentOrders } from '@/lib/services/dashboard.service';
import axios from 'axios';

// Toast Notification System
const useToast = () => {
  const [toasts, setToasts] = useState<any[]>([]);
  const counterRef = useRef(0);

  const toast = (message: string, type: string = 'info') => {
    const id = `toast-${Date.now()}-${counterRef.current++}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return { toast, toasts };
};

// Toast Container Component
function ToastContainer({ toasts }: { toasts: any[] }) {
  return (
    <div style={styles.toastContainer}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            ...styles.toast,
            backgroundColor:
              t.type === 'error'
                ? '#ff6b6b'
                : t.type === 'success'
                ? '#51cf66'
                : '#4dabf7',
          }}
        >
          {t.message}
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function POSPage() {
  const { toast, toasts } = useToast();
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
  const [selectedItemGroup, setSelectedItemGroup] = useState('');
  const [itemGroups, setItemGroups] = useState<string[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isCheckout, setIsCheckout] = useState(false);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState(0);
  const [changeAmount, setChangeAmount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [showRecentOrders, setShowRecentOrders] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [priceMap, setPriceMap] = useState<Map<string, number>>(new Map());
  const [priceLoading, setPriceLoading] = useState(true);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<any>(null);
  
  // NFC related states
  const [nfcStatus, setNfcStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scannedCardId, setScannedCardId] = useState('');
  const [selectedCustomerWallet, setSelectedCustomerWallet] = useState<any>(null);
  const externalReaderInputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<any>(null);
  const [isNfcSupported, setIsNfcSupported] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check NFC support (runs once on client)
  useEffect(() => {
    setIsNfcSupported('NDEFReader' in window);
  }, []);

  // Fetch items
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['items', search, selectedItemGroup],
    queryFn: () => getItems({ 
      params: { 
        filters: search ? `[["item_name","like","%${search}%"]]` : '[]',
        limit: 100,
        fields: '["name","item_code","item_name","stock_uom","item_group","standard_rate","description"]'
      } 
    }),
  });

  // Fetch customers
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  // Fetch customer wallets
  const { data: walletsData, isLoading: walletsLoading } = useQuery({
    queryKey: ['customer-wallets'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/proxy/customer-wallet', {
          params: {
            fields: '["name","customer","card_uid","wallet_balance","status","user","last_recharge_date"]',
            limit: 500,
          },
        });
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching wallets:', error);
        return [];
      }
    },
  });

  // Extract items from response - handle different data structures
  const items = itemsData?.data?.data || itemsData?.data || itemsData?.message || [];
  const customers = customersData?.data?.data || customersData?.data || customersData?.message || [];
  const wallets = walletsData || [];

  // Create wallet map for quick lookup
  const walletMap = useRef<Map<string, any>>(new Map());
  const walletByCustomerMap = useRef<Map<string, any>>(new Map());

  // Update wallet maps when wallets change
  useEffect(() => {
    const cardMap = new Map<string, any>();
    const customerMap = new Map<string, any>();
    
    wallets.forEach((wallet: any) => {
      // Map by card_uid
      if (wallet.card_uid) {
        cardMap.set(wallet.card_uid.trim(), {
          customerName: wallet.customer,
          wallet: wallet
        });
      }
      // Map by customer name
      if (wallet.customer) {
        customerMap.set(wallet.customer, wallet);
      }
    });
    
    walletMap.current = cardMap;
    walletByCustomerMap.current = customerMap;
    console.log('Wallet maps updated:', {
      byCard: cardMap.size,
      byCustomer: customerMap.size
    });
  }, [wallets]);

  // Fetch item prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setPriceLoading(true);
        const response = await axios.get('/api/proxy/item-prices');
        if (response.data?.data) {
          const map = new Map<string, number>();
          response.data.data.forEach((p: any) => {
            if (p.item_code && p.price_list_rate) {
              map.set(p.item_code, parseFloat(p.price_list_rate) || 0);
            }
          });
          setPriceMap(map);
          console.log('Price map created with', map.size, 'items');
        }
      } catch (error) {
        console.error('Error fetching item prices:', error);
      } finally {
        setPriceLoading(false);
      }
    };
    fetchPrices();
  }, []);

  // Extract unique item groups
  useEffect(() => {
    if (items && items.length > 0) {
      const groups = [...new Set(items.map((item: any) => item.item_group || 'Uncategorized').filter(Boolean))];
      setItemGroups(groups);
    }
  }, [items]);

  // Fetch recent orders
  const fetchRecentOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await getRecentOrders();
      const orders = response.data?.data || [];
      setRecentOrders(orders);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      setRecentOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentOrders();
  }, []);

  // Load customer wallet by customer name
  const loadCustomerWallet = (customerName: string) => {
    const wallet = walletByCustomerMap.current.get(customerName);
    if (wallet) {
      setSelectedCustomerWallet(wallet);
      console.log('Wallet loaded for customer:', customerName, wallet);
    } else {
      setSelectedCustomerWallet(null);
    }
  };

  // Load customer by card ID - NOW FETCHES FROM WALLET
  const loadCustomerByCardId = async (cardId: string) => {
    const trimmedCardId = String(cardId || '').trim();
    if (!trimmedCardId) return;

    setScannedCardId(trimmedCardId);

    // First, try to find the customer via wallet map
    const walletEntry = walletMap.current.get(trimmedCardId);
    
    if (walletEntry) {
      // Found the customer via wallet
      const customerName = walletEntry.customerName;
      const wallet = walletEntry.wallet;
      
      // Find the full customer details
      const foundCustomer = customers.find(
        (c: any) => c.name === customerName || c.customer_name === customerName
      );
      
      if (foundCustomer) {
        setCustomer(foundCustomer.name || foundCustomer.customer_name);
        setSelectedCustomerWallet(wallet);
        setNfcStatus('success');
        toast(`Customer ${foundCustomer.customer_name || foundCustomer.name} loaded via NFC! Balance: ₹${wallet.wallet_balance?.toFixed(2) || '0.00'}`, 'success');
      } else {
        // Customer exists in wallet but not in customer list
        setCustomer(customerName);
        setSelectedCustomerWallet(wallet);
        setNfcStatus('success');
        toast(`Customer ${customerName} loaded via NFC! Balance: ₹${wallet.wallet_balance?.toFixed(2) || '0.00'}`, 'success');
      }
    } else {
      // Fallback: Search through customers directly (for backwards compatibility)
      const foundCustomer = customers.find(
        (c: any) => c.card_id && c.card_id.trim() === trimmedCardId
      );

      if (foundCustomer) {
        setCustomer(foundCustomer.name || foundCustomer.customer_name);
        // Load wallet for this customer
        loadCustomerWallet(foundCustomer.name);
        setNfcStatus('success');
        toast(`Customer ${foundCustomer.customer_name || foundCustomer.name} loaded via NFC!`, 'success');
      } else {
        // Check if any wallet has this card_uid (in case map missed it)
        const walletByCard = wallets.find(
          (w: any) => w.card_uid && w.card_uid.trim() === trimmedCardId
        );
        
        if (walletByCard) {
          // Found via wallet direct lookup
          const customerName = walletByCard.customer;
          const foundCustomer = customers.find(
            (c: any) => c.name === customerName || c.customer_name === customerName
          );
          
          if (foundCustomer) {
            setCustomer(foundCustomer.name || foundCustomer.customer_name);
            setSelectedCustomerWallet(walletByCard);
            setNfcStatus('success');
            toast(`Customer ${foundCustomer.customer_name || foundCustomer.name} loaded via NFC! Balance: ₹${walletByCard.wallet_balance?.toFixed(2) || '0.00'}`, 'success');
          } else {
            setCustomer(customerName);
            setSelectedCustomerWallet(walletByCard);
            setNfcStatus('success');
            toast(`Customer ${customerName} loaded via NFC! Balance: ₹${walletByCard.wallet_balance?.toFixed(2) || '0.00'}`, 'success');
          }
        } else {
          setNfcStatus('error');
          toast('No customer found with this card ID.', 'error');
        }
      }
    }
  };

  // Start NFC scan
  const startNfcScan = async () => {
    if (!isNfcSupported) {
      toast('NFC not supported. Please use the external reader input or manual selection.', 'error');
      return;
    }

    try {
      setNfcStatus('scanning');
      toast('Scanning for NFC card...', 'info');

      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      ndef.onreading = (event: any) => {
        for (const record of event.message.records) {
          if (record.recordType === 'url') {
            const decoder = new TextDecoder();
            const url = decoder.decode(record.data);
            const id = url.split('/scan/')[1] || url;
            if (id) {
              loadCustomerByCardId(id.trim());
            }
          } else if (record.recordType === 'text') {
            const decoder = new TextDecoder();
            const text = decoder.decode(record.data);
            loadCustomerByCardId(text.trim());
          }
        }
      };

      ndef.onreadingerror = () => {
        setNfcStatus('error');
        toast('NFC read error. Please try again.', 'error');
      };

      readerRef.current = ndef;

      setTimeout(() => {
        if (nfcStatus === 'scanning') {
          setNfcStatus('idle');
          toast('NFC scan timed out. Please try again.', 'info');
        }
      }, 30000);

    } catch (err: any) {
      console.error('NFC scan error:', err);
      setNfcStatus('error');
      toast(err.message || 'NFC scan failed.', 'error');
    }
  };

  // Stop NFC scan
  const stopNfcScan = () => {
    if (readerRef.current) {
      readerRef.current.onreading = null;
      readerRef.current.onreadingerror = null;
      readerRef.current = null;
    }
    setNfcStatus('idle');
  };

  // Handle external reader input
  const handleExternalCardScanned = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const cardId = (e.target as HTMLInputElement).value;
      if (cardId.trim()) {
        loadCustomerByCardId(cardId.trim());
        setScannedCardId('');
        if (externalReaderInputRef.current) {
          externalReaderInputRef.current.value = '';
        }
      }
    }
  };

  // Get item display name
  const getItemDisplayName = (item: any) => {
    return item.item_name || item.name || item.item_code || 'Unnamed Item';
  };

  // Get item code
  const getItemCode = (item: any) => {
    return item.item_code || item.name || '';
  };

  const getItemPrice = (item: any) => {
    const itemCode = item.item_code || item.name;
    if (priceMap.has(itemCode)) {
      return priceMap.get(itemCode) || 0;
    }
    return parseFloat(item.standard_rate) || 0;
  };

  const handleAddItem = (item: any) => {
    if (!customer) {
      toast('Please select a customer first.', 'error');
      return;
    }
    const price = getItemPrice(item);
    const itemName = getItemDisplayName(item);
    const itemCode = getItemCode(item);
    
    addItem({
      item_code: itemCode,
      item_name: itemName,
      rate: price || 0,
      uom: item.stock_uom || 'Nos',
    });
    searchInputRef.current?.focus();
    toast(`${itemName} added to cart`, 'success');
  };

  const handleSubmit = async () => {
    if (!customer) { 
      toast('Please select a customer', 'error');
      return; 
    }
    if (cartItems.length === 0) { 
      toast('Cart is empty. Please add items.', 'error');
      return; 
    }

    // Calculate total with discount
    const subtotal = total();
    const discountAmount = (subtotal * (discount || 0)) / 100;
    const grandTotal = subtotal - discountAmount;

    // Use 'Default' POS Profile (or change to your actual POS Profile name)
    const posProfile = 'test'; // Change this to your POS Profile name

    const payload = {
      customer: customer,
      pos_profile: posProfile,
      items: cartItems.map((i) => ({
        item_code: i.item_code,
        qty: i.qty,
        rate: i.rate || 0,
      })),
      payments: [{ mode_of_payment: paymentMode, amount: grandTotal }],
      set_posting_date: new Date().toISOString().split('T')[0],
      additional_discount_percentage: discount || 0,
    };

    console.log('Submitting invoice payload:', payload);

    try {
      const response = await createPOSInvoice(payload);
      console.log('Invoice created:', response.data);
      
      toast('Invoice created successfully! 🎉', 'success');
      
      setLastCompletedOrder({
        id: response.data?.name || response.data?.data?.name || 'INV-001',
        customer: customer,
        total: grandTotal,
        items: cartItems,
        date: new Date().toISOString(),
      });
      setShowOrderConfirmation(true);
      
      clearCart();
      setDiscount(0);
      setIsCheckout(false);
      setPaidAmount(0);
      setChangeAmount(0);
      fetchRecentOrders();
      // Reset wallet selection after order
      setSelectedCustomerWallet(null);
    } catch (error: any) {
      console.error('Invoice error:', error);
      console.error('Error details:', error.response?.data);
      toast(error.response?.data?.error || 'Failed to create invoice', 'error');
    }
  };

  const filteredItems = items.filter((item: any) => {
    if (!selectedItemGroup) return true;
    return item.item_group === selectedItemGroup;
  });

  const handlePaymentAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    setPaidAmount(amount);
    const change = amount - total();
    setChangeAmount(change > 0 ? change : 0);
  };

  const isLoading = itemsLoading || priceLoading || walletsLoading;

  // Group items by category for display
  const groupedItems = filteredItems.reduce((acc: any, item: any) => {
    const group = item.item_group || 'Uncategorized';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  // Check if we have any items
  const hasItems = Object.keys(groupedItems).length > 0;

  return (
    <>
      <ToastContainer toasts={toasts} />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🛒 Point of Sale</h1>
            <p style={styles.subtitle}>Create invoices and manage sales</p>
          </div>
          <div style={styles.headerActions}>
            <button 
              onClick={() => setShowRecentOrders(!showRecentOrders)}
              style={styles.recentOrdersBtn}
            >
              📋 Recent Orders {recentOrders.length > 0 && `(${recentOrders.length})`}
            </button>
          </div>
        </div>

        <div style={styles.posContainer}>
          {/* Left Panel - Customer & Items */}
          <div style={styles.leftPanel}>
            {/* Customer Card */}
            <div style={styles.customerCard}>
              <div style={styles.customerCardHeader}>
                <div>
                  <div style={styles.customerCardTitle}>👤 Customer</div>
                  <div style={styles.customerCardSubtitle}>
                    Tap NFC card or select manually
                  </div>
                </div>
                <div style={styles.customerCardActions}>
                  {isNfcSupported && (
                    <button
                      onClick={startNfcScan}
                      style={{
                        ...styles.nfcBtn,
                        ...(nfcStatus === 'scanning' ? styles.nfcBtnScanning : {})
                      }}
                      disabled={nfcStatus === 'scanning'}
                    >
                      {nfcStatus === 'scanning' ? '⏳ Scanning...' : '📱 NFC'}
                    </button>
                  )}
                </div>
              </div>

              {/* NFC Status */}
              {nfcStatus === 'scanning' && (
                <div style={styles.nfcStatus}>
                  <span style={styles.nfcSpinner}></span>
                  <span>Waiting for NFC card...</span>
                  <button onClick={stopNfcScan} style={styles.nfcCancelBtn}>
                    Cancel
                  </button>
                </div>
              )}

              {/* External Reader Input */}
              <div style={styles.externalReaderSection}>
                <label style={styles.customerLabel}>External Reader Input</label>
                <input
                  ref={externalReaderInputRef}
                  type="text"
                  placeholder="Tap card on external reader..."
                  style={styles.externalReaderInput}
                  onKeyDown={handleExternalCardScanned}
                />
                <div style={styles.externalReaderHint}>
                  Keep cursor in this field and tap card. Press Enter to confirm.
                </div>
              </div>

              {/* Manual Customer Selector */}
              <div style={styles.customerSelector}>
                <label style={styles.customerLabel}>OR Manually Select Customer</label>
                <select
                  style={styles.customerSelect}
                  value={customer || ''}
                  onChange={(e) => {
                    const selectedCustomer = e.target.value;
                    setCustomer(selectedCustomer);
                    if (selectedCustomer) {
                      // Load wallet for selected customer
                      loadCustomerWallet(selectedCustomer);
                      toast('Customer selected successfully!', 'success');
                    } else {
                      setSelectedCustomerWallet(null);
                    }
                  }}
                >
                  <option value="">Select a customer...</option>
                  {customersLoading ? (
                    <option disabled>Loading customers...</option>
                  ) : (
                    customers.map((c: any) => (
                      <option key={c.name} value={c.name}>
                        {c.customer_name || c.name} ({c.name})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {customer && (
                <div style={styles.customerInfoGrid}>
                  <div style={styles.customerInfoCard}>
                    <div style={styles.customerInfoLabel}>Customer</div>
                    <div style={styles.customerInfoValue}>{customer}</div>
                  </div>
                  <div style={styles.customerInfoCard}>
                    <div style={styles.customerInfoLabel}>Status</div>
                    <div style={{...styles.customerInfoValue, color: '#10b981'}}>Active</div>
                  </div>
                  
                  {/* Wallet Balance */}
                  <div style={{...styles.customerInfoCard, gridColumn: 'span 1'}}>
                    <div style={styles.customerInfoLabel}>💰 Wallet Balance</div>
                    <div style={{
                      ...styles.customerInfoValue,
                      color: (selectedCustomerWallet?.wallet_balance || 0) > 0 ? '#10b981' : '#ef4444',
                      fontSize: '16px'
                    }}>
                      ₹{(selectedCustomerWallet?.wallet_balance || 0).toFixed(2)}
                    </div>
                  </div>
                  
                  {/* Wallet Status */}
                  {selectedCustomerWallet && (
                    <div style={styles.customerInfoCard}>
                      <div style={styles.customerInfoLabel}>Wallet Status</div>
                      <div style={{
                        ...styles.customerInfoValue,
                        color: selectedCustomerWallet.status === 'Active' ? '#10b981' : '#ef4444',
                        fontSize: '14px'
                      }}>
                        {selectedCustomerWallet.status || 'Unknown'}
                      </div>
                    </div>
                  )}
                  
                  {scannedCardId && (
                    <div style={{...styles.customerInfoCard, gridColumn: 'span 2'}}>
                      <div style={styles.customerInfoLabel}>Card ID</div>
                      <div style={{...styles.customerInfoValue, fontFamily: 'monospace', fontSize: '12px'}}>
                        {scannedCardId}
                      </div>
                    </div>
                  )}
                  
                  {/* Last Recharge Date */}
                  {selectedCustomerWallet?.last_recharge_date && (
                    <div style={{...styles.customerInfoCard, gridColumn: 'span 2'}}>
                      <div style={styles.customerInfoLabel}>Last Recharge</div>
                      <div style={{...styles.customerInfoValue, fontSize: '13px', color: '#64748b'}}>
                        {new Date(selectedCustomerWallet.last_recharge_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items Browser */}
            <div style={styles.itemsSection}>
              <div style={styles.itemsHeader}>
                <h2 style={styles.itemsTitle}>📦 Items</h2>
                <div style={styles.itemsControls}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search items..."
                    style={styles.searchInput}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {itemGroups.length > 0 && (
                    <select
                      style={styles.filterSelect}
                      value={selectedItemGroup}
                      onChange={(e) => setSelectedItemGroup(e.target.value)}
                    >
                      <option value="">All Groups</option>
                      {itemGroups.map((group) => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div style={styles.loadingState}>
                  <div style={styles.spinner}></div>
                  <p>Loading items & prices...</p>
                </div>
              ) : !hasItems ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>📦</div>
                  <p style={styles.emptyText}>No items found</p>
                  <p style={styles.emptySubtext}>Add items in Frappe to get started</p>
                </div>
              ) : (
                Object.keys(groupedItems).map((group) => (
                  <div key={group} style={styles.menuSection}>
                    <div style={styles.menuSectionTitle}>{group}</div>
                    <div style={styles.menuGrid}>
                      {groupedItems[group].map((item: any) => {
                        const price = getItemPrice(item);
                        const hasPrice = price > 0;
                        const displayName = getItemDisplayName(item);
                        const displayCode = getItemCode(item);
                        
                        return (
                          <button
                            key={item.name}
                            style={styles.menuItem}
                            onClick={() => handleAddItem(item)}
                            disabled={!customer}
                          >
                            <div style={styles.menuItemName}>{displayName}</div>
                            <div style={styles.menuItemCategory}>{displayCode}</div>
                            <div style={{
                              ...styles.menuItemPrice,
                              color: hasPrice ? '#10b981' : '#ef4444'
                            }}>
                              {hasPrice ? `₹${price.toFixed(2)}` : 'No Price'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Cart */}
          <div style={styles.rightPanel}>
            <div style={styles.cartCard}>
              <div style={styles.cartHeader}>
                <h2 style={styles.cartTitle}>🛒 Current Order</h2>
              </div>

              {cartItems.length === 0 ? (
                <div style={styles.emptyCart}>
                  <div style={styles.emptyCartIcon}>🛒</div>
                  <p style={styles.emptyCartText}>No items selected</p>
                  <p style={styles.emptyCartSubtext}>Select items from the menu</p>
                </div>
              ) : (
                <div style={styles.cartItems}>
                  {cartItems.map((item, index) => (
                    <div key={`${item.item_code}-${index}`} style={styles.cartItem}>
                      <div style={styles.cartItemInfo}>
                        <div style={styles.cartItemName}>{item.item_name || item.item_code}</div>
                        <div style={styles.cartItemPrice}>₹{item.rate.toFixed(2)} each</div>
                      </div>
                      <div style={styles.cartItemActions}>
                        <div style={styles.qtyControls}>
                          <button 
                            onClick={() => updateQty(item.item_code, item.qty - 1)}
                            style={styles.qtyBtn}
                          >
                            −
                          </button>
                          <span style={styles.qtyValue}>{item.qty}</span>
                          <button 
                            onClick={() => updateQty(item.item_code, item.qty + 1)}
                            style={styles.qtyBtn}
                          >
                            +
                          </button>
                        </div>
                        <div style={styles.cartItemTotal}>
                          ₹{(item.rate * item.qty).toFixed(2)}
                        </div>
                        <button 
                          onClick={() => removeItem(item.item_code)}
                          style={styles.removeBtn}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.cartSummary}>
                <div style={styles.summaryRow}>
                  <span>Total Items</span>
                  <span>{cartItems.reduce((sum, i) => sum + i.qty, 0)}</span>
                </div>
                {discount > 0 && (
                  <div style={styles.summaryRow}>
                    <span>Discount</span>
                    <span style={{ color: '#ef4444' }}>-{discount}%</span>
                  </div>
                )}
                <div style={{...styles.summaryRow, ...styles.totalRow}}>
                  <span>Total</span>
                  <span style={styles.totalValue}>₹{total().toFixed(2)}</span>
                </div>

                {!isCheckout ? (
                  <>
                    <button
                      onClick={() => setIsCheckout(true)}
                      style={{
                        ...styles.checkoutBtn,
                        ...(cartItems.length === 0 || !customer ? styles.checkoutBtnDisabled : {})
                      }}
                      disabled={cartItems.length === 0 || !customer}
                    >
                      {cartItems.length === 0 ? 'Add items to cart' : 
                       !customer ? 'Select a customer' : 
                       '💳 Proceed to Checkout'}
                    </button>
                    {cartItems.length > 0 && (
                      <>
                        <button
                          onClick={() => { clearCart(); setDiscount(0); }}
                          style={styles.clearBtn}
                        >
                          Clear Cart
                        </button>
                        <div style={styles.discountSection}>
                          <input
                            type="number"
                            style={styles.discountInput}
                            value={discount}
                            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                            placeholder="Discount %"
                            min="0"
                            max="100"
                          />
                          <span style={styles.discountLabel}>% Discount</span>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={styles.paymentSection}>
                    <div style={styles.paymentRow}>
                      <span style={styles.paymentLabel}>Payment Mode</span>
                      <select
                        style={styles.paymentSelect}
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <div style={styles.paymentRow}>
                      <span style={styles.paymentLabel}>Amount Paid</span>
                      <input
                        type="number"
                        style={styles.paymentInput}
                        value={paidAmount}
                        onChange={(e) => handlePaymentAmountChange(e.target.value)}
                        placeholder="Enter amount"
                      />
                    </div>
                    {changeAmount > 0 && (
                      <div style={styles.changeRow}>
                        <span style={styles.changeLabel}>Change</span>
                        <span style={styles.changeValue}>₹{changeAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={styles.paymentActions}>
                      <button
                        onClick={() => setIsCheckout(false)}
                        style={styles.cancelPaymentBtn}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        style={styles.confirmPaymentBtn}
                      >
                        💳 Pay & Invoice
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Orders */}
            <div style={styles.recentOrdersCard}>
              <div style={styles.recentOrdersHeader}>
                <span style={styles.recentOrdersTitle}>📋 Recent Orders</span>
              </div>
              {ordersLoading ? (
                <div style={styles.loadingText}>Loading orders...</div>
              ) : recentOrders.length === 0 ? (
                <div style={styles.noOrders}>No orders yet</div>
              ) : (
                recentOrders.map((order: any) => (
                  <div key={order.name} style={styles.recentOrderItem}>
                    <div>
                      <div style={styles.recentOrderName}>{order.name}</div>
                      <div style={styles.recentOrderCustomer}>{order.customer || 'Guest'}</div>
                      <div style={styles.recentOrderDate}>
                        {order.posting_date ? new Date(order.posting_date).toLocaleDateString() : ''}
                      </div>
                    </div>
                    <div style={styles.recentOrderTotal}>
                      ₹{order.grand_total?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Order Confirmation Modal */}
        {showOrderConfirmation && lastCompletedOrder && (
          <div style={styles.modalOverlay} onClick={() => setShowOrderConfirmation(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalSuccessIcon}>✓</div>
              <h2 style={styles.modalTitle}>Order Completed!</h2>
              <p style={styles.modalSubtitle}>Transaction successful</p>
              <div style={styles.modalDetails}>
                <div style={styles.modalDetailRow}>
                  <span>Order ID</span>
                  <span style={{ fontFamily: 'monospace' }}>{lastCompletedOrder.id}</span>
                </div>
                <div style={styles.modalDetailRow}>
                  <span>Customer</span>
                  <span>{lastCompletedOrder.customer}</span>
                </div>
                <div style={styles.modalDetailRow}>
                  <span>Items</span>
                  <span>{lastCompletedOrder.items.length}</span>
                </div>
                <div style={{...styles.modalDetailRow, ...styles.modalTotalRow}}>
                  <span>Total</span>
                  <span style={styles.modalTotalValue}>₹{lastCompletedOrder.total.toFixed(2)}</span>
                </div>
              </div>
              <div style={styles.modalActions}>
                <button
                  onClick={() => setShowOrderConfirmation(false)}
                  style={styles.modalCloseBtn}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowOrderConfirmation(false);
                    setCustomer('');
                    clearCart();
                    setSelectedCustomerWallet(null);
                  }}
                  style={styles.modalNewOrderBtn}
                >
                  New Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Keep the existing styles object (the updated one with darker inputs)
// ... styles remain the same as the previous update ...

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '36px 40px',
    maxWidth: '1600px',
    margin: '0 auto',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
  },
  title: {
    margin: '0 0 6px',
    fontFamily: 'Syne, sans-serif',
    fontSize: '28px',
    fontWeight: 800,
    color: '#1a1a2e',
  },
  subtitle: {
    margin: 0,
    color: '#666',
    fontSize: '15px',
    fontWeight: 500,
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  recentOrdersBtn: {
    padding: '10px 20px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.3s ease',
  },
  posContainer: {
    display: 'grid',
    gridTemplateColumns: '1.3fr 0.9fr',
    gap: '20px',
    alignItems: 'start',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  customerCard: {
    background: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  customerCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  customerCardTitle: {
    fontFamily: 'Syne, sans-serif',
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a1a2e',
  },
  customerCardSubtitle: {
    fontSize: '13px',
    color: '#666',
    marginTop: '4px',
    fontWeight: 500,
  },
  customerCardActions: {
    display: 'flex',
    gap: '8px',
  },
  nfcBtn: {
    padding: '8px 16px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    transition: 'all 0.3s ease',
  },
  nfcBtnScanning: {
    backgroundColor: '#f59e0b',
    animation: 'pulse 1s infinite',
  },
  nfcStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
    marginBottom: '12px',
    fontSize: '14px',
    color: '#92400e',
    fontWeight: 500,
  },
  nfcSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #f59e0b',
    borderTop: '2px solid #92400e',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  nfcCancelBtn: {
    marginLeft: 'auto',
    padding: '4px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #92400e',
    borderRadius: '6px',
    color: '#92400e',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
  },
  externalReaderSection: {
    marginBottom: '16px',
  },
  externalReaderInput: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '2px solid #94a3b8',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'monospace',
    fontWeight: 500,
    transition: 'all 0.3s ease',
  },
  externalReaderHint: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 500,
  },
  customerSelector: {
    marginBottom: '16px',
  },
  customerLabel: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#475569',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  customerSelect: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '2px solid #94a3b8',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.3s ease',
  },
  customerInfoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  customerInfoCard: {
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '14px',
    border: '1px solid #e2e8f0',
  },
  customerInfoLabel: {
    fontSize: '11px',
    color: '#64748b',
    marginBottom: '6px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  customerInfoValue: {
    color: '#0f172a',
    fontWeight: 700,
    wordBreak: 'break-all',
    fontSize: '14px',
  },
  itemsSection: {
    background: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  itemsHeader: {
    marginBottom: '16px',
  },
  itemsTitle: {
    fontFamily: 'Syne, sans-serif',
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: '12px',
  },
  itemsControls: {
    display: 'flex',
    gap: '12px',
  },
  searchInput: {
    flex: 1,
    padding: '12px 14px',
    borderRadius: '12px',
    border: '2px solid #94a3b8',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    fontWeight: 500,
    transition: 'all 0.3s ease',
  },
  filterSelect: {
    padding: '12px 14px',
    borderRadius: '12px',
    border: '2px solid #94a3b8',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
    minWidth: '150px',
    fontWeight: 500,
    transition: 'all 0.3s ease',
  },
  menuSection: {
    marginBottom: '16px',
  },
  menuSectionTitle: {
    fontFamily: 'Syne, sans-serif',
    fontSize: '16px',
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: '12px',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  menuItem: {
    border: '2px solid #e2e8f0',
    background: '#ffffff',
    borderRadius: '14px',
    padding: '16px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  menuItemName: {
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '4px',
    fontSize: '14px',
  },
  menuItemCategory: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 500,
  },
  menuItemPrice: {
    fontWeight: 700,
    marginTop: '8px',
    fontSize: '14px',
  },
  loadingState: {
    textAlign: 'center',
    padding: '40px 0',
    color: '#64748b',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 12px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 0',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0,
    fontWeight: 500,
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '4px 0 0 0',
    fontWeight: 500,
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  cartCard: {
    background: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '16px',
    padding: '20px',
    position: 'sticky',
    top: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  cartHeader: {
    marginBottom: '14px',
  },
  cartTitle: {
    fontFamily: 'Syne, sans-serif',
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a1a2e',
  },
  emptyCart: {
    padding: '18px',
    borderRadius: '12px',
    background: '#f8fafc',
    color: '#64748b',
    textAlign: 'center',
  },
  emptyCartIcon: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  emptyCartText: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0,
    fontWeight: 500,
  },
  emptyCartSubtext: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '4px 0 0 0',
    fontWeight: 500,
  },
  cartItems: {
    marginBottom: '16px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  cartItem: {
    borderBottom: '1px solid #e2e8f0',
    padding: '12px 0',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontWeight: 700,
    color: '#0f172a',
    fontSize: '14px',
  },
  cartItemPrice: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 500,
  },
  cartItemActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  qtyControls: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  qtyBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: '2px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  qtyValue: {
    minWidth: '24px',
    textAlign: 'center',
    fontWeight: 700,
    color: '#0f172a',
    fontSize: '14px',
  },
  cartItemTotal: {
    fontWeight: 700,
    color: '#10b981',
    minWidth: '60px',
    textAlign: 'right',
    fontSize: '14px',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px',
    fontWeight: 700,
  },
  cartSummary: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '14px',
    color: '#475569',
    fontWeight: 500,
  },
  totalRow: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '12px',
    marginTop: '8px',
    fontSize: '18px',
  },
  totalValue: {
    fontWeight: 700,
    color: '#10b981',
  },
  checkoutBtn: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '12px',
    transition: 'all 0.3s ease',
  },
  checkoutBtnDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  clearBtn: {
    width: '100%',
    padding: '10px',
    border: '2px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'all 0.3s ease',
  },
  discountSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
  },
  discountInput: {
    flex: 1,
    padding: '10px 14px',
    border: '2px solid #94a3b8',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    background: '#ffffff',
    color: '#1e293b',
    fontWeight: 500,
    transition: 'all 0.3s ease',
  },
  discountLabel: {
    fontSize: '13px',
    color: '#475569',
    fontWeight: 600,
  },
  paymentSection: {
    marginTop: '12px',
    padding: '16px',
    backgroundColor: '#f0f4ff',
    borderRadius: '12px',
    border: '1px solid #c7d2fe',
  },
  paymentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  paymentLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e293b',
    minWidth: '100px',
  },
  paymentSelect: {
    flex: 1,
    padding: '10px 14px',
    border: '2px solid #94a3b8',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    background: '#ffffff',
    color: '#1e293b',
    fontWeight: 500,
    transition: 'all 0.3s ease',
  },
  paymentInput: {
    flex: 1,
    padding: '10px 14px',
    border: '2px solid #94a3b8',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    background: '#ffffff',
    color: '#1e293b',
    fontWeight: 500,
    transition: 'all 0.3s ease',
  },
  changeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#d1fae5',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #6ee7b7',
  },
  changeLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#065f46',
  },
  changeValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#065f46',
  },
  paymentActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  cancelPaymentBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
    border: '2px solid #cbd5e1',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.3s ease',
  },
  confirmPaymentBtn: {
    flex: 2,
    padding: '12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.3s ease',
  },
  recentOrdersCard: {
    background: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  recentOrdersHeader: {
    marginBottom: '12px',
  },
  recentOrdersTitle: {
    fontFamily: 'Syne, sans-serif',
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a1a2e',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '14px',
    fontWeight: 500,
  },
  noOrders: {
    color: '#64748b',
    fontSize: '14px',
    fontWeight: 500,
  },
  recentOrderItem: {
    padding: '12px 0',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    alignItems: 'center',
  },
  recentOrderName: {
    fontWeight: 700,
    color: '#0f172a',
    fontSize: '14px',
  },
  recentOrderCustomer: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 500,
  },
  recentOrderDate: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '2px',
    fontWeight: 500,
  },
  recentOrderTotal: {
    fontWeight: 700,
    color: '#10b981',
    fontSize: '14px',
  },
  toastContainer: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  toast: {
    padding: '12px 16px',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    animation: 'slideIn 0.3s ease-out',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '20px',
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  modalSuccessIcon: {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '12px',
    color: '#10b981',
  },
  modalTitle: {
    margin: '0 0 8px',
    fontFamily: 'Syne, sans-serif',
    fontSize: '24px',
    fontWeight: 800,
    color: '#10b981',
    textAlign: 'center',
  },
  modalSubtitle: {
    margin: '0 0 20px',
    color: '#64748b',
    fontSize: '14px',
    textAlign: 'center',
    fontWeight: 500,
  },
  modalDetails: {
    background: '#f8fafc',
    borderRadius: '14px',
    padding: '18px',
    marginBottom: '20px',
    border: '1px solid #e2e8f0',
  },
  modalDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '13px',
    color: '#1e293b',
    fontWeight: 500,
  },
  modalTotalRow: {
    borderBottom: 'none',
    paddingTop: '12px',
    marginTop: '4px',
    fontSize: '16px',
  },
  modalTotalValue: {
    fontWeight: 700,
    color: '#10b981',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
  },
  modalCloseBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
    border: '2px solid #cbd5e1',
    borderRadius: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  modalNewOrderBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};