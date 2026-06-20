// app/customers/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Customer = {
  name: string;
  customer_name?: string;
  customer_type?: string;
  email_id?: string | null;
  mobile_no?: string | null;
};

type CustomerWallet = {
  name: string;
  customer: string;
  card_uid?: string | null;
  wallet_balance?: number;
  status?: string;
  user?: string | null;
  last_recharge_date?: string | null;
};

type CustomerWithWallet = Customer & {
  wallet: CustomerWallet | null;
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerWithWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithWallet | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_type: "Individual",
    email: "",
    mobile_no: "",
    card_uid: "",
  });

  const [assignData, setAssignData] = useState({
    card_uid: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch customers
      const customersResponse = await fetch('/api/proxy/customers', {
        credentials: 'include',
      });
      
      if (customersResponse.status === 401) {
        router.push('/login');
        return;
      }
      
      if (!customersResponse.ok) {
        const text = await customersResponse.text();
        console.error('Customers API error:', text);
        throw new Error(`Failed to fetch customers: ${customersResponse.status}`);
      }
      
      const customersData = await customersResponse.json();
      const customersList = customersData.data || [];
      console.log('Customers loaded:', customersList.length);
      
      // Fetch customer wallets
      const walletsResponse = await fetch('/api/proxy/customer-wallet', {
        credentials: 'include',
      });
      
      let walletsList: CustomerWallet[] = [];
      
      if (walletsResponse.ok) {
        const walletsData = await walletsResponse.json();
        walletsList = walletsData.data || [];
        console.log('Wallets loaded:', walletsList.length);
      } else {
        console.warn('Failed to fetch wallets:', walletsResponse.status);
        const errorText = await walletsResponse.text();
        console.warn('Wallet API error:', errorText);
      }
      
      // Create wallet map with case-insensitive matching
      const walletMap = new Map<string, CustomerWallet>();
      walletsList.forEach((wallet: CustomerWallet) => {
        if (wallet.customer) {
          walletMap.set(wallet.customer, wallet);
          walletMap.set(wallet.customer.toLowerCase(), wallet);
        }
      });
      
      // Merge customers with wallets
      const mergedCustomers: CustomerWithWallet[] = customersList.map((customer: Customer) => {
        let wallet = walletMap.get(customer.name) || walletMap.get(customer.name?.toLowerCase() || '');
        
        if (!wallet && customer.customer_name) {
          wallet = walletMap.get(customer.customer_name) || walletMap.get(customer.customer_name?.toLowerCase() || '');
        }
        
        return {
          ...customer,
          wallet: wallet || null
        };
      });
      
      setCustomers(mergedCustomers);
      setDebugInfo(`Customers: ${customersList.length}, Wallets: ${walletsList.length}, Merged: ${mergedCustomers.filter((c: CustomerWithWallet) => c.wallet).length} with wallets`);
      
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if card UID is already assigned to another customer
  const isCardAlreadyAssigned = (cardUid: string, excludeCustomerName?: string): boolean => {
    if (!cardUid || cardUid.trim() === '') return false;
    
    const trimmedCardUid = cardUid.trim();
    
    // Check if any customer (except the current one) has this card UID
    return customers.some((customer: CustomerWithWallet) => {
      // Skip the current customer if updating
      if (excludeCustomerName && customer.name === excludeCustomerName) {
        return false;
      }
      
      const customerCardUid = customer.wallet?.card_uid;
      if (!customerCardUid || customerCardUid.trim() === '' || customerCardUid === 'null') {
        return false;
      }
      
      return customerCardUid.trim() === trimmedCardUid;
    });
  };

  // Get customer who has this card assigned
  const getCustomerWithCard = (cardUid: string): CustomerWithWallet | null => {
    if (!cardUid || cardUid.trim() === '') return null;
    
    const trimmedCardUid = cardUid.trim();
    
    return customers.find((customer: CustomerWithWallet) => {
      const customerCardUid = customer.wallet?.card_uid;
      if (!customerCardUid || customerCardUid.trim() === '' || customerCardUid === 'null') {
        return false;
      }
      return customerCardUid.trim() === trimmedCardUid;
    }) || null;
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Check if card UID is already assigned to someone else
      if (formData.card_uid && formData.card_uid.trim() !== '') {
        const existingCustomer = getCustomerWithCard(formData.card_uid);
        if (existingCustomer) {
          alert(`❌ Card UID "${formData.card_uid}" is already assigned to customer: ${existingCustomer.customer_name || existingCustomer.name}`);
          setSubmitting(false);
          return;
        }
      }
      
      // Create customer
      const response = await fetch('/api/proxy/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customer_name: formData.customer_name,
          customer_type: formData.customer_type,
          email_id: formData.email,
          mobile_no: formData.mobile_no,
        }),
      });
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to create customer';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const customerData = await response.json();
      const newCustomer = customerData.data || customerData;
      const customerName = newCustomer.name || formData.customer_name;
      
      // If card_uid is provided, assign it to the wallet
      if (formData.card_uid && formData.card_uid.trim() !== '') {
        try {
          // First, get the wallet for this customer
          const walletResponse = await fetch(`/api/proxy/customer-wallet?filters=[["customer","=","${customerName}"]]`, {
            credentials: 'include',
          });
          
          if (walletResponse.ok) {
            const walletData = await walletResponse.json();
            const wallets = walletData.data || [];
            
            if (wallets.length > 0) {
              // Update existing wallet with card UID
              const walletId = wallets[0].name;
              const updateResponse = await fetch(`/api/proxy/customer-wallet?id=${walletId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  card_uid: formData.card_uid.trim(),
                }),
              });
              
              if (!updateResponse.ok) {
                console.warn('Failed to assign card during creation');
              } else {
                console.log('Card assigned to wallet');
              }
            }
          }
        } catch (cardError) {
          console.error('Error assigning card:', cardError);
          // Don't fail the customer creation if card assignment fails
        }
      }
      
      setFormData({
        customer_name: "",
        customer_type: "Individual",
        email: "",
        mobile_no: "",
        card_uid: "",
      });
      setShowAddModal(false);
      await loadData();
      alert('✅ Customer created successfully!');
    } catch (err: any) {
      console.error("Error creating customer:", err);
      setError(err.message || 'Failed to create customer');
      alert(`❌ ${err.message || 'Failed to create customer'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignCard = async () => {
    if (!selectedCustomer || !assignData.card_uid.trim()) {
      alert('Please select a customer and enter a card UID');
      return;
    }
    
    // Check if card UID is already assigned to another customer
    const existingCustomer = getCustomerWithCard(assignData.card_uid);
    if (existingCustomer && existingCustomer.name !== selectedCustomer.name) {
      alert(`❌ Card UID "${assignData.card_uid}" is already assigned to customer: ${existingCustomer.customer_name || existingCustomer.name}`);
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Get the wallet for this customer
      const walletResponse = await fetch(`/api/proxy/customer-wallet?filters=[["customer","=","${selectedCustomer.name}"]]`, {
        credentials: 'include',
      });
      
      if (!walletResponse.ok) {
        const errorText = await walletResponse.text();
        console.error('Wallet fetch error:', errorText);
        let errorMessage = 'Failed to find wallet for customer';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const walletData = await walletResponse.json();
      const wallets = walletData.data || [];
      
      if (wallets.length === 0) {
        throw new Error('No wallet found for this customer. Please create a wallet first.');
      }
      
      // Update wallet with card UID
      const walletId = wallets[0].name;
      const updateResponse = await fetch(`/api/proxy/customer-wallet?id=${walletId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          card_uid: assignData.card_uid.trim(),
        }),
      });
      
      // Check if response is ok before parsing JSON
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Update wallet error:', errorText);
        let errorMessage = 'Failed to assign card';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      // Try to parse JSON response
      try {
        const result = await updateResponse.json();
        console.log('Card assigned successfully:', result);
      } catch (parseError) {
        console.log('Card assigned successfully (no JSON response)');
      }
      
      setAssignData({ card_uid: "" });
      setShowAssignModal(false);
      setSelectedCustomer(null);
      await loadData();
      alert('✅ Card assigned successfully!');
    } catch (err: any) {
      console.error("Error assigning card:", err);
      setError(err.message || 'Failed to assign card');
      alert(`❌ ${err.message || 'Failed to assign card'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAssignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCardUid = e.target.value;
    setAssignData({
      ...assignData,
      [e.target.name]: newCardUid
    });
    
    // Real-time validation: check if the entered card is already assigned
    if (newCardUid.trim() !== '' && selectedCustomer) {
      const existingCustomer = getCustomerWithCard(newCardUid);
      if (existingCustomer && existingCustomer.name !== selectedCustomer.name) {
        // Show warning but don't block input
        console.warn(`Card "${newCardUid}" is already assigned to ${existingCustomer.customer_name || existingCustomer.name}`);
      }
    }
  };

  const handleNFCClick = (type: 'create' | 'assign') => {
    if (!('NDEFReader' in window)) {
      const uid = prompt('Web NFC is not supported. Enter Card UID manually:');
      if (uid?.trim()) {
        if (type === 'create') {
          // Check if card is already assigned
          const existingCustomer = getCustomerWithCard(uid);
          if (existingCustomer) {
            alert(`⚠️ Card UID "${uid}" is already assigned to: ${existingCustomer.customer_name || existingCustomer.name}`);
          }
          setFormData(prev => ({ ...prev, card_uid: uid.trim() }));
        } else {
          // Check if card is already assigned (excluding current customer)
          if (selectedCustomer) {
            const existingCustomer = getCustomerWithCard(uid);
            if (existingCustomer && existingCustomer.name !== selectedCustomer.name) {
              alert(`⚠️ Card UID "${uid}" is already assigned to: ${existingCustomer.customer_name || existingCustomer.name}`);
            }
          }
          setAssignData(prev => ({ ...prev, card_uid: uid.trim() }));
        }
      }
      return;
    }

    setIsScanning(true);
    
    try {
      const ndef = new (window as any).NDEFReader();
      ndef.scan().then(() => {
        ndef.onreading = (event: any) => {
          for (const record of event.message.records) {
            const decoder = new TextDecoder();
            let uid = '';
            
            if (record.recordType === 'url') {
              const url = decoder.decode(record.data);
              uid = (url.split('/scan/')[1] || url).trim();
            } else if (record.recordType === 'text') {
              uid = decoder.decode(record.data).trim();
            }
            
            if (uid) {
              setIsScanning(false);
              
              // Check if card is already assigned
              if (type === 'create') {
                const existingCustomer = getCustomerWithCard(uid);
                if (existingCustomer) {
                  alert(`⚠️ Card UID "${uid}" is already assigned to: ${existingCustomer.customer_name || existingCustomer.name}`);
                  // Still allow the user to use it if they want (they can override by typing manually)
                }
                setFormData(prev => ({ ...prev, card_uid: uid }));
              } else {
                if (selectedCustomer) {
                  const existingCustomer = getCustomerWithCard(uid);
                  if (existingCustomer && existingCustomer.name !== selectedCustomer.name) {
                    alert(`⚠️ Card UID "${uid}" is already assigned to: ${existingCustomer.customer_name || existingCustomer.name}`);
                  }
                }
                setAssignData(prev => ({ ...prev, card_uid: uid }));
              }
              alert('✅ Card scanned successfully!');
              return;
            }
          }
          setIsScanning(false);
          alert('Unsupported NFC record. Please enter UID manually.');
        };
        
        ndef.onreadingerror = () => {
          setIsScanning(false);
          alert('NFC read error. Please enter UID manually.');
        };
        
        setTimeout(() => {
          setIsScanning(false);
        }, 30000);
      }).catch((err: any) => {
        setIsScanning(false);
        alert(err?.message || 'NFC scan failed. Please enter UID manually.');
        const uid = prompt('Enter NFC Card UID manually:');
        if (uid?.trim()) {
          if (type === 'create') {
            const existingCustomer = getCustomerWithCard(uid);
            if (existingCustomer) {
              alert(`⚠️ Card UID "${uid}" is already assigned to: ${existingCustomer.customer_name || existingCustomer.name}`);
            }
            setFormData(prev => ({ ...prev, card_uid: uid.trim() }));
          } else {
            if (selectedCustomer) {
              const existingCustomer = getCustomerWithCard(uid);
              if (existingCustomer && existingCustomer.name !== selectedCustomer.name) {
                alert(`⚠️ Card UID "${uid}" is already assigned to: ${existingCustomer.customer_name || existingCustomer.name}`);
              }
            }
            setAssignData(prev => ({ ...prev, card_uid: uid.trim() }));
          }
        }
      });
    } catch (err: any) {
      setIsScanning(false);
      alert(err?.message || 'NFC scan failed. Please enter UID manually.');
      const uid = prompt('Enter NFC Card UID manually:');
      if (uid?.trim()) {
        if (type === 'create') {
          const existingCustomer = getCustomerWithCard(uid);
          if (existingCustomer) {
            alert(`⚠️ Card UID "${uid}" is already assigned to: ${existingCustomer.customer_name || existingCustomer.name}`);
          }
          setFormData(prev => ({ ...prev, card_uid: uid.trim() }));
        } else {
          if (selectedCustomer) {
            const existingCustomer = getCustomerWithCard(uid);
            if (existingCustomer && existingCustomer.name !== selectedCustomer.name) {
              alert(`⚠️ Card UID "${uid}" is already assigned to: ${existingCustomer.customer_name || existingCustomer.name}`);
            }
          }
          setAssignData(prev => ({ ...prev, card_uid: uid.trim() }));
        }
      }
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const filteredCustomers = customers.filter((customer: CustomerWithWallet) => {
    const search = searchTerm.toLowerCase();
    const name = customer.customer_name || customer.name || '';
    const email = customer.email_id || '';
    const mobile = customer.mobile_no || '';
    const cardUid = customer.wallet?.card_uid || '';
    const walletStatus = customer.wallet?.status || '';
    
    return (
      name.toLowerCase().includes(search) ||
      email.toLowerCase().includes(search) ||
      mobile.includes(search) ||
      cardUid.toLowerCase().includes(search) ||
      walletStatus.toLowerCase().includes(search)
    );
  });

  // Calculate stats - FIXED: Added explicit types to all callbacks
  const totalCustomers = customers.length;
  const customersWithCard = customers.filter((c: CustomerWithWallet) => c.wallet?.card_uid && c.wallet.card_uid.trim() !== '' && c.wallet.card_uid !== 'null').length;
  const totalWalletBalance = customers.reduce((sum: number, c: CustomerWithWallet) => sum + (c.wallet?.wallet_balance || 0), 0);
  const activeWallets = customers.filter((c: CustomerWithWallet) => c.wallet?.status === 'Active').length;
  const customersWithoutCard = customers.filter((c: CustomerWithWallet) => !c.wallet?.card_uid || c.wallet.card_uid.trim() === '' || c.wallet.card_uid === 'null');

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading customers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <span style={styles.errorIcon}>⚠️</span>
          <h3 style={styles.errorTitle}>Error Loading Customers</h3>
          <p style={styles.errorMessage}>{error}</p>
          <button onClick={loadData} style={styles.retryButton}>
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
            <h1 style={styles.title}>👥 Customers</h1>
            <p style={styles.subtitle}>Manage your customer relationships and wallets</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={() => setShowAddModal(true)} style={styles.addButton}>
              + Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <div style={styles.debugBar}>
          <span style={styles.debugIcon}>🔍</span>
          <span style={styles.debugText}>{debugInfo}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👥</div>
          <div>
            <div style={styles.statLabel}>Total Customers</div>
            <div style={styles.statValue}>{totalCustomers}</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>💳</div>
          <div>
            <div style={styles.statLabel}>Cards Assigned</div>
            <div style={styles.statValue}>{customersWithCard}</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div>
            <div style={styles.statLabel}>Total Balance</div>
            <div style={styles.statValue}>₹{totalWalletBalance.toFixed(2)}</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>✅</div>
          <div>
            <div style={styles.statLabel}>Active Wallets</div>
            <div style={styles.statValue}>{activeWallets}</div>
          </div>
        </div>
      </div>

      {/* Alert for customers without cards */}
      {customersWithoutCard.length > 0 && (
        <div style={styles.alertSection}>
          <div style={styles.alertHeader}>
            <span style={styles.alertIcon}>⚠️</span>
            <span style={styles.alertTitle}>
              {customersWithoutCard.length} customer(s) don't have a card assigned
            </span>
          </div>
          <div style={styles.alertList}>
            {customersWithoutCard.slice(0, 5).map((c: CustomerWithWallet) => (
              <span key={c.name} style={styles.alertTag}>
                {c.customer_name || c.name}
              </span>
            ))}
            {customersWithoutCard.length > 5 && (
              <span style={styles.alertMore}>
                +{customersWithoutCard.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search Bar */}
      {customers.length > 0 && (
        <div style={styles.searchBar}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search customers by name, email, mobile, card UID or status..."
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

      {filteredCustomers.length === 0 ? (
        <div style={styles.emptyState}>
          {searchTerm ? (
            <>
              <span style={styles.emptyIcon}>🔍</span>
              <h3>No matching customers found</h3>
              <p>Try adjusting your search terms</p>
              <button onClick={() => setSearchTerm("")} style={styles.clearSearchButton}>
                Clear Search
              </button>
            </>
          ) : (
            <>
              <span style={styles.emptyIcon}>👥</span>
              <h3>No Customers Found</h3>
              <p>Click the "Add Customer" button to create your first customer.</p>
              <button onClick={() => setShowAddModal(true)} style={styles.clearSearchButton}>
                + Add Your First Customer
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div style={styles.resultsInfo}>
            Showing {filteredCustomers.length} of {customers.length} customers
          </div>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Customer Name</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Mobile</th>
                  <th style={styles.th}>Card UID</th>
                  <th style={styles.th}>Wallet Balance</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Last Recharge</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer: CustomerWithWallet, index: number) => {
                  const hasCard = customer.wallet?.card_uid && customer.wallet.card_uid.trim() !== '' && customer.wallet.card_uid !== 'null';
                  const cardUidDisplay = customer.wallet?.card_uid || '-';
                  const shortCardUid = cardUidDisplay !== '-' && cardUidDisplay.length > 12
                    ? `${cardUidDisplay.slice(0, 12)}...`
                    : cardUidDisplay;

                  return (
                    <tr key={customer.name || index} style={index % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{index + 1}</td>
                      <td style={{ ...styles.td, fontWeight: 500 }}>
                        {customer.customer_name || customer.name}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: customer.customer_type === 'Company' ? '#e0e7ff' : '#fef3c7',
                          color: customer.customer_type === 'Company' ? '#4338ca' : '#92400e',
                        }}>
                          {customer.customer_type || 'Individual'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {customer.email_id ? (
                          <a href={`mailto:${customer.email_id}`} style={styles.emailLink}>
                            {customer.email_id}
                          </a>
                        ) : (
                          <span style={styles.emptyValue}>-</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {customer.mobile_no ? (
                          <a href={`tel:${customer.mobile_no}`} style={styles.phoneLink}>
                            {customer.mobile_no}
                          </a>
                        ) : (
                          <span style={styles.emptyValue}>-</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {hasCard ? (
                          <span style={{
                            ...styles.badge,
                            backgroundColor: '#d1fae5',
                            color: '#065f46',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                          }}>
                            {shortCardUid}
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '12px' }}>
                            ❌ No Card
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: (customer.wallet?.wallet_balance || 0) > 0 ? '#e0e7ff' : '#f3f4f6',
                          color: (customer.wallet?.wallet_balance || 0) > 0 ? '#4338ca' : '#666',
                        }}>
                          ₹{(customer.wallet?.wallet_balance || 0).toFixed(2)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: customer.wallet?.status === 'Active' ? '#d1fae5' : '#fef3c7',
                          color: customer.wallet?.status === 'Active' ? '#065f46' : '#92400e',
                        }}>
                          {customer.wallet?.status || 'No Wallet'}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontSize: '12px', color: '#666' }}>
                        {formatDate(customer.wallet?.last_recharge_date)}
                      </td>
                      <td style={styles.td}>
                        {!hasCard ? (
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setAssignData({ card_uid: "" });
                              setShowAssignModal(true);
                            }}
                            style={styles.assignButton}
                          >
                            Assign Card
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setAssignData({ card_uid: customer.wallet?.card_uid || "" });
                              setShowAssignModal(true);
                            }}
                            style={styles.updateButton}
                          >
                            Update Card
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add New Customer</h2>
              <button onClick={() => setShowAddModal(false)} style={styles.modalClose}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Customer Name <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter customer name"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Customer Type <span style={styles.required}>*</span>
                </label>
                <select
                  name="customer_type"
                  value={formData.customer_type}
                  onChange={handleChange}
                  required
                  style={styles.select}
                >
                  <option value="Individual">Individual</option>
                  <option value="Company">Company</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="customer@example.com"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Mobile</label>
                <input
                  type="text"
                  name="mobile_no"
                  value={formData.mobile_no}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>NFC Card UID</label>
                <div style={styles.nfcContainer}>
                  <input
                    type="text"
                    name="card_uid"
                    value={formData.card_uid}
                    onChange={handleChange}
                    placeholder="Tap NFC card or enter UID"
                    disabled={isScanning}
                    style={{ ...styles.input, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => handleNFCClick('create')}
                    style={styles.nfcButton}
                    disabled={isScanning}
                  >
                    {isScanning ? '⏳ Scanning...' : '📱 Scan'}
                  </button>
                </div>
                <div style={styles.fieldNote}>
                  {isScanning
                    ? 'Hold NFC card near the device...'
                    : 'Optional - Click scan to read NFC card or enter UID manually'}
                </div>
                {formData.card_uid && getCustomerWithCard(formData.card_uid) && (
                  <div style={styles.warningText}>
                    ⚠️ This card is already assigned to: {getCustomerWithCard(formData.card_uid)?.customer_name || getCustomerWithCard(formData.card_uid)?.name}
                  </div>
                )}
              </div>

              <div style={styles.formInfo}>
                <span style={styles.infoIcon}>ℹ️</span>
                <span style={styles.infoText}>
                  A Customer Wallet will be automatically created for this customer with:
                  <br />
                  • Status: <strong>Active</strong>
                  <br />
                  • Balance: <strong>₹0.00</strong>
                  {formData.card_uid && (
                    <>
                      <br />
                      • Card UID: <strong>{formData.card_uid}</strong>
                    </>
                  )}
                </span>
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
                  {submitting ? 'Creating...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Card Modal */}
      {showAssignModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {selectedCustomer?.wallet?.card_uid ? 'Update Card' : 'Assign Card'}
              </h2>
              <button onClick={() => setShowAssignModal(false)} style={styles.modalClose}>
                ✕
              </button>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Selected Customer</label>
              <input
                type="text"
                style={{
                  ...styles.input,
                  backgroundColor: '#f3f4f6',
                  cursor: 'not-allowed',
                }}
                value={selectedCustomer?.customer_name || selectedCustomer?.name || ''}
                disabled
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Card UID <span style={styles.required}>*</span>
              </label>
              <div style={styles.nfcContainer}>
                <input
                  type="text"
                  name="card_uid"
                  value={assignData.card_uid}
                  onChange={handleAssignChange}
                  placeholder="Enter or scan Card UID"
                  disabled={isScanning}
                  style={{ ...styles.input, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => handleNFCClick('assign')}
                  style={styles.nfcButton}
                  disabled={isScanning}
                >
                  {isScanning ? '⏳ Scanning...' : '📱 Scan'}
                </button>
              </div>
              <div style={styles.fieldNote}>
                {isScanning
                  ? 'Hold NFC card near the device...'
                  : 'Tap scan to read NFC card or enter UID manually'}
              </div>
              {assignData.card_uid && selectedCustomer && getCustomerWithCard(assignData.card_uid) && getCustomerWithCard(assignData.card_uid)?.name !== selectedCustomer.name && (
                <div style={styles.warningText}>
                  ⚠️ This card is already assigned to: {getCustomerWithCard(assignData.card_uid)?.customer_name || getCustomerWithCard(assignData.card_uid)?.name}
                </div>
              )}
            </div>

            {selectedCustomer?.wallet && (
              <div style={styles.walletInfo}>
                <div style={styles.walletInfoRow}>
                  <span style={styles.walletInfoLabel}>Current Balance:</span>
                  <span style={styles.walletInfoValue}>₹{selectedCustomer.wallet.wallet_balance?.toFixed(2) || '0.00'}</span>
                </div>
                <div style={styles.walletInfoRow}>
                  <span style={styles.walletInfoLabel}>Status:</span>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: selectedCustomer.wallet.status === 'Active' ? '#d1fae5' : '#fef3c7',
                    color: selectedCustomer.wallet.status === 'Active' ? '#065f46' : '#92400e',
                  }}>
                    {selectedCustomer.wallet.status || 'Unknown'}
                  </span>
                </div>
              </div>
            )}

            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignCard}
                disabled={submitting || !assignData.card_uid.trim()}
                style={submitting || !assignData.card_uid.trim() ? styles.submitButtonDisabled : styles.submitButton}
              >
                {submitting ? 'Assigning...' : selectedCustomer?.wallet?.card_uid ? 'Update Card' : 'Assign Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// app/customers/page.tsx - Updated Styles Section

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
  debugBar: {
    maxWidth: '1200px',
    margin: '0 auto 16px auto',
    padding: '8px 16px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  debugIcon: {
    fontSize: '14px',
  },
  debugText: {
    fontSize: '13px',
    color: '#0369a1',
    fontFamily: 'monospace',
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
  statsContainer: {
    maxWidth: '1200px',
    margin: '0 auto 24px auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statIcon: {
    fontSize: '32px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a2e',
    marginTop: '4px',
  },
  alertSection: {
    maxWidth: '1200px',
    margin: '0 auto 24px auto',
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '12px',
    padding: '16px 20px',
  },
  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  alertIcon: {
    fontSize: '20px',
  },
  alertTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#92400e',
  },
  alertList: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  alertTag: {
    padding: '4px 12px',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#92400e',
  },
  alertMore: {
    fontSize: '12px',
    color: '#92400e',
    padding: '4px 8px',
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
  badge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '500',
    display: 'inline-block',
  },
  assignButton: {
    padding: '6px 12px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
  updateButton: {
    padding: '6px 12px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
  emailLink: {
    color: '#667eea',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  },
  phoneLink: {
    color: '#667eea',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  },
  emptyValue: {
    color: '#999',
  },
  warningText: {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '4px',
    fontWeight: '500',
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
    maxWidth: '550px',
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
  nfcContainer: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  nfcButton: {
    padding: '12px 20px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap',
    minWidth: '90px',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
  },
  fieldNote: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '4px',
  },
  formInfo: {
    backgroundColor: '#e0f2fe',
    border: '1px solid #38bdf8',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  infoIcon: {
    fontSize: '18px',
    display: 'inline-block',
    marginRight: '8px',
  },
  infoText: {
    fontSize: '13px',
    color: '#0369a1',
    lineHeight: '1.6',
  },
  walletInfo: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  walletInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
  },
  walletInfoLabel: {
    fontSize: '13px',
    color: '#64748b',
  },
  walletInfoValue: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1e293b',
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

// Update the CSS styles for input focus and hover
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
    
    /* Input focus styles */
    input:focus, select:focus, textarea:focus {
      border-color: #667eea !important;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15) !important;
      outline: none !important;
    }
    
    /* Input hover styles */
    input:hover:not(:focus), select:hover:not(:focus), textarea:hover:not(:focus) {
      border-color: #667eea !important;
    }
    
    /* Input placeholder styles */
    input::placeholder, textarea::placeholder {
      color: #94a3b8;
      opacity: 1;
    }
    
    /* Input disabled styles */
    input:disabled, select:disabled, textarea:disabled {
      background-color: #f1f5f9 !important;
      color: #64748b !important;
      cursor: not-allowed !important;
      opacity: 0.7 !important;
    }
    
    /* Dark mode input background for better visibility */
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
    .email-link:hover, .phone-link:hover {
      color: #5a67d8 !important;
      text-decoration: underline !important;
    }
    .assign-button:hover {
      background-color: #5a67d8;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
    }
    .update-button:hover {
      background-color: #d97706;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
    }
    .nfc-button:hover {
      background-color: #5a67d8;
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(102, 126, 234, 0.3);
    }
    .nfc-button:disabled, .assign-button:disabled, .update-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }
  `;
  document.head.appendChild(style);
}