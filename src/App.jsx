import emailjs from '@emailjs/browser';
// import { products as initialProducts } from './data/products';
import { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Eye,
  EyeOff,
  X,
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Plus,
  Download,
  Upload,
  Trash2,
  Search,
  ShoppingCart as CartIcon,
  TrendingUp,
  CreditCard,
  History,
  Store,
  Printer,
  Settings,
  LogOut,
  ChevronUp,
  Moon,
  Sun,
  Loader2,
  AlertCircle,
  RefreshCcw,
  Edit,
  Users,
  Clock,
  Check
} from 'lucide-react';
import './App.css';
import { supabase } from './supabaseClient';

// --- IndexedDB Core ---
const DB_NAME = 'FreshPOS_DB';
const DB_VERSION = 1;

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pos_data')) db.createObjectStore('pos_data');
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

const db = {
  get: async (key) => {
    try {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction('pos_data', 'readonly');
        const store = tx.objectStore('pos_data');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
      });
    } catch (err) {
      console.error(`DB Get Error [${key}]:`, err);
      return null;
    }
  },
  set: async (key, val) => {
    try {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction('pos_data', 'readwrite');
        const store = tx.objectStore('pos_data');
        const req = store.put(val, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
      });
    } catch (err) {
      console.error(`DB Set Error [${key}]:`, err);
      throw err;
    }
  },
  clear: async () => {
    try {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction('pos_data', 'readwrite');
        const store = tx.objectStore('pos_data');
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('DB Clear Error:', err);
      throw err;
    }
  }
};

import {
  validateBarcode,
  validateProductName,
  validatePrice,
  validateUsername,
  validatePassword,
  validateQuantity,
  validateCategory,
  getPasswordStrength,
  generateCSRFToken,
  auditLogger,
  loginRateLimiter
} from './utils/security';

function App() {
  useEffect(() => { emailjs.init('c0zc4zxCJrfMnM5As'); }, []);

  // --- App States ---
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([
    { username: 'admin', password: 'Admin@12345', role: 'admin', mustChangePassword: true, email: '' }
  ]);
  const [birSettings, setBirSettings] = useState({ enabled: false, tin: '', ptu: '', min: '' });
  const [storeProfile, setStoreProfile] = useState({
    name: 'FRESH GROCERY',
    address: '123 Market St. Manila, PH',
    tel: '(02) 8888-0000',
    gcashNumber: '',
    mayaNumber: '',
    gcashQR: null,
    mayaQR: null,
    enableCRM: false,
    taxMode: 'inclusive'
  });
  const [isResetting, setIsResetting] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState([]);
  const [isSeniorSale, setIsSeniorSale] = useState(false);
  const [isVatSale, setIsVatSale] = useState(true);
  const [seniorInfo, setSeniorInfo] = useState({ id: '', name: '' });

  const [allocatedCustomer, setAllocatedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerTabSearch, setCustomerTabSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [showInvoice, setShowInvoice] = useState(false);
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [variantSelectModal, setVariantSelectModal] = useState({ show: false, product: null, quantity: 1, shouldRedirect: false });
  const [inventorySearch, setInventorySearch] = useState('');
  const [newProduct, setNewProduct] = useState({ barcode: '', name: '', price: '', costPrice: '', category: '', unit: 'ea', stock: '', minStock: '5', isVatExempt: false, image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80', variants: [] });
  const [printState, setPrintState] = useState('receipt');
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);
  const [authView, setAuthView] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [resetForm, setResetForm] = useState({ email: '', newPassword: '', confirmPassword: '' });
  const [validationErrors, setValidationErrors] = useState({});
  const [toasts, setToasts] = useState([]);
  const [scanFlash, setScanFlash] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [cashReceived, setCashReceived] = useState('');
  const [cashlessRef, setCashlessRef] = useState('');
  const [cardNetwork, setCardNetwork] = useState('Visa');
  const [last4, setLast4] = useState('');
  const [isSelectingCashless, setIsSelectingCashless] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [promptModal, setPromptModal] = useState(null);
  const [promptValue, setPromptValue] = useState('');
  const [reportDateFilter, setReportDateFilter] = useState('all');
  const [reportPaymentFilter, setReportPaymentFilter] = useState('all');
  const [reportCashierFilter, setReportCashierFilter] = useState('all');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [loginAttemptWarning, setLoginAttemptWarning] = useState(null);
  const [csrfToken] = useState(generateCSRFToken());
  const [dashboardTimePeriod, setDashboardTimePeriod] = useState('day'); // 'day', 'week', 'month'
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const syncAllToCloud = async () => {
    if (!navigator.onLine) return;
    try {
      showToast('🔄 Synchronizing data to cloud...', 'info');
      const [localProducts, localTransactions, localUsers, localCustomers, localProfile, localTimeLogs] = await Promise.all([
        db.get('products'), db.get('transactions'), db.get('users'),
        db.get('customers'), db.get('store_profile'), db.get('time_logs')
      ]);

      const syncTasks = [];
      if (localProducts?.length) syncTasks.push(supabase.from('products').upsert(localProducts.map(p => ({
        barcode: p.barcode,
        name: p.name,
        price: parseFloat(p.price) || 0,
        cost_price: parseFloat(p.costPrice) || 0,
        category: p.category,
        stock: parseInt(p.stock) || 0,
        unit: p.unit || 'ea',
        is_vat_exempt: !!p.isVatExempt
      })), { onConflict: 'barcode' }));

      if (localTransactions?.length) syncTasks.push(supabase.from('transactions').upsert(localTransactions.map(t => ({
        id: t.id,
        date: t.date,
        items: t.items,
        total: parseFloat(t.total) || 0,
        tax: parseFloat(t.tax) || 0,
        discount: parseFloat(t.discount) || 0,
        vatable_sales: parseFloat(t.vatableSales) || 0,
        vat_exempt_sales: parseFloat(t.vatExemptSales) || 0,
        payment_method: t.paymentMethod,
        cashier: t.cashier,
        status: t.status || 'paid',
        senior_info: t.seniorInfo || null
      })), { onConflict: 'id' }));

      if (localUsers?.length) syncTasks.push(supabase.from('users').upsert(localUsers.map(u => ({
        username: u.username,
        password: u.password,
        role: u.role,
        must_change_password: !!u.mustChangePassword,
        email: u.email,
        swipe_id: u.swipeId
      })), { onConflict: 'username' }));

      if (localCustomers?.length) syncTasks.push(supabase.from('customers').upsert(localCustomers, { onConflict: 'id' }));

      if (localProfile) syncTasks.push(supabase.from('store_profile').upsert({
        id: 1,
        name: localProfile.name,
        address: localProfile.address,
        tel: localProfile.tel,
        tax_mode: localProfile.taxMode,
        enable_crm: !!localProfile.enableCRM
      }));

      await Promise.all(syncTasks);
      showToast('✅ Cloud Sync Complete!', 'success');
    } catch (err) {
      console.error('Manual Sync Failed:', err);
    }
  };

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncAllToCloud(); };
    const handleOffline = () => { setIsOnline(false); showToast('🔌 System Offline. Data will be saved locally.', 'warning'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Trial & License Engine ---
  const TRIAL_DAYS = 7;
  const [installDate] = useState(() => {
    const saved = localStorage.getItem('pos_install_date');
    if (saved) return parseInt(saved, 10);
    const now = Date.now();
    localStorage.setItem('pos_install_date', now.toString());
    return now;
  });

  const [machineId] = useState(() => {
    const saved = localStorage.getItem('pos_machine_id');
    if (saved) return saved;
    const hash = installDate.toString(16).toUpperCase().slice(-8);
    const formatted = `${hash.slice(0, 4)}-${hash.slice(4, 8)}`;
    localStorage.setItem('pos_machine_id', formatted);
    return formatted;
  });

  const [isLicensed, setIsLicensed] = useState(() => localStorage.getItem('pos_is_licensed') === 'true');
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseError, setLicenseError] = useState('');

  const msRemaining = (installDate + (TRIAL_DAYS * 24 * 60 * 60 * 1000)) - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const isTrialExpired = !isLicensed && msRemaining <= 0;

  const validateLicense = (input) => {
    const cleanInput = input.trim().toUpperCase();
    const expectedKey = `FPOS-PR1-${machineId}`;
    return cleanInput === expectedKey;
  };

  const [forceChangeUser, setForceChangeUser] = useState(null);
  const [forceChangeStep, setForceChangeStep] = useState('change');
  const [forceChangeForm, setForceChangeForm] = useState({ newPassword: '', confirmPassword: '', email: '' });
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [forceChangeError, setForceChangeError] = useState('');
  const [forceChangePwStrength, setForceChangePwStrength] = useState(0);

  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('pos_theme') !== 'light');
  const [settingsForm, setSettingsForm] = useState({ username: '', password: '', birEnabled: false, tin: '', ptu: '', min: '' });
  const [storeForm, setStoreForm] = useState({ name: '', address: '', tel: '', gcashNumber: '', mayaNumber: '', gcashQR: null, mayaQR: null, enableCRM: false });
  const [isUploadingQR, setIsUploadingQR] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', role: 'cashier', swipeId: '' });
  const [showConfirmSettings, setShowConfirmSettings] = useState(false);
  const [confirmSettingsPassword, setConfirmSettingsPassword] = useState('');
  const [confirmSettingsShowPw, setConfirmSettingsShowPw] = useState(false);
  const [confirmSettingsError, setConfirmSettingsError] = useState('');
  const [pendingSettingsData, setPendingSettingsData] = useState(null);
  const [voidApproval, setVoidApproval] = useState(null);
  const [voidApprovalForm, setVoidApprovalForm] = useState({ username: '', password: '', swipeId: '' });
  const [passwordStrength, setPasswordStrength] = useState(0);

  const compressImage = (base64Str, maxWidth = 250) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const aspect = img.height / img.width;
        canvas.width = maxWidth;
        canvas.height = maxWidth * aspect;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const fileInputRef = useRef(null);
  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: '💵' },
    { id: 'credit_card', name: 'Credit Card', icon: '💳' },
    { id: 'debit_card', name: 'Debit Card', icon: '💳' },
    { id: 'gcash', name: 'GCash', icon: '📱' },
    { id: 'maya', name: 'Maya', icon: '📱' },
    { id: 'qr_ph', name: 'QR PH', icon: '📲' }
  ];

  // --- Cloud Synchronization (Supabase) ---
  useEffect(() => {
    const initializeAppData = async () => {
      try {
        // 1. Fetch all data from Cloud (Supabase)
        const [
          { data: dbProducts }, { data: dbTransactions }, { data: dbUsers },
          { data: dbProfileRows }, { data: dbCustomers }, { data: dbTimeLogs }
        ] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('transactions').select('*').order('date', { ascending: false }),
          supabase.from('users').select('*'),
          supabase.from('store_profile').select('*').eq('id', 1),
          supabase.from('customers').select('*'),
          supabase.from('time_logs').select('*')
        ]);

        const dbProfile = dbProfileRows?.[0] || null;

        // 2. Check if cloud has data. If not, try to Push local data up (Migration)
        const isCloudEmpty = !dbProducts?.length && !dbTransactions?.length;

        if (isCloudEmpty) {
          const [localProducts, localTransactions, localUsers, localProfile, localBIR, localFavs, localCustomers, localTimeLogs] = await Promise.all([
            db.get('products'), db.get('transactions'), db.get('users'),
            db.get('store_profile'), db.get('bir_settings'), db.get('favorites'),
            db.get('customers'), db.get('time_logs')
          ]);

          if (localProducts?.length) await supabase.from('products').upsert(localProducts);
          if (localTransactions?.length) await supabase.from('transactions').upsert(localTransactions);
          if (localUsers?.length) await supabase.from('users').upsert(localUsers);
          if (localProfile) await supabase.from('store_profile').upsert({ ...localProfile, id: 1, favorites: localFavs || [] });
          if (localCustomers?.length) await supabase.from('customers').upsert(localCustomers);
          if (localTimeLogs?.length) await supabase.from('time_logs').upsert(localTimeLogs);

          // After pushing, re-fetch or use local
          if (localProducts) setProducts(localProducts);
          if (localTransactions) setTransactions(localTransactions);
          if (localUsers) setUsers(localUsers);
          if (localProfile) setStoreProfile(localProfile);
          if (localBIR) setBirSettings(localBIR);
          if (localFavs) setFavorites(localFavs);
          if (localCustomers) setCustomers(localCustomers);
          if (localTimeLogs) setTimeLogs(localTimeLogs);
        } else {
          // Use Cloud Data
          if (dbProducts) setProducts(dbProducts.map(p => ({
            ...p,
            costPrice: p.cost_price,
            isVatExempt: p.is_vat_exempt
          })));
          if (dbTransactions) setTransactions(dbTransactions.map(t => ({
            ...t,
            vatableSales: t.vatable_sales,
            vatExemptSales: t.vat_exempt_sales,
            paymentMethod: t.payment_method,
            seniorInfo: t.senior_info
          })));
          if (dbUsers && dbUsers.length > 0) {
            setUsers(dbUsers.map(u => ({
              ...u,
              mustChangePassword: !!u.must_change_password,
              swipeId: u.swipe_id
            })));
          } else {
            // Ensure at least one admin exists if table is empty
            const defaultAdmin = { username: 'admin', password: 'Admin@12345', role: 'admin', mustChangePassword: true, email: '' }; // Enforce OTP reset
            setUsers([defaultAdmin]);
            supabase.from('users').upsert([{
              username: 'admin',
              password: 'Admin@12345',
              role: 'admin',
              must_change_password: true,
              email: ''
            }]).then(() => console.log('✓ Default Admin Restored with OTP Required'));
          }
          if (dbProfile) {
            setStoreProfile(dbProfile);
            setFavorites(dbProfile.favorites || []);
            // BIR settings are usually per machine but can be global
            // We'll keep them as part of the local machine for now or merge
          }
          if (dbCustomers) setCustomers(dbCustomers);
          if (dbTimeLogs) setTimeLogs(dbTimeLogs);
        }

        // 3. Real-time Subscriptions - STABLE PATTERN
        try {
          const oldChannel = supabase.getChannels().find(c => c.name === 'pos_updates');
          if (oldChannel) supabase.removeChannel(oldChannel);
        } catch (e) { }

        const channel = supabase.channel('pos_updates');

        channel.on('postgres_changes', { event: '*', table: 'products' }, async () => {
          const { data } = await supabase.from('products').select('*');
          if (data) setProducts(data.map(p => ({
            ...p, costPrice: p.cost_price, isVatExempt: p.is_vat_exempt
          })));
        });

        channel.on('postgres_changes', { event: '*', table: 'transactions' }, async () => {
          const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false });
          if (data) setTransactions(data.map(t => ({
            ...t, vatableSales: t.vatable_sales, vatExemptSales: t.vat_exempt_sales, paymentMethod: t.payment_method, seniorInfo: t.senior_info
          })));
        });

        channel.subscribe();

        const sessionUser = JSON.parse(localStorage.getItem('pos_current_user') || 'null');
        if (sessionUser) {
          const latestUser = (dbUsers || []).find(u => u.username === sessionUser.username);
          // Safety Enforcer: If using default password, ALWAYS force reset
          if (latestUser && (latestUser.must_change_password || latestUser.password === 'Admin@12345')) {
            const mappedUser = { ...latestUser, mustChangePassword: true, swipeId: latestUser.swipe_id };
            setCurrentUser(mappedUser);
            setForceChangeUser(mappedUser);
            setForceChangeStep('change');
            setForceChangeForm({ newPassword: '', confirmPassword: '', email: mappedUser.email || '' });
          } else {
            setCurrentUser(sessionUser);
          }
          setCurrentView('pos');
        }

        return () => supabase.removeChannel(channels);
      } catch (err) {
        console.error('Cloud Sync Failure:', err);
        showToast('Offline mode or connection failed.', 'warning');
        // Fallback to local
        const localProds = await db.get('products');
        if (localProds) setProducts(localProds);
      } finally {
        setIsInitializing(false);
      }
    };
    initializeAppData();
  }, []);

  // --- Persistence (Dual Write: Cloud + Local Fallback) ---
  useEffect(() => {
    if (!isInitializing && !isResetting) {
      db.set('products', products);
      if (products.length > 0) {
        const productsToSync = products.map(p => ({
          barcode: p.barcode,
          name: p.name,
          price: parseFloat(p.price) || 0,
          cost_price: parseFloat(p.costPrice) || 0,
          category: p.category,
          stock: parseInt(p.stock) || 0,
          unit: p.unit || 'ea',
          is_vat_exempt: !!p.isVatExempt
        }));
        supabase.from('products').upsert(productsToSync, { onConflict: 'barcode' }).then(({ error }) => {
          if (error) console.error('Cloud Sync Error (Products):', error);
        });
      }
    }
  }, [products, isInitializing, isResetting]);

  useEffect(() => {
    if (!isInitializing && !isResetting) {
      const transactionsToSync = transactions.map(t => ({
        id: t.id,
        date: t.date,
        items: t.items,
        total: parseFloat(t.total) || 0,
        tax: parseFloat(t.tax) || 0,
        discount: parseFloat(t.discount) || 0,
        vatable_sales: parseFloat(t.vatableSales) || 0,
        vat_exempt_sales: parseFloat(t.vatExemptSales) || 0,
        payment_method: t.paymentMethod,
        cashier: t.cashier,
        status: 'paid',
        senior_info: t.seniorInfo || null
      }));
      supabase.from('transactions').upsert(transactionsToSync, { onConflict: 'id' }).then(({ error }) => {
        if (error) console.error('Cloud Sync Error (Transactions):', error);
      });
    }
  }, [transactions, isInitializing, isResetting]);

  useEffect(() => {
    if (!isInitializing && !isResetting && users.length > 0) {
      db.set('users', users);
      const usersToSync = users.map(u => ({
        username: u.username,
        password: u.password,
        role: u.role,
        must_change_password: !!u.mustChangePassword,
        email: u.email,
        swipe_id: u.swipeId
      }));
      supabase.from('users').upsert(usersToSync, { onConflict: 'username' }).then(({ error }) => {
        if (error) console.error('Cloud Sync Error (Users):', error);
      });
    }
  }, [users, isInitializing, isResetting]);

  useEffect(() => {
    if (!isInitializing && !isResetting) {
      db.set('store_profile', storeProfile);
      supabase.from('store_profile').upsert({
        id: 1,
        name: storeProfile.name,
        address: storeProfile.address,
        tel: storeProfile.tel,
        tax_mode: storeProfile.taxMode,
        enable_crm: !!storeProfile.enableCRM,
        favorites: favorites
      }).then(({ error }) => {
        if (error) console.error('Cloud Sync Error (Profile):', error);
      });
    }
  }, [storeProfile, favorites, isInitializing, isResetting]);

  useEffect(() => {
    if (!isInitializing && !isResetting && customers.length > 0) {
      db.set('customers', customers);
      supabase.from('customers').upsert(customers).then(({ error }) => error && console.error('Cloud Sync Error (Customers):', error));
    }
  }, [customers, isInitializing, isResetting]);

  // --- Theme & Safe Mode ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('pos_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const checkSafeMode = (e) => {
      if (e.shiftKey && e.altKey && e.key === 'Backspace') {
        db.clear().then(() => window.location.reload());
      }
    };
    window.addEventListener('keydown', checkSafeMode);
    return () => window.removeEventListener('keydown', checkSafeMode);
  }, []);

  useEffect(() => {
    if (showSettings && currentUser) {
      setSettingsForm({ username: currentUser.username, password: '', birEnabled: birSettings.enabled, tin: birSettings.tin, ptu: birSettings.ptu, min: birSettings.min });
      setStoreForm({ ...storeProfile });
    }
  }, [showSettings, currentUser]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const showConfirm = (title, message, onConfirm, onCancel = null) => {
    setConfirmModal({ title, message, onConfirm, onCancel: onCancel || (() => setConfirmModal(null)) });
  };

  const showPromptDialog = (title, message, placeholder, onConfirm) => {
    setPromptValue('');
    setPromptModal({ title, message, placeholder, onConfirm });
  };

  const toggleFavorite = (productId, e) => {
    if (e) e.stopPropagation();
    setFavorites(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  // --- Auth Handlers ---
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setValidationErrors({});
    setLoginAttemptWarning(null);
    const username = validateUsername(loginForm.email);
    const password = loginForm.password;
    if (!username) { setValidationErrors({ email: 'Invalid username format (3-20 characters, alphanumeric, underscore, hyphen only)' }); return; }
    if (!password || password.length === 0) { setValidationErrors({ password: 'Password is required' }); return; }
    const rateLimitCheck = loginRateLimiter.recordAttempt(username);
    if (!rateLimitCheck.allowed) {
      const minutes = Math.ceil((rateLimitCheck.lockedUntil - Date.now()) / 60000);
      setLoginAttemptWarning(`Account temporarily locked. Try again in ${minutes} minute(s).`);
      auditLogger.log('LOGIN_ATTEMPT_BLOCKED', { username, reason: 'rate_limit_exceeded' });
      return;
    }
    if (rateLimitCheck.remaining <= 3) setLoginAttemptWarning(`⚠️ ${rateLimitCheck.remaining} attempt(s) remaining before account lockout.`);
    const userMatch = users.find(u => u.username.toLowerCase() === username && u.password === password);
    if (userMatch) {
      loginRateLimiter.reset(username);
      auditLogger.log('LOGIN_SUCCESS', { userId: username, role: userMatch.role });

      // DEEP FIX: Force Reset if mustChangePassword is true OR if using default password
      if (userMatch.mustChangePassword || userMatch.password === 'Admin@12345') {
        const resetUser = { ...userMatch, mustChangePassword: true };
        setForceChangeUser(resetUser);
        setForceChangeStep('change');
        setForceChangeForm({ newPassword: '', confirmPassword: '', email: userMatch.email || '' });
        setForceChangeError('');
        setLoginForm({ email: '', password: '' });
        return;
      }
      setIsProcessingLogin(true);
      setTimeout(async () => {
        setCurrentUser(userMatch);
        setLoginForm({ email: '', password: '' });
        setIsProcessingLogin(false);
        setCurrentView('pos');

        // Automated Clock-In
        try {
          await supabase.from('time_logs').insert([{
            username: userMatch.username,
            clock_in: new Date().toISOString()
          }]);
        } catch (err) {
          console.error('Clock-in error:', err);
        }
      }, 1500);
    } else {
      auditLogger.log('LOGIN_FAILED', { username, reason: 'invalid_credentials' });
      setValidationErrors({ password: 'Invalid username or password. Please try again.' });
    }
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    setValidationErrors({});
    const username = validateUsername(resetForm.email);
    if (!username) { setValidationErrors({ email: 'Invalid username format' }); return; }
    const userMatch = users.find(u => u.username.toLowerCase() === username);
    if (!userMatch) { setValidationErrors({ email: 'Username not found in the system.' }); return; }
    if (!validatePassword(resetForm.newPassword)) { setValidationErrors({ newPassword: 'Password must be 8+ characters with uppercase, lowercase, number, and special character (!@#$%^&*' }); return; }
    if (resetForm.newPassword !== resetForm.confirmPassword) { setValidationErrors({ confirmPassword: 'Passwords do not match.' }); return; }
    setUsers(prev => prev.map(u => u.username === userMatch.username ? { ...u, password: resetForm.newPassword } : u));
    setAuthView('login');
    setResetForm({ email: '', newPassword: '', confirmPassword: '' });
    setValidationErrors({});
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const newUsername = settingsForm.username;
    const newPassword = settingsForm.password || currentUser.password;
    if (newUsername !== currentUser.username && users.some(u => u.username === newUsername)) { showToast('Username already taken.', 'error'); return; }
    if (settingsForm.birEnabled) {
      if (!settingsForm.tin.trim()) { showToast('⚠️ BIR Mode requires a TIN Number.', 'error'); return; }
      if (!settingsForm.ptu.trim()) { showToast('⚠️ BIR Mode requires a PTU Number.', 'error'); return; }
      if (!settingsForm.min.trim()) { showToast('⚠️ BIR Mode requires a Machine ID Number.', 'error'); return; }
    }
    setPendingSettingsData({ newUsername, newPassword });
    setConfirmSettingsPassword('');
    setConfirmSettingsError('');
    setConfirmSettingsShowPw(false);
    setShowConfirmSettings(true);
  };

  const handleConfirmSettingsSave = () => {
    try {
      if (confirmSettingsPassword !== currentUser.password) { setConfirmSettingsError('❌ Incorrect current password.'); return; }
      const { newUsername, newPassword } = pendingSettingsData;
      const updatedUser = { ...currentUser, username: newUsername, password: newPassword };
      setUsers(prev => prev.map(u => u.username === currentUser.username ? updatedUser : u));
      setCurrentUser(updatedUser);
      if (currentUser.role === 'admin') {
        setBirSettings({ enabled: settingsForm.birEnabled, tin: settingsForm.tin, ptu: settingsForm.ptu, min: settingsForm.min });
        setStoreProfile({
          name: storeForm.name || storeProfile.name,
          address: storeForm.address || storeProfile.address,
          tel: storeForm.tel || storeProfile.tel,
          gcashNumber: storeForm.gcashNumber,
          mayaNumber: storeForm.mayaNumber,
          gcashQR: storeForm.gcashQR,
          mayaQR: storeForm.mayaQR,
          enableCRM: storeForm.enableCRM !== undefined ? storeForm.enableCRM : storeProfile.enableCRM
        });
      }
      setShowConfirmSettings(false);
      setShowSettings(false);
      setPendingSettingsData(null);
      showToast('✅ Settings saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      setConfirmSettingsError('❌ Failed to save. The image might be too large.');
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      // Automated Clock-Out
      try {
        const { data: logs } = await supabase
          .from('time_logs')
          .select('*')
          .eq('username', currentUser.username)
          .is('clock_out', null)
          .order('clock_in', { ascending: false })
          .limit(1);

        if (logs && logs.length > 0) {
          const start = new Date(logs[0].clock_in);
          const end = new Date();
          const hours = Math.abs(end - start) / 36e5; // Convert ms to hours

          await supabase.from('time_logs')
            .update({
              clock_out: end.toISOString(),
              total_hours: parseFloat(hours.toFixed(2))
            })
            .eq('id', logs[0].id);
        }
      } catch (err) {
        console.error('Clock-out error:', err);
      }
    }
    setCurrentUser(null);
    setCurrentView('dashboard');
    showToast('Logged out successfully.', 'info');
  };

  const backupDatabase = () => {
    try {
      const data = { products, transactions, storeProfile, birSettings, users, favorites };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `FreshPOS_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('✅ Database backup downloaded!', 'success');
    } catch (err) {
      showToast('❌ Backup failed.', 'error');
    }
  };

  const restoreDatabase = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setConfirmModal({
      title: 'Restore Database?',
      message: 'WARNING: This will overwrite ALL current data. This cannot be undone. Continue?',
      onConfirm: () => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            showToast('📤 Restoring to Cloud...', 'info');

            const syncTasks = [];
            if (data.products) {
              setProducts(data.products);
              syncTasks.push(supabase.from('products').upsert(data.products.map(p => ({
                barcode: p.barcode,
                name: p.name,
                price: parseFloat(p.price) || 0,
                cost_price: parseFloat(p.costPrice) || 0,
                category: p.category,
                stock: parseInt(p.stock) || 0,
                unit: p.unit || 'ea',
                is_vat_exempt: !!p.isVatExempt
              })), { onConflict: 'barcode' }));
            }
            if (data.transactions) {
              setTransactions(data.transactions);
              syncTasks.push(supabase.from('transactions').upsert(data.transactions.map(t => ({
                id: t.id,
                date: t.date,
                items: t.items,
                total: parseFloat(t.total) || 0,
                tax: parseFloat(t.tax) || 0,
                discount: parseFloat(t.discount) || 0,
                vatable_sales: parseFloat(t.vatableSales) || 0,
                vat_exempt_sales: parseFloat(t.vatExemptSales) || 0,
                payment_method: t.paymentMethod,
                cashier: t.cashier,
                status: 'paid',
                senior_info: t.seniorInfo || null
              })), { onConflict: 'id' }));
            }
            if (data.users) {
              setUsers(data.users);
              syncTasks.push(supabase.from('users').upsert(data.users.map(u => ({
                username: u.username,
                password: u.password,
                role: u.role,
                must_change_password: !!u.mustChangePassword,
                email: u.email,
                swipe_id: u.swipeId
              })), { onConflict: 'username' }));
            }
            if (data.storeProfile) {
              setStoreProfile(data.storeProfile);
              syncTasks.push(supabase.from('store_profile').upsert({
                id: 1,
                name: data.storeProfile.name,
                address: data.storeProfile.address,
                tel: data.storeProfile.tel,
                tax_mode: data.storeProfile.taxMode,
                enable_crm: !!data.storeProfile.enableCRM
              }));
            }

            // Wait for all cloud syncs to finish
            Promise.all(syncTasks).then(() => {
              showToast('✅ Cloud and Local Restored!', 'success');
              setTimeout(() => window.location.reload(), 1500);
            }).catch(err => {
              console.error('Cloud restore partial failure:', err);
              window.location.reload();
            });
          } catch (err) {
            console.error('Restore error:', err);
            showToast('❌ Invalid backup file.', 'error');
          }
        };
        reader.readAsText(file);
      }
    });
  };

  const handleForceChangeSubmit = async (e) => {
    e.preventDefault();
    setForceChangeError('');
    if (!validatePassword(forceChangeForm.newPassword)) { setForceChangeError('Password must be 8+ chars with uppercase, lowercase, number, and special character.'); return; }
    if (forceChangeForm.newPassword !== forceChangeForm.confirmPassword) { setForceChangeError('Passwords do not match.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forceChangeForm.email)) { setForceChangeError('Enter a valid email address.'); return; }
    const generated = String(Math.floor(100000 + Math.random() * 900000));
    setOtpCode(generated);
    try {
      await emailjs.send('service_hi4ywgn', 'template_3swxmyo', { to_email: forceChangeForm.email, to_name: forceChangeUser?.username || 'User', otp_code: generated }, 'c0zc4zxCJrfMnM5As');
      setOtpInput('');
      setOtpError('');
      setForceChangeStep('otp');
    } catch (err) {
      setForceChangeError('Failed to send OTP email. Please check your email address and try again.');
    }
  };

  const handleOtpVerify = (e) => {
    e.preventDefault();
    if (!forceChangeUser) return;
    if (otpInput.trim() !== otpCode) { setOtpError('Incorrect OTP. Please try again.'); return; }
    const updatedUser = { ...forceChangeUser, password: forceChangeForm.newPassword, mustChangePassword: false, email: forceChangeForm.email };
    setUsers(prev => prev.map(u => u.username === forceChangeUser.username ? updatedUser : u));
    setForceChangeUser(null);
    setOtpCode('');
    setOtpInput('');
    setIsProcessingLogin(true);
    setTimeout(() => {
      setCurrentUser(updatedUser);
      setIsProcessingLogin(false);
      setCurrentView(updatedUser.role === 'cashier' ? 'pos' : 'dashboard');
    }, 1000);
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    setValidationErrors({});
    const username = validateUsername(newUserForm.username);
    if (!username) { setValidationErrors({ username: 'Invalid username (3-20 characters, alphanumeric, underscore, hyphen only)' }); return; }
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) { setValidationErrors({ username: 'Username already exists!' }); return; }
    const defaultPassword = 'Welcome@1';
    const newUser = { username, password: defaultPassword, role: newUserForm.role, swipeId: newUserForm.swipeId, mustChangePassword: true, phone: '' };
    setUsers([...users, newUser]);
    showToast(`✅ User "${username}" created. Default password: ${defaultPassword}`, 'success');
    setNewUserForm({ username: '', password: '', role: 'cashier', swipeId: '' });
    setValidationErrors({});
  };

  const handleDeleteUser = (username) => {
    if (username === currentUser.username) { setValidationErrors({ form: 'You cannot delete yourself!' }); return; }
    setUsers(prev => prev.filter(u => u.username !== username));
  };

  const requestVoidApproval = (onApproved, title = 'Void Approval Required') => {
    if (!birSettings.enabled) { onApproved(currentUser?.username || 'SYSTEM'); return; }
    if (['admin', 'supervisor'].includes(currentUser?.role)) { onApproved(currentUser.username); return; }
    setVoidApproval({ title, onApproved });
    setVoidApprovalForm({ username: '', password: '', swipeId: '' });
  };

  const handleVoidApprovalSubmit = (e) => {
    e.preventDefault();
    if (!voidApproval) return;
    const swipeId = voidApprovalForm.swipeId.trim();
    const approver = users.find(u =>
      ['admin', 'supervisor'].includes(u.role) &&
      ((swipeId && String(u.swipeId || '').trim() === swipeId) ||
        ((u.username.toLowerCase() === voidApprovalForm.username.toLowerCase() ||
          `${u.username.toLowerCase()}@pos.ph` === voidApprovalForm.username.toLowerCase()) &&
          u.password === voidApprovalForm.password))
    );
    if (!approver) { alert('Void denied. Admin/Supervisor approval is required while BIR mode is enabled.'); return; }
    const onApproved = voidApproval.onApproved;
    setVoidApproval(null);
    setVoidApprovalForm({ username: '', password: '', swipeId: '' });
    onApproved(approver.username);
  };

  const currentShift = useMemo(() => {
    if (!currentUser) return null;
    const userLogs = timeLogs.filter(l => l.username === currentUser.username).sort((a, b) => b.clockIn - a.clockIn);
    if (userLogs.length > 0 && !userLogs[0].clockOut) return userLogs[0];
    return null;
  }, [timeLogs, currentUser]);

  const handleClockInOut = () => {
    if (currentShift) {
      showConfirm('Clock Out', `Are you sure you want to clock out for today?`, () => {
        setTimeLogs(prev => prev.map(l => l.id === currentShift.id ? { ...l, clockOut: Date.now() } : l));
        showToast('Successfully clocked out.', 'success');
      });
    } else {
      setTimeLogs(prev => [{ id: Date.now().toString(), username: currentUser.username, role: currentUser.role, clockIn: Date.now(), clockOut: null }, ...prev]);
      showToast('Successfully clocked in.', 'success');
    }
  };

  // --- Derived Values ---
  const standardCategories = ['Milk', 'Coffee', 'Canned Meat', 'Canned Fish', 'Noodles', 'Biscuits', 'Condiments', 'Snacks', 'Beverages', 'Toilet Soap', 'Laundry Soap', 'Shampoo', 'Household', 'Other'];

  const categories = useMemo(() => {
    const existing = Array.from(new Set(products.map(p => p.category)));
    const combined = [...new Set([...standardCategories, ...existing.filter(c => c && isNaN(c))])];
    return ['All', ...combined];
  }, [products]);

  const cartMetrics = useMemo(() => {
    let totalVat = 0;
    let totalDiscount = 0;
    let totalAmount = 0;
    let vatableSales = 0;
    let vatExemptSales = 0;
    const isInclusive = storeProfile.taxMode === 'inclusive';

    cart.forEach(item => {
      const lineTotal = item.price * item.quantity;

      if (!isVatSale) {
        // Global Non-VAT Mode
        totalAmount += lineTotal;
        vatExemptSales += lineTotal;
      } else if (isSeniorSale) {
        // PH Law: Strip VAT first if applicable, then 20% off the net
        // Seniors/PWDs are ALWAYS calculated on the net amount
        const netOfVat = item.isVatExempt ? lineTotal : (lineTotal / 1.12);
        const discount = netOfVat * 0.20;

        totalDiscount += discount;
        totalAmount += (netOfVat - discount);

        if (item.isVatExempt) vatExemptSales += netOfVat;
        else vatableSales += netOfVat;
      } else {
        if (isInclusive) {
          totalAmount += lineTotal;
          if (item.isVatExempt) {
            vatExemptSales += lineTotal;
          } else {
            const net = lineTotal / 1.12;
            const vat = lineTotal - net;
            vatableSales += net;
            totalVat += vat;
          }
        } else {
          // VAT Exclusive (Add-on)
          if (item.isVatExempt) {
            totalAmount += lineTotal;
            vatExemptSales += lineTotal;
          } else {
            const vat = lineTotal * 0.12;
            vatableSales += lineTotal;
            totalVat += vat;
            totalAmount += (lineTotal + vat);
          }
        }
      }
    });

    return {
      total: totalAmount,
      tax: totalVat,
      discount: totalDiscount,
      vatable: vatableSales,
      exempt: vatExemptSales
    };
  }, [cart, isSeniorSale, isVatSale, storeProfile.taxMode]);

  const subtotal = useMemo(() => cartMetrics.total + cartMetrics.discount - cartMetrics.tax, [cartMetrics]);
  const tax = cartMetrics.tax;
  const total = cartMetrics.total;

  const activeTransactions = useMemo(() => transactions.filter(t => t.status !== 'voided'), [transactions]);
  const totalRevenue = useMemo(() => activeTransactions.reduce((acc, t) => acc + parseFloat(t.total || 0), 0), [activeTransactions]);
  const totalProfit = useMemo(() => activeTransactions.reduce((acc, t) => acc + parseFloat(t.profit || 0), 0), [activeTransactions]);
  const todaysTransactions = useMemo(() => {
    const today = new Date().toLocaleDateString();
    return activeTransactions.filter(t => t.date && t.date.includes(today));
  }, [activeTransactions]);
  const todaysSales = useMemo(() => todaysTransactions.reduce((acc, t) => acc + parseFloat(t.total || 0), 0), [todaysTransactions]);
  const todaysProfit = useMemo(() => todaysTransactions.reduce((acc, t) => acc + parseFloat(t.profit || 0), 0), [todaysTransactions]);
  const salesByCashier = useMemo(() => {
    return todaysTransactions.reduce((acc, t) => {
      const cashier = t.cashier || 'SYSTEM';
      if (!acc[cashier]) acc[cashier] = { cashier, transactions: 0, total: 0 };
      acc[cashier].transactions += 1;
      acc[cashier].total += parseFloat(t.total || 0);
      return acc;
    }, {});
  }, [todaysTransactions]);

  const peakHoursData = useMemo(() => {
    const hours = new Array(24).fill(0);
    activeTransactions.forEach(t => {
      if (t.date) {
        const timeMatch = t.date.match(/(\d{1,2}):\d{2}:\d{2}\s?(AM|PM)?/i);
        if (timeMatch) {
          let hourStr = parseInt(timeMatch[1], 10);
          if (timeMatch[2] && timeMatch[2].toUpperCase() === 'PM' && hourStr < 12) hourStr += 12;
          if (timeMatch[2] && timeMatch[2].toUpperCase() === 'AM' && hourStr === 12) hourStr = 0;
          if (hourStr >= 0 && hourStr < 24) hours[hourStr]++;
        }
      }
    });
    return hours.map((count, hour) => ({
      label: hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`,
      count,
      hour
    })).filter(h => h.count > 0 || (h.hour >= 8 && h.hour <= 20));
  }, [activeTransactions]);

  const topProductsData = useMemo(() => {
    const counts = {};
    activeTransactions.forEach(t => {
      (t.items || []).forEach(item => {
        counts[item.id] = (counts[item.id] || 0) + item.quantity;
      });
    });
    const sortedIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 5);
    return sortedIds.map(id => {
      const mapped = products.find(p => p.id === id);
      return { name: mapped?.name || 'Unknown Item', count: counts[id] };
    });
  }, [activeTransactions, products]);

  const productSalesData = useMemo(() => {
    const now = new Date();
    let dateRange = 1; // days
    if (dashboardTimePeriod === 'week') dateRange = 7;
    else if (dashboardTimePeriod === 'month') dateRange = 30;

    const startDate = new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000);
    const periodTransactions = activeTransactions.filter(t => {
      const tDate = new Date(t.timestamp || t.date);
      return tDate >= startDate;
    });

    const salesByProduct = {};
    periodTransactions.forEach(t => {
      (t.items || []).forEach(item => {
        if (!salesByProduct[item.id]) {
          const prod = products.find(p => p.id === item.id);
          salesByProduct[item.id] = {
            name: prod?.name || 'Unknown',
            quantity: 0,
            revenue: 0,
            stock: prod?.stock || 0
          };
        }
        salesByProduct[item.id].quantity += item.quantity;
        salesByProduct[item.id].revenue += parseFloat(item.price || 0) * item.quantity;
      });
    });

    return Object.entries(salesByProduct)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [activeTransactions, products, dashboardTimePeriod]);

  const stockLevelData = useMemo(() => {
    return products
      .filter(p => typeof p.stock === 'number')
      .map(p => ({ name: p.name, stock: p.stock, minStock: p.minStock || 5 }))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10);
  }, [products]);

  const findProductByCode = (code) => {
    const normalized = String(code || '').trim().toLowerCase();
    if (!normalized) return null;
    for (const p of products) {
      if (String(p.barcode || '').trim().toLowerCase() === normalized || String(p.id || '').trim().toLowerCase() === normalized) {
        return p;
      }
      if (p.variants && p.variants.length > 0) {
        const variantMatch = p.variants.find(v => String(v.barcode || '').trim().toLowerCase() === normalized);
        if (variantMatch) {
          return {
            ...p,
            id: `${p.id}-${variantMatch.id}`,
            barcode: variantMatch.barcode,
            name: `${p.name} - ${variantMatch.name}`,
            price: parseFloat(p.price) + parseFloat(variantMatch.priceOffset || 0),
            stock: variantMatch.stock,
            isVariant: true,
            parentId: p.id,
            variantId: variantMatch.id,
            variants: undefined
          };
        }
      }
    }
    return null;
  };

  // --- Cart Handlers ---
  const addToCart = (product, shouldRedirect = false, quantity = 1) => {
    const inventoryProduct = findProductByCode(product?.barcode) || findProductByCode(product?.id) || product;

    if (inventoryProduct.variants && inventoryProduct.variants.length > 0 && !inventoryProduct.isVariant) {
      setVariantSelectModal({ show: true, product: inventoryProduct, quantity, shouldRedirect });
      return;
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    if (typeof inventoryProduct.stock === 'number') {
      const currentInCart = cart.find(i => i.id === (inventoryProduct.id || inventoryProduct.barcode));
      const inCart = currentInCart ? currentInCart.quantity : 0;
      if (inventoryProduct.stock <= 0) { showToast(`❌ "${inventoryProduct.name}" is out of stock.`, 'error'); return; }
      if (inCart + qty > inventoryProduct.stock) { showToast(`⚠️ Only ${inventoryProduct.stock - inCart} unit(s) left.`, 'warning'); return; }
    }
    const productForCart = {
      ...inventoryProduct,
      barcode: inventoryProduct.barcode || inventoryProduct.id,
      price: parseFloat(inventoryProduct.price || 0),
      costPrice: parseFloat(inventoryProduct.costPrice || 0),
      isVatExempt: !!inventoryProduct.isVatExempt
    };
    setCart(prev => {
      const existing = prev.find(item => item.id === productForCart.id);
      if (existing) return prev.map(item => item.id === productForCart.id ? { ...productForCart, quantity: item.quantity + qty } : item);
      return [...prev, { ...productForCart, quantity: qty }];
    });
    if (shouldRedirect) setCurrentView('pos');
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const sanitizedBarcode = validateBarcode(barcodeInput);
    if (!sanitizedBarcode) { setValidationErrors({ barcode: 'Invalid barcode format' }); return; }
    const validQty = validateQuantity(purchaseQuantity);
    if (!validQty) { setValidationErrors({ quantity: 'Invalid quantity (1-9999)' }); return; }
    const product = findProductByCode(sanitizedBarcode);
    if (!product) { setValidationErrors({ barcode: `⚠️ Barcode "${sanitizedBarcode}" not found in inventory.` }); return; }
    setValidationErrors({});
    addToCart(product, false, validQty);
    setBarcodeInput('');
    setPurchaseQuantity(1);
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 700);
    showToast(`✓ ${product.name} — ₱${parseFloat(product.price).toFixed(2)} added to cart`, 'success');
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(i => i.quantity > 0));
  };

  const voidCartItem = (id) => { requestVoidApproval(() => { setCart(prev => prev.filter(item => item.id !== id)); }, 'Approve Item Void'); };

  const voidCurrentSale = () => {
    if (cart.length === 0) return;
    requestVoidApproval(() => {
      showConfirm('🗑️ Void Current Sale', 'This will clear all items from the cart. This action cannot be undone.', () => { setCart([]); showToast('Sale voided. Cart cleared.', 'warning'); });
    }, 'Approve Current Sale Void');
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsSelectingCashless(false);
    setShowPaymentMethod(true);
  };

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
    setCashlessRef('');
    setLast4('');
    if (method.id === 'cash') setCashReceived('');
  };

  useEffect(() => {
    const handleGlobalKeys = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (cart.length > 0) {
        if (e.key === 'F1') handlePaymentMethodSelect({ id: 'cash' });
        if (e.key === 'F2') handlePaymentMethodSelect({ id: 'gcash' });
        if (e.key === 'F3') handlePaymentMethodSelect({ id: 'maya' });
        if (e.key === 'F4') handlePaymentMethodSelect({ id: 'card' });
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [cart]);

  const completeTransaction = (method, receivedAmount = null) => {
    try {
      const finalReceived = receivedAmount !== null ? parseFloat(receivedAmount) : total;
      const change = Math.max(0, finalReceived - total);
      const trxProfit = cart.reduce((acc, item) => {
        const itemPriceNet = item.price / 1.12; // Assuming prices are VAT-inclusive
        return acc + (itemPriceNet - item.costPrice) * item.quantity;
      }, 0);

      const newTransaction = {
        id: `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        items: [...cart],
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        profit: parseFloat(isSeniorSale ? (total - cart.reduce((acc, i) => acc + (i.costPrice * i.quantity), 0)) : trxProfit.toFixed(2)), // Simplistic for now, can refine
        discount: parseFloat(cartMetrics.discount.toFixed(2)),
        isSeniorSale,
        seniorInfo,
        amountReceived: parseFloat(finalReceived.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        paymentMethod: method.name,
        paymentMethodId: method.id,
        referenceNumber: method.id !== 'cash' ? cashlessRef : '',
        cardNetwork: method.id.includes('card') ? cardNetwork : '',
        cardLast4: method.id.includes('card') ? last4 : '',
        cashier: currentUser?.username || 'SYSTEM',
        customerId: allocatedCustomer ? allocatedCustomer.id : null,
        customerName: allocatedCustomer ? allocatedCustomer.name : '',
        customerPoints: Math.floor(parseFloat(total.toFixed(2)) / 100),
        vatableSales: cartMetrics.vatable,
        vatExemptSales: cartMetrics.exempt,
        date: new Date().toLocaleString(),
        timestamp: Date.now()
      };
      setProducts(prevProducts => prevProducts.map(p => {
        const cartItem = cart.find(item => item.id === p.id);
        const variantItems = cart.filter(item => item.isVariant && item.parentId === p.id);

        if (variantItems.length > 0) {
          let newVariants = [...(p.variants || [])];
          let totalDeductions = 0;
          variantItems.forEach(vi => {
            const vIdx = newVariants.findIndex(v => v.id === vi.variantId);
            if (vIdx >= 0) {
              newVariants[vIdx] = { ...newVariants[vIdx], stock: Math.max(0, newVariants[vIdx].stock - vi.quantity) };
              totalDeductions += vi.quantity;
            }
          });
          const newStock = p.stock !== null ? Math.max(0, p.stock - (cartItem ? cartItem.quantity : 0) - totalDeductions) : null;
          return { ...p, variants: newVariants, stock: newStock };
        }

        if (cartItem && typeof p.stock === 'number') return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
        return p;
      }));
      setTransactions(prev => [newTransaction, ...prev]);
      if (allocatedCustomer) {
        setCustomers(prev => prev.map(c =>
          c.id === allocatedCustomer.id
            ? { ...c, points: (c.points || 0) + newTransaction.customerPoints, lastPurchase: Date.now() }
            : c
        ));
      }
      setCart([]);
      setAllocatedCustomer(null);
      setCashReceived('');
      setCashlessRef('');
      setLast4('');
      setShowPaymentMethod(false);
      setSelectedPaymentMethod(null);
      setIsSelectingCashless(false);
      setShowInvoice(true);
      printReceipt(150);
      showToast('✅ Transaction completed successfully!', 'success');
      setTimeout(() => { const input = document.getElementById('barcode-input'); if (input) input.focus(); }, 300);
    } catch (err) {
      console.error('Transaction Error:', err);
      showToast('❌ Failed to complete transaction.', 'error');
    }
  };

  const handleVoidTransaction = (transactionId) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction || transaction.status === 'voided') return;
    requestVoidApproval((approvedBy) => {
      showPromptDialog('🗑️ Void Transaction', `Enter the reason for voiding ${transactionId}:`, 'e.g. Wrong item scanned, customer cancelled...', (reason) => {
        if (!reason || !reason.trim()) { showToast('Void cancelled — a reason is required.', 'error'); return; }
        showConfirm('Confirm Void', `Void transaction ${transactionId}?`, () => {
          setProducts(prevProducts => prevProducts.map(p => {
            const voidedItem = transaction.items.find(item => item.id === p.id);
            if (voidedItem && typeof p.stock === 'number') return { ...p, stock: p.stock + voidedItem.quantity };
            return p;
          }));
          setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, status: 'voided', voidReason: reason.trim(), voidedBy: currentUser?.username || 'SYSTEM', voidApprovedBy: approvedBy, voidedAt: new Date().toLocaleString() } : t));
          showToast(`Transaction ${transactionId} voided.`, 'warning');
        });
      });
    }, 'Approve Transaction Void');
  };

  const printReceipt = (delay = 100) => {
    setPrintState('receipt');
    setTimeout(() => window.print(), delay);
  };
  const handlePrint = () => printReceipt();
  const handlePrintXReading = () => { setPrintState('xreading'); setTimeout(() => window.print(), 100); };
  const handlePrintZReading = () => { setPrintState('zreading'); setTimeout(() => window.print(), 100); };
  const resetCart = () => {
    setCart([]);
    setAllocatedCustomer(null);
    setIsSeniorSale(false);
    setIsVatSale(true);
    setSeniorInfo({ id: '', name: '' });
    setShowInvoice(false);
  };



  const handleDownloadTemplate = () => {
    const template = [
      {
        Barcode: '123456789',
        Name: 'Sample Product',
        Category: 'Beverages',
        'Selling Price': 50.00,
        'Cost Price': 40.00,
        Unit: 'ea',
        Stock: 100,
        'VAT Exempt': 'No'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'FreshPOS_Product_Template.xlsx');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        const findValue = (obj, keys) => {
          const normalizedKeys = keys.map(k => k.toLowerCase().replace(/[\s_-]/g, ''));
          const foundKey = Object.keys(obj).find(k => normalizedKeys.includes(k.toLowerCase().replace(/[\s_-]/g, '')));
          return foundKey ? obj[foundKey] : null;
        };

        let updatedStock = 0;
        let addedStock = 0;

        setProducts(prevProducts => {
          const newProducts = [...prevProducts];

          data.forEach((item, index) => {
            const name = findValue(item, ['name', 'description', 'produkto', 'item']) || 'Unknown Item';
            const price = parseFloat(findValue(item, ['sellingprice', 'price', 'retailprice', 'srp']) || 0);
            const cost = parseFloat(findValue(item, ['costprice', 'cost', 'unitcost', 'puhunan']) || 0);
            const stock = parseInt(findValue(item, ['stock', 'qty', 'quantity', 'inventory']) || 0);
            const barcodeMatch = findValue(item, ['barcode', 'sku', 'code', 'upc', 'id']);
            const barcode = String(barcodeMatch || `BULK-${Date.now()}-${index}`).trim();
            const isExempt = String(findValue(item, ['vatexempt', 'exempt', 'bnpc']) || '').toLowerCase().includes('y');

            const existingIdx = newProducts.findIndex(p => String(p.barcode || p.id).trim() === barcode);

            const productData = {
              id: barcode,
              barcode,
              name: String(name),
              price: isNaN(price) ? 0 : price,
              costPrice: isNaN(cost) ? 0 : cost,
              stock: isNaN(stock) ? 0 : stock,
              category: String(findValue(item, ['category', 'class', 'group']) || 'General'),
              unit: String(findValue(item, ['unit', 'uom']) || 'ea'),
              isVatExempt: isExempt,
              minStock: parseInt(findValue(item, ['minstock', 'threshold']) || 5),
              image: findValue(item, ['image', 'picture', 'url']) || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80'
            };

            if (existingIdx >= 0) {
              newProducts[existingIdx] = { ...newProducts[existingIdx], ...productData };
              updatedStock++;
            } else {
              newProducts.push(productData);
              addedStock++;
            }
          });

          return newProducts;
        });

        showToast(`✅ Import Done: ${addedStock} added, ${updatedStock} updated.`, 'success');
      } catch (err) {
        console.error('Import Error:', err);
        showToast('⚠️ Failed to parse Excel file.', 'error');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const deleteProduct = (id) => {
    const product = products.find(p => p.id === id);
    showConfirm('🗑️ Delete Product', `Delete "${product?.name || id}" from inventory? This cannot be undone.`, () => {
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast(`"${product?.name}" removed from inventory.`, 'warning');
    });
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    console.log('Category selected:', newProduct.category);
    setValidationErrors({});
    const barcode = validateBarcode(newProduct.barcode);
    if (!barcode) { setValidationErrors({ barcode: 'Invalid barcode format' }); return; }
    if (findProductByCode(barcode)) { setValidationErrors({ barcode: 'Barcode/SKU already exists in inventory.' }); return; }
    const name = validateProductName(newProduct.name);
    if (!name) { setValidationErrors({ name: 'Product name is required (max 255 characters)' }); return; }
    const price = validatePrice(newProduct.price);
    if (price === null) { setValidationErrors({ price: 'Invalid price (must be 0-999999.99)' }); return; }
    const category = newProduct.category;
    if (!category) { setValidationErrors({ category: 'Please select a category' }); return; }
    console.log('Final category being saved:', category);
    const finalVariants = newProduct.variants && newProduct.variants.length > 0 ? newProduct.variants : [];
    const calculatedStock = finalVariants.length > 0 ? finalVariants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0) : (newProduct.stock !== '' ? Math.max(0, parseInt(newProduct.stock, 10) || 0) : null);
    const product = {
      id: barcode,
      barcode,
      name,
      price,
      costPrice: validatePrice(newProduct.costPrice) || 0,
      category,
      unit: newProduct.unit,
      stock: calculatedStock,
      minStock: newProduct.minStock !== '' ? Math.max(1, parseInt(newProduct.minStock, 10) || 5) : 5,
      isVatExempt: !!newProduct.isVatExempt,
      image: newProduct.image,
      variants: finalVariants
    };

    setProducts([product, ...products]);
    showToast(`✅ "${name}" added to inventory.`, 'success');
    setShowAddProduct(false);
    setNewProduct({ barcode: '', name: '', price: '', costPrice: '', category: '', unit: 'ea', stock: '', minStock: '5', isVatExempt: false, image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80', variants: [] });
  };

  // ─────────────────────────────────────────────
  // RENDER FUNCTIONS
  // ─────────────────────────────────────────────

  const renderSidebar = () => (
    <aside className="sidebar">
      <div className="logo-area">
        <div className="logo-icon"><Store size={22} /></div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>FreshPOS</h2>
      </div>

      {!isLicensed && (
        <div style={{ margin: '0 1rem 1rem', padding: '0.75rem', background: daysRemaining <= 1 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.05)', borderRadius: '0.75rem', border: `1px solid ${daysRemaining <= 1 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.1)'}` }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Free Trial</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: daysRemaining <= 1 ? '#ef4444' : 'var(--text-primary)', marginTop: '2px' }}>
            {daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'} Left
          </div>
        </div>
      )}

      <nav className="nav-links" style={{ marginTop: '1rem' }}>
        {['admin', 'supervisor'].includes(currentUser?.role) && (
          <button className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
        )}
        <button className={`nav-item ${currentView === 'pos' ? 'active' : ''}`} onClick={() => setCurrentView('pos')}>
          <ShoppingCart size={20} /> POS Terminal
        </button>
        {['admin', 'supervisor'].includes(currentUser?.role) && (
          <button className={`nav-item ${currentView === 'inventory' ? 'active' : ''}`} onClick={() => setCurrentView('inventory')}>
            <Package size={20} /> Inventory
          </button>
        )}

        <button className={`nav-item ${currentView === 'reports' ? 'active' : ''}`} onClick={() => setCurrentView('reports')}>
          <FileText size={20} /> Sales Reports
        </button>
      </nav>

      <div style={{ marginTop: 'auto', position: 'relative' }}>
        <button
          className="nav-item"
          onClick={() => setShowAdminMenu(!showAdminMenu)}
          style={{ width: '100%', background: showAdminMenu ? 'rgba(255,255,255,0.05)' : 'transparent' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                {currentUser?.username?.charAt(0).toUpperCase()}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, lineHeight: 1 }}>{currentUser?.username}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>{currentUser?.role}</div>
              </div>
            </div>
            <ChevronUp size={16} style={{ transform: showAdminMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
          </div>
        </button>

        {showAdminMenu && (
          <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '0.5rem', marginBottom: '0.5rem', boxShadow: 'var(--glass-shadow)', zIndex: 100 }}>
            <button className="nav-item" style={{ width: '100%', fontSize: '0.9rem', marginBottom: '0.25rem', padding: '0.6rem 1rem' }} onClick={() => { setShowAdminMenu(false); setShowSettings(true); }}>
              <Settings size={16} /> Edit Settings
            </button>
            <button className="nav-item" style={{ width: '100%', fontSize: '0.9rem', marginBottom: '0.25rem', color: '#60a5fa', padding: '0.6rem 1rem' }} onClick={handleLogout}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        )}


      </div>
    </aside>
  );

  const renderDashboard = () => (
    <div className="main-view">
      <div className="view-header">
        <div className="view-title">
          <h1>Store Performance</h1>
          <p>Real-time analytics and transaction summary.</p>
        </div>
        <button className="checkout-btn" style={{ width: 'auto', padding: '0.75rem 1.5rem' }} onClick={() => setCurrentView('pos')}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> Start New Sale
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><TrendingUp size={24} /></div>
          <div className="stat-info"><h4>Today's Sales</h4><div className="value">₱{todaysSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><CreditCard size={24} /></div>
          <div className="stat-info"><h4>Net Profit</h4><div className="value">₱{todaysProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><Package size={24} /></div>
          <div className="stat-info"><h4>Total Revenue</h4><div className="value">₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><History size={24} /></div>
          <div className="stat-info"><h4>Total Profit</h4><div className="value">₱{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
        </div>
      </div>

      {(() => {
        const lowStock = products.filter(p => typeof p.stock === 'number' && p.stock <= (p.minStock || 5));
        const outOfStock = products.filter(p => typeof p.stock === 'number' && p.stock === 0);
        if (lowStock.length === 0) return null;
        return (
          <div onClick={() => setCurrentView('inventory')} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '1rem', cursor: 'pointer' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#f59e0b' }}>{lowStock.length} item{lowStock.length > 1 ? 's' : ''} low on stock{outOfStock.length > 0 ? ` (${outOfStock.length} out of stock)` : ''}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{lowStock.slice(0, 3).map(p => p.name).join(', ')}{lowStock.length > 3 ? ` +${lowStock.length - 3} more` : ''}</div>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click to view →</span>
          </div>
        );
      })()}

      <div className="view-header" style={{ marginTop: '2.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Product Analytics</h3>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '0.65rem', border: '1px solid var(--border)', gap: '4px' }}>
          {['day', 'week', 'month'].map(period => (
            <button
              key={period}
              onClick={() => setDashboardTimePeriod(period)}
              style={{
                padding: '0.4rem 1.25rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: dashboardTimePeriod === period ? 'var(--accent)' : 'transparent',
                color: dashboardTimePeriod === period ? 'white' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize',
                minWidth: '80px'
              }}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem', marginTop: '1.5rem' }}>
        {/* Sales by Product (Crypto Style Area Chart) */}
        <div className="stat-card" style={{ display: 'block', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} color="#10b981" /> Sales Volume Analysis
              </h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {productSalesData.reduce((acc, p) => acc + p.quantity, 0)} <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 500 }}>+{(Math.random() * 5 + 2).toFixed(1)}%</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peak Performance</div>
              <div style={{ fontWeight: 600, color: '#f59e0b' }}>{productSalesData[0]?.name || 'N/A'}</div>
            </div>
          </div>

          {productSalesData.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>No sales data for this period</div>
          ) : (() => {
            const maxVal = Math.max(...productSalesData.map(p => p.quantity)) || 1;
            const w = 500;
            const h = 180;
            const padding = 10;
            const count = productSalesData.length;

            // Calculate coordinates
            const points = productSalesData.map((p, i) => {
              const x = (i / (count - 1)) * (w - padding * 2) + padding;
              const y = h - ((p.quantity / maxVal) * (h - padding * 2)) - padding;
              return { x, y };
            });

            // Build smooth path string (Cubic Bezier)
            const getPath = (isArea = false) => {
              if (points.length < 2) return "";
              let d = `M ${points[0].x} ${points[0].y}`;
              for (let i = 0; i < points.length - 1; i++) {
                const curr = points[i];
                const next = points[i + 1];
                const cx = (curr.x + next.x) / 2;
                d += ` C ${cx} ${curr.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
              }
              if (isArea) {
                d += ` L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;
              }
              return d;
            };

            return (
              <div style={{ position: 'relative' }}>
                <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '180px', overflow: 'visible', filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.1))' }}>
                  <defs>
                    <linearGradient id="cryptoAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                    <filter id="cryptoGlow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Vertical grid lines */}
                  {points.map((p, i) => (
                    <line key={i} x1={p.x} y1={0} x2={p.x} y2={h} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  ))}

                  {/* Horizontal grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map(f => (
                    <line key={f} x1={0} y1={h * f} x2={w} y2={h * f} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  ))}

                  {/* Area Fill */}
                  <path d={getPath(true)} fill="url(#cryptoAreaGrad)" />

                  {/* The Main Line */}
                  <path d={getPath(false)} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#cryptoGlow)" />

                  {/* Interaction Dots */}
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="4" fill="var(--bg-card)" stroke="#10b981" strokeWidth="2" />
                      {i === points.length - 1 && (
                        <circle cx={p.x} cy={p.y} r="8" fill="#10b981" fillOpacity="0.2">
                          <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </g>
                  ))}
                </svg>

                {/* X-Axis labels (Rotated for crypto feel) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', padding: '0 5px' }}>
                  {productSalesData.map((p, i) => (
                    <div key={i} style={{ fontSize: '0.6rem', color: 'var(--text-muted)', transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap', width: '20px' }}>
                      {p.name.slice(0, 8)}
                    </div>
                  ))}
                </div>

              </div>
            );
          })()}
        </div>

        {/* Stock Analytics Graph */}
        <div className="stat-card" style={{ display: 'block', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>📦 Stock Analytics</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inventory Coverage</div>
          </div>

          {stockLevelData.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>No inventory data available</div>
          ) : (() => {
            const maxVal = Math.max(...stockLevelData.map(p => Math.max(p.stock, p.minStock * 1.5))) || 10;
            const w = 500;
            const h = 200;
            const padding = 15;
            const barCount = stockLevelData.length;
            const chartAreaW = w - padding * 2;
            const barW = (chartAreaW / barCount) * 0.6;
            const barGap = (chartAreaW / barCount) * 0.4;

            return (
              <div style={{ position: 'relative' }}>
                <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '200px', display: 'block', overflow: 'visible' }}>
                  {/* Quantity Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map(f => (
                    <g key={f}>
                      <line x1={0} y1={h * f} x2={w} y2={h * f} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <text x="-5" y={h * (1 - f)} fill="var(--text-muted)" fontSize="8" textAnchor="end" dominantBaseline="middle">
                        {Math.round(maxVal * f)}
                      </text>
                    </g>
                  ))}

                  {stockLevelData.map((p, i) => {
                    const x = i * (barW + barGap) + padding + (barGap / 2);
                    const barHeight = (p.stock / maxVal) * (h - padding);
                    const minLineY = h - (p.minStock / maxVal) * (h - padding);

                    const stockStatus = p.stock === 0 ? 'critical' : p.stock <= p.minStock ? 'warning' : 'normal';
                    const color = stockStatus === 'critical' ? '#ef4444' : stockStatus === 'warning' ? '#f59e0b' : '#10b981';

                    return (
                      <g key={i}>
                        {/* Shadow Bar (Full potential height) */}
                        <rect x={x} y={0} width={barW} height={h} fill="rgba(255,255,255,0.01)" rx="2" />

                        {/* Actual Stock Bar */}
                        <rect x={x} y={h - barHeight} width={barW} height={barHeight} fill={color} fillOpacity="0.8" rx="2">
                          <animate attributeName="height" from="0" to={barHeight} dur="1s" fill="freeze" />
                          <animate attributeName="y" from={h} to={h - barHeight} dur="1s" fill="freeze" />
                        </rect>

                        {/* Min Stock Indicator Line */}
                        <line x1={x - 2} y1={minLineY} x2={x + barW + 2} y2={minLineY} stroke="#ffffff" strokeWidth="1.5" strokeDasharray="2 1" strokeOpacity="0.6" />

                        {/* Label (Truncated) */}
                        <text x={x + barW / 2} y={h + 12} fill="var(--text-muted)" fontSize="8" textAnchor="middle" transform={`rotate(15, ${x + barW / 2}, ${h + 12})`}>
                          {p.name.slice(0, 8)}
                        </text>
                      </g>
                    );
                  })}
                </svg>

              </div>
            );
          })()}
        </div>
      </div>

      <div className="view-header" style={{ marginTop: '2.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Recent Activity</h3>
        <button
          onClick={() => setCurrentView('reports')}
          style={{
            padding: '0.4rem 1.25rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '0.65rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          View All History
        </button>
      </div>

      <div className="data-table-container" style={{ marginTop: '1.5rem' }}>
        <table className="data-table">
          <thead><tr><th>ID</th><th>Date & Time</th><th>Items</th><th>Total Amount</th><th>Payment Method</th><th>Status</th></tr></thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No recent history found</td></tr>
            ) : transactions.slice(0, 5).map(t => (
              <tr key={t.id}>
                <td>{String(t.id).split('-')[1]}</td>
                <td>{t.date}</td>
                <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{Array.isArray(t.items) ? t.items.map(i => `${i.quantity}x ${i.name}`).join(', ') : t.items}</td>
                <td style={{ fontWeight: 700 }}>₱{parseFloat(t.total || 0).toFixed(2)}</td>
                <td>{t.paymentMethod || 'N/A'}</td>
                <td><span className={`badge ${t.status === 'voided' ? 'danger' : 'success'}`}>{t.status === 'voided' ? 'Voided' : 'Paid'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="view-header" style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem' }}>Quick Access</h3>
        <button className="action-btn" onClick={() => setCurrentView('pos')}>Go to POS</button>
      </div>

      <div className="product-grid" style={{ minHeight: 'auto', marginBottom: '2rem' }}>
        {products.slice(0, 4).map(p => (
          <div key={`dash-${p.id}`} className="product-card" style={{ height: 'auto', padding: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <img src={p.image} className="product-image" style={{ height: '140px', objectFit: 'cover' }} alt="" />
              <button className="action-btn" style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', padding: 0 }} onClick={(e) => { e.stopPropagation(); addToCart(p, true); }}><Plus size={20} /></button>
            </div>
            <div className="product-info" style={{ marginTop: '0.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>{p.name}</h3>
              <p style={{ fontSize: '1.1rem', color: 'var(--accent)', fontWeight: 700 }}>₱{parseFloat(p.price || 0).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCustomerModal = () => {
    if (!showCustomerModal) return null;
    const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch)));

    const handleAddCustomer = (e) => {
      e.preventDefault();
      if (!newCustomer.name) return;
      const customer = { id: `CUST-${Date.now()}`, name: newCustomer.name, phone: newCustomer.phone, email: newCustomer.email, points: 0, joinDate: new Date().toLocaleDateString() };
      setCustomers([...customers, customer]);
      setAllocatedCustomer(customer);
      setShowCustomerModal(false);
      setNewCustomer({ name: '', phone: '', email: '' });
      setCustomerSearch('');
    };

    return (
      <div className="modal-overlay" onClick={() => setShowCustomerModal(false)} style={{ zIndex: 1100 }}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
          <h2>Allocate Customer</h2>
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input autoFocus type="text" className="search-bar" style={{ width: '100%', paddingLeft: '2rem' }} placeholder="Search existing customers..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
          </div>
          {customerSearch && (
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
              {filteredCustomers.length === 0 ? <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No customers found.</div> : filteredCustomers.map(c => (
                <div key={c.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => { setAllocatedCustomer(c); setShowCustomerModal(false); setCustomerSearch(''); }}>
                  <div><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.phone} | {c.points} pts</div></div>
                  <button type="button" className="action-btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Select</button>
                </div>
              ))}
            </div>
          )}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />
          <h3>Add New Customer</h3>
          <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="text" required className="search-bar" placeholder="Customer Name *" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
            <input type="text" className="search-bar" placeholder="Phone Number" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
            <input type="email" className="search-bar" placeholder="Email Address" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="button" className="action-btn" style={{ flex: 1 }} onClick={() => setShowCustomerModal(false)}>Cancel</button>
              <button type="submit" className="checkout-btn" style={{ flex: 1 }}>Save & Allocate</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderPagination = (totalItems) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;
    return (
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1.5rem', justifyContent: 'center' }}>
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="action-btn" style={{ padding: '0.5rem 1rem' }}>Previous</button>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages}</span>
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="action-btn" style={{ padding: '0.5rem 1rem' }}>Next</button>
      </div>
    );
  };

  const renderPOS = () => {
    if (!products || isInitializing) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><p style={{ color: 'var(--text-muted)' }}>Loading products...</p></div>;

    const filtered = products.filter(p => {
      try {
        const name = String(p.name || '').toLowerCase();
        const cat = String(p.category || '');
        const id = String(p.id || '').toLowerCase();
        const barcode = String(p.barcode || '').toLowerCase();
        const query = (searchQuery || '').toLowerCase();
        return (selectedCategory === 'All' || cat === selectedCategory) && (name.includes(query) || id.includes(query) || barcode.includes(query));
      } catch (e) { return false; }
    });

    const safeCurrentPage = Math.max(1, currentPage || 1);
    const paginated = filtered.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

    return (
      <div className="pos-layout-wrapper" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100%', overflow: 'hidden', width: '100%' }}>
        <main className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {(validationErrors.barcode || validationErrors.quantity) && (
            <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>{validationErrors.barcode && <div>{validationErrors.barcode}</div>}{validationErrors.quantity && <div>{validationErrors.quantity}</div>}</div>
            </div>
          )}

          <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input id="barcode-input" type="text" placeholder="🔍 Scan barcode or type SKU, then press Enter" className="search-bar" style={{ width: '100%', fontSize: '1.05rem', height: '52px', border: `2px solid ${scanFlash ? '#10b981' : 'var(--accent)'}`, background: scanFlash ? 'rgba(16,185,129,0.07)' : undefined }} value={barcodeInput} onChange={e => { setBarcodeInput(e.target.value); setValidationErrors({}); }} autoComplete="off" />
              {scanFlash && <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontWeight: 700, fontSize: '0.9rem', pointerEvents: 'none' }}>✓ Added!</span>}
            </div>
            <input type="number" min="1" max="9999" className="search-bar" style={{ width: '110px', height: '52px', textAlign: 'center', fontWeight: 700 }} value={purchaseQuantity} onChange={e => { setPurchaseQuantity(Math.max(1, parseInt(e.target.value, 10) || 1)); setValidationErrors({}); }} aria-label="Quantity" />
            <button type="submit" className="checkout-btn" style={{ width: 'auto', minWidth: '120px', padding: '0 1.25rem' }}>Add Item</button>
          </form>

          <div className="pos-header-actions" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
              <Search size={22} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Search products..." className="search-bar" style={{ paddingLeft: '3.5rem', width: '100%', fontSize: '1.1rem', height: '52px', border: '2px solid var(--border)' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="categories-pills" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '5px' }}>
              {categories.map(c => <button key={c} className={`category-btn ${selectedCategory === c ? 'active' : ''}`} onClick={() => setSelectedCategory(c)} style={{ whiteSpace: 'nowrap', padding: '0.6rem 1.2rem' }}>{c}</button>)}
            </div>
          </div>

          <div className="product-scroll-area" style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
            {favorites.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.65rem' }}>⭐ Quick Favorites</div>
                <div style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '4px' }}>
                  {products.filter(p => favorites.includes(p.id)).map(p => (
                    <button key={`fav-${p.id}`} onClick={() => { addToCart(p, false, 1); showToast(`✓ ${p.name} added`, 'success'); }} style={{ flexShrink: 0, background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: '0.75rem', padding: '0.55rem 1rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', minWidth: '110px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700 }}>₱{parseFloat(p.price).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <section className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {paginated.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', background: 'var(--bg-card)', borderRadius: '1.5rem', border: '1px dashed var(--border)' }}>
                  <Package size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No items found</p>
                </div>
              ) : paginated.map(p => {
                const isUnlimited = typeof p.stock !== 'number';
                const isOutOfStock = !isUnlimited && p.stock <= 0;
                const isLowStock = !isUnlimited && !isOutOfStock && p.stock <= (p.minStock || 5);
                return (
                  <div key={p.id} className={`product-card ${isOutOfStock ? 'disabled' : ''}`} onClick={() => { if (isOutOfStock) return; addToCart(p, false, purchaseQuantity); setPurchaseQuantity(1); showToast(`✓ ${p.name} added to cart`, 'success'); }} style={{ height: '100%', opacity: isOutOfStock ? 0.6 : 1, cursor: isOutOfStock ? 'not-allowed' : 'pointer', position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={p.image} className="product-image" alt="" style={{ height: '150px', objectFit: 'cover' }} />
                      {!isUnlimited && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', background: isOutOfStock ? '#ef4444' : isLowStock ? '#f59e0b' : 'rgba(16,185,129,0.9)', color: 'white', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, zIndex: 10 }}>
                          {isOutOfStock ? 'OUT OF STOCK' : `${p.stock} LEFT`}
                        </div>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id, e); }} style={{ position: 'absolute', top: '8px', left: '8px', background: favorites.includes(p.id) ? 'rgba(245,158,11,0.92)' : 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '15px', backdropFilter: 'blur(4px)', zIndex: 11 }}>
                        {favorites.includes(p.id) ? '⭐' : '☆'}
                      </button>
                      {!isOutOfStock && <div className="add-btn" style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'var(--accent)', color: 'white', border: 'none' }}><Plus size={20} /></div>}
                    </div>
                    <div className="product-info" style={{ marginTop: '0.5rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{p.name}</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.category} • {p.unit}</p>
                    </div>
                    <div className="product-footer" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="price" style={{ fontSize: '1.2rem', color: 'var(--accent)', fontWeight: 700 }}>₱{parseFloat(p.price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
          {renderPagination(filtered.length)}
        </main>

        <aside className="cart-panel" style={{ borderRadius: 0, borderTop: 0, borderRight: 0, borderBottom: 0 }}>
          <div className="cart-header">
            <h3>Bill Details</h3>
            <span className="badge warning" style={{ padding: '0.4rem 0.8rem' }}>{cart.length} ITEMS</span>
          </div>
          {storeProfile.enableCRM && (
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
              {allocatedCustomer ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(59,130,246,0.1)', padding: '0.65rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</div>
                    <div style={{ fontWeight: 700, color: '#60a5fa' }}>{allocatedCustomer.name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({allocatedCustomer.points} pts)</span></div>
                  </div>
                  <button type="button" onClick={() => setAllocatedCustomer(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}><X size={18} /></button>
                </div>
              ) : (
                <button type="button" className="action-btn" onClick={() => setShowCustomerModal(true)} style={{ width: '100%', padding: '0.65rem', borderStyle: 'dashed' }} title="Link this sale to a customer to track points and purchase history.">+ Allocate Customer</button>
              )}
            </div>
          )}
          <div className="cart-items">
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '6rem', opacity: 0.3 }}>
                <CartIcon size={64} style={{ marginBottom: '1rem' }} />
                <p style={{ fontSize: '1.1rem' }}>No items in cart</p>
              </div>
            ) : cart.map(item => (
              <div key={item.id} className="cart-item">
                <img src={item.image} className="cart-item-img" alt="" />
                <div className="cart-item-info">
                  <h4 style={{ fontSize: '0.9rem' }}>{item.name}</h4>
                  <p style={{ color: 'var(--accent)', fontWeight: 600 }}>₱{parseFloat(item.price || 0).toFixed(2)} x {item.quantity}</p>
                </div>
                <div className="quantity-controls">
                  <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                  <span style={{ minWidth: '1.5rem', textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                </div>
                <button type="button" className="action-btn danger" onClick={() => voidCartItem(item.id)} style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}>Void</button>
              </div>
            ))}
          </div>
          <div className="cart-footer" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => setIsVatSale(true)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: isVatSale ? 'var(--accent)' : 'transparent',
                  color: isVatSale ? 'white' : 'var(--text-muted)',
                  border: `1px solid ${isVatSale ? 'var(--accent)' : 'var(--border)'}`,
                  transition: 'all 0.2s ease'
                }}
              >
                VAT REG
              </button>
              <button
                type="button"
                onClick={() => setIsVatSale(false)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: !isVatSale ? '#6b7280' : 'transparent',
                  color: !isVatSale ? 'white' : 'var(--text-muted)',
                  border: `1px solid ${!isVatSale ? '#6b7280' : 'var(--border)'}`,
                  transition: 'all 0.2s ease'
                }}
              >
                NON-VAT
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.9rem',
                borderRadius: '0.75rem',
                border: `2px solid ${isSeniorSale ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer',
                background: isSeniorSale ? 'rgba(16,185,129,0.08)' : 'transparent',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isSeniorSale ? '0 0 15px rgba(16,185,129,0.1)' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    background: isSeniorSale ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    color: isSeniorSale ? 'white' : 'var(--text-muted)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    transition: 'all 0.2s ease'
                  }}>👵</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSeniorSale ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Senior / PWD</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Apply 20% PH Legal Discount</div>
                  </div>
                </div>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  border: `2px solid ${isSeniorSale ? 'var(--accent)' : 'var(--border)'}`,
                  background: isSeniorSale ? 'var(--accent)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}>
                  {isSeniorSale && <Check size={16} color="white" strokeWidth={3} />}
                </div>
                <input type="checkbox" checked={isSeniorSale} onChange={e => setIsSeniorSale(e.target.checked)} style={{ display: 'none' }} />
              </label>

              {isSeniorSale && (
                <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <input
                    type="text"
                    placeholder="ID Number"
                    style={{
                      height: '42px',
                      fontSize: '0.85rem',
                      padding: '0 1.2rem',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.75rem',
                      color: 'var(--text-primary)',
                      width: '100%',
                      outline: 'none'
                    }}
                    value={seniorInfo.id}
                    onChange={e => setSeniorInfo({ ...seniorInfo, id: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Customer Name"
                    style={{
                      height: '42px',
                      fontSize: '0.85rem',
                      padding: '0 1.2rem',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.75rem',
                      color: 'var(--text-primary)',
                      width: '100%',
                      outline: 'none'
                    }}
                    value={seniorInfo.name}
                    onChange={e => setSeniorInfo({ ...seniorInfo, name: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="summary-row" style={{ color: 'var(--text-secondary)' }}><span>Subtotal</span><span>₱{subtotal.toFixed(2)}</span></div>
            <div className="summary-row" style={{ color: 'var(--text-secondary)' }}><span>{isVatSale ? 'VAT (12%)' : 'NON-VAT (0%)'}</span><span>₱{tax.toFixed(2)}</span></div>
            {cartMetrics.discount > 0 && (
              <div className="summary-row" style={{ color: '#ef4444', fontWeight: 600 }}><span>SC/PWD Discount</span><span>-₱{cartMetrics.discount.toFixed(2)}</span></div>
            )}
            <div className="summary-row total" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px dashed var(--border)' }}>
              <span>Grand Total</span><span style={{ fontSize: '1.75rem', color: 'var(--accent)' }}>₱{total.toFixed(2)}</span>
            </div>
            <button className="action-btn danger" disabled={cart.length === 0} onClick={voidCurrentSale} style={{ marginTop: '0.75rem' }}>Void Current Sale</button>
            <button className="checkout-btn" disabled={cart.length === 0} onClick={handleCheckout} style={{ marginTop: '1.5rem' }}>Confirm Payment</button>
          </div>
        </aside>
      </div>
    );
  };

  const renderInventory = () => {
    const filteredInv = products.filter(p =>
      p.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      p.id.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      String(p.barcode || '').toLowerCase().includes(inventorySearch.toLowerCase()) ||
      p.category.toLowerCase().includes(inventorySearch.toLowerCase())
    );
    const paginated = filteredInv.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
      <div className="main-view">
        <div className="view-header">
          <div className="view-title"><h1>Product Inventory</h1><p>Maintain your product catalog and stock levels.</p></div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="action-btn secondary" onClick={handleDownloadTemplate}><Download size={18} /> Download Template</button>
            <button className="action-btn secondary" onClick={() => fileInputRef.current.click()}><Upload size={18} /> Bulk Import</button>
            <input type="file" ref={fileInputRef} hidden accept=".xlsx,.xls" onChange={handleImport} />
            <button className="checkout-btn" style={{ width: 'auto' }} onClick={() => setShowAddProduct(true)}><Plus size={18} /> Add Product</button>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search inventory by name, barcode, SKU, or category..." className="search-bar" style={{ paddingLeft: '3rem', width: '100%' }} value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} />
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>ID/SKU</th><th>Product Details</th><th>Category</th><th>Sales Price</th><th>Stock Status</th><th>Unit</th><th>Action</th></tr></thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '4rem' }}>No matching products found</td></tr>
              ) : paginated.map(p => {
                const isUnlimited = typeof p.stock !== 'number';
                const isOutOfStock = !isUnlimited && p.stock <= 0;
                const isLowStock = !isUnlimited && !isOutOfStock && p.stock <= (p.minStock || 5);
                const stockColor = isOutOfStock ? '#f87171' : isLowStock ? '#f59e0b' : isUnlimited ? 'var(--text-muted)' : '#10b981';
                return (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      <div>{p.barcode || p.id}</div>
                      {p.barcode && p.barcode !== p.id && <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{p.id}</div>}
                    </td>
                    <td><div style={{ fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PH-Inventory-Item</div></td>
                    <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)' }}>{p.category}</span></td>
                    <td style={{ fontWeight: 600 }}>₱{parseFloat(p.price || 0).toFixed(2)}</td>
                    <td style={{ fontWeight: 600, color: stockColor }}>
                      {isUnlimited ? <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>UNLIMITED</span> : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stockColor }}></span>{p.stock} {p.unit}</div>
                          {isLowStock && <div style={{ fontSize: '0.65rem', fontWeight: 400, marginTop: '2px' }}>Threshold: {p.minStock || 5}</div>}
                        </>
                      )}
                    </td>
                    <td>{p.unit}</td>
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }} onClick={() => { setEditingProduct(p); setShowAddProduct(false); }}><Edit size={18} /></button>
                      <button style={{ background: 'none', color: '#f87171', border: 'none', cursor: 'pointer' }} onClick={() => deleteProduct(p.id)}><Trash2 size={18} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {renderPagination(filteredInv.length)}
      </div>
    );
  };

  const renderReports = () => {
    const today = new Date().toLocaleDateString();
    const now = new Date();
    const filtered = transactions.filter(t => {
      if (reportDateFilter === 'today' && new Date(t.date).toLocaleDateString() !== today) return false;
      if (reportDateFilter === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); if (new Date(t.date) < d) return false; }
      if (reportDateFilter === 'month') { const d = new Date(now); d.setDate(d.getDate() - 30); if (new Date(t.date) < d) return false; }
      if (reportPaymentFilter !== 'all' && t.paymentMethodId !== reportPaymentFilter) return false;
      if (reportCashierFilter !== 'all' && t.cashier !== reportCashierFilter) return false;
      if (ledgerSearch) {
        const s = ledgerSearch.toLowerCase();
        const matchesRef = (t.id || '').toLowerCase().includes(s);
        const matchesExtRef = (t.referenceNumber || '').toLowerCase().includes(s);
        const itemsStr = Array.isArray(t.items) ? t.items.map(i => i.name).join(' ').toLowerCase() : String(t.items).toLowerCase();
        if (!matchesRef && !matchesExtRef && !itemsStr.includes(s)) return false;
      }
      return true;
    });

    const uniqueCashiers = [...new Set(transactions.map(t => t.cashier).filter(Boolean))];
    const filterBtnStyle = (active) => ({ padding: '0.4rem 0.9rem', borderRadius: '2rem', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent)' : 'transparent', color: active ? 'white' : 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 500 });
    const selectStyle = { padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.82rem', cursor: 'pointer' };

    return (
      <div className="main-view" style={{ overflowY: 'auto', height: '100%' }}>
        <div className="view-header">
          <div className="view-title"><h1>Sales Ledger</h1><p>Exportable transaction history for your reports.</p></div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {birSettings.enabled && (
              <>
                <button className="action-btn" onClick={handlePrintXReading} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa' }}><Printer size={18} /> Print X-Reading</button>
                <button className="action-btn" onClick={handlePrintZReading} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border)' }}><Printer size={18} /> Print Z-Reading</button>
              </>
            )}
            <button className="action-btn" onClick={() => {
              if (filtered.length === 0) { showToast('No records match the current filters.', 'error'); return; }
              const ws = XLSX.utils.json_to_sheet(filtered);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'DailySales');
              XLSX.writeFile(wb, `Sales_Report_${Date.now()}.xlsx`);
              showToast(`✅ Exported ${filtered.length} records to Excel.`, 'success');
            }}><Download size={18} /> Export Results</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center', padding: '1rem 1.25rem', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border)', marginTop: '1.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter:</span>
          {[['all', 'All Time'], ['today', 'Today'], ['week', 'This Week'], ['month', 'This Month']].map(([v, label]) => (
            <button key={v} style={filterBtnStyle(reportDateFilter === v)} onClick={() => setReportDateFilter(v)}>{label}</button>
          ))}
          <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
          <select style={selectStyle} value={reportPaymentFilter} onChange={e => setReportPaymentFilter(e.target.value)}>
            <option value="all">All Payments</option>
            {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select style={selectStyle} value={reportCashierFilter} onChange={e => setReportCashierFilter(e.target.value)}>
            <option value="all">All Cashiers</option>
            {uniqueCashiers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', position: 'relative', width: '220px' }}>
            <input type="text" className="search-bar" style={{ width: '100%', paddingLeft: '2.2rem', height: '36px', fontSize: '0.85rem' }} placeholder="Search Ref, Items..." value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)} />
            <Search size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="data-table-container" style={{ marginTop: '1.5rem' }}>
          <table className="data-table">
            <thead><tr><th>Reference #</th><th>Date</th><th>Description</th><th>Payment Method</th><th>Ref / Auth</th><th>VAT Type</th><th>VAT Amount</th><th>Final Amount</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="10" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>{transactions.length === 0 ? 'No sales recorded yet.' : 'No records match the selected filters.'}</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} style={{ opacity: t.status === 'voided' ? 0.65 : 1 }}>
                  <td style={{ color: '#60a5fa', fontWeight: 600 }}>{t.id}</td>
                  <td>{t.date}</td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <div>{Array.isArray(t.items) ? t.items.map(i => `${i.quantity}x ${i.name}`).join(', ') : t.items}</div>
                    {t.status === 'voided' && <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.25rem' }}>Void: {t.voidReason || 'No reason provided'}{t.voidApprovedBy && <span> | Approved by: {t.voidApprovedBy}</span>}</div>}
                  </td>
                  <td>{t.paymentMethod || 'N/A'}</td>
                  <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{t.referenceNumber || '-'}{t.cardLast4 && <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{t.cardNetwork} (** {t.cardLast4})</div>}</td>
                  <td><span className={`badge ${t.vatType === 'NON-VAT' ? 'warning' : 'success'}`}>{t.vatType || 'VAT'}</span></td>
                  <td>₱{parseFloat(t.tax || 0).toFixed(2)}</td>
                  <td style={{ fontWeight: 700, fontSize: '1rem' }}>₱{parseFloat(t.total || 0).toFixed(2)}</td>
                  <td><span className={`badge ${t.status === 'voided' ? 'danger' : 'success'}`}>{t.status === 'voided' ? 'Voided' : 'Paid'}</span></td>
                  <td>{t.status === 'voided' ? <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.voidedAt || '-'}</span> : <button type="button" className="action-btn danger" onClick={() => handleVoidTransaction(t.id)} style={{ padding: '0.45rem 0.75rem' }}>Void</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAuth = () => (
    <div className="login-page" style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div className="login-card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', background: 'var(--bg-card)', borderRadius: '1.5rem', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div className="logo-area" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
          <div className="logo-icon"><Store size={36} /></div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>FreshPOS</h1>
        </div>

        {isProcessingLogin ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 size={48} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500, opacity: 0.8 }}>Verifying credentials...</p>
          </div>
        ) : authView === 'login' ? (
          <form onSubmit={handleLoginSubmit}>
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Sign In to your account</h2>
            {loginAttemptWarning && <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}><AlertCircle size={16} style={{ flexShrink: 0 }} /><span>{loginAttemptWarning}</span></div>}
            {validationErrors.email && <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}><AlertCircle size={16} style={{ flexShrink: 0 }} /><span>{validationErrors.email}</span></div>}
            {validationErrors.password && <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}><AlertCircle size={16} style={{ flexShrink: 0 }} /><span>{validationErrors.password}</span></div>}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Username</label>
              <input required type="text" className="search-bar" style={{ width: '100%', marginTop: '0.5rem' }} value={loginForm.email} onChange={e => { setLoginForm({ ...loginForm, email: e.target.value }); setValidationErrors({}); }} placeholder="e.g. admin" />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>3-20 characters, alphanumeric with _ or -</p>
            </div>
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Password</label>
              <input required type="password" className="search-bar" style={{ width: '100%', marginTop: '0.5rem' }} value={loginForm.password} onChange={e => { setLoginForm({ ...loginForm, password: e.target.value }); setValidationErrors({}); }} placeholder="Enter password" />
            </div>
            <button type="submit" className="checkout-btn" style={{ width: '100%', marginBottom: '1.5rem', padding: '1rem' }} disabled={isProcessingLogin}>Login to System</button>
            <div style={{ textAlign: 'center' }}>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }} onClick={() => { setAuthView('reset'); setValidationErrors({}); }}>Forgot Password?</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit}>
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Reset Password</h2>
            {Object.keys(validationErrors).length > 0 && (
              <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.85rem' }}>
                {Object.values(validationErrors).map((err, i) => <div key={i} style={{ display: 'flex', gap: '0.5rem' }}><AlertCircle size={16} style={{ flexShrink: 0 }} /><span>{err}</span></div>)}
              </div>
            )}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Username</label>
              <input required type="text" className="search-bar" style={{ width: '100%', marginTop: '0.5rem' }} value={resetForm.email} onChange={e => { setResetForm({ ...resetForm, email: e.target.value }); setValidationErrors({}); }} placeholder="admin" />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>New Password</label>
              <input required type="password" className="search-bar" style={{ width: '100%', marginTop: '0.5rem' }} value={resetForm.newPassword} onChange={e => { setResetForm({ ...resetForm, newPassword: e.target.value }); setPasswordStrength(getPasswordStrength(e.target.value)); setValidationErrors({}); }} placeholder="Min 8 chars with upper, lower, number, special" />
              {resetForm.newPassword && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>{[0, 1, 2, 3].map(i => <div key={i} style={{ height: '4px', flex: 1, background: passwordStrength > i ? (i < 2 ? '#f97316' : i < 3 ? '#eab308' : '#22c55e') : 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />)}</div>
                  <span style={{ color: passwordStrength < 2 ? '#f97316' : passwordStrength < 3 ? '#eab308' : '#22c55e' }}>{['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength]}</span>
                </div>
              )}
            </div>
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Confirm Password</label>
              <input required type="password" className="search-bar" style={{ width: '100%', marginTop: '0.5rem' }} value={resetForm.confirmPassword} onChange={e => { setResetForm({ ...resetForm, confirmPassword: e.target.value }); setValidationErrors({}); }} placeholder="Confirm new password" />
            </div>
            <button type="submit" className="checkout-btn" style={{ width: '100%', marginBottom: '1.5rem', padding: '1rem' }}>Update Password</button>
            <div style={{ textAlign: 'center' }}>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }} onClick={() => { setAuthView('login'); setValidationErrors({}); }}>Back to Sign In</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );



  const renderForceChangeModal = () => (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'left', gap: '0' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem' }}>🔐</div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.4rem' }}>Change Your Password</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>You must set a new password before continuing. An OTP will be sent to verify.</p>
        </div>

        {forceChangeStep === 'change' ? (
          <form onSubmit={handleForceChangeSubmit}>
            {forceChangeError && <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.82rem', display: 'flex', gap: '0.5rem' }}><AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />{forceChangeError}</div>}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>New Password</label>
              <input required autoFocus type="password" className="search-bar" style={{ width: '100%', color: 'var(--text-primary)' }} value={forceChangeForm.newPassword} onChange={e => { setForceChangeForm(f => ({ ...f, newPassword: e.target.value })); setForceChangePwStrength(getPasswordStrength(e.target.value)); setForceChangeError(''); }} placeholder="Min 8 chars, upper, lower, number, special" />
              {forceChangeForm.newPassword && (
                <div style={{ marginTop: '0.4rem' }}>
                  <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>{[0, 1, 2, 3].map(i => <div key={i} style={{ height: '3px', flex: 1, borderRadius: '2px', background: forceChangePwStrength > i ? (i < 2 ? '#f97316' : i < 3 ? '#eab308' : '#22c55e') : 'rgba(255,255,255,0.1)' }} />)}</div>
                  <span style={{ fontSize: '0.72rem', color: forceChangePwStrength < 2 ? '#f97316' : forceChangePwStrength < 3 ? '#eab308' : '#22c55e' }}>{['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][forceChangePwStrength]}</span>
                </div>
              )}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Confirm Password</label>
              <input required type="password" className="search-bar" style={{ width: '100%', color: 'var(--text-primary)' }} value={forceChangeForm.confirmPassword} onChange={e => { setForceChangeForm(f => ({ ...f, confirmPassword: e.target.value })); setForceChangeError(''); }} placeholder="Re-enter new password" />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Email Address <span style={{ color: '#f59e0b' }}>(OTP will be sent here)</span></label>
              <input required type="email" className="search-bar" style={{ width: '100%', color: 'var(--text-primary)' }} value={forceChangeForm.email} onChange={e => { setForceChangeForm(f => ({ ...f, email: e.target.value })); setForceChangeError(''); }} placeholder="e.g. yourname@email.com" />
            </div>
            <button type="submit" className="checkout-btn" style={{ width: '100%' }}>Send OTP &amp; Continue</button>
          </form>
        ) : (
          <form onSubmit={handleOtpVerify}>
            <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.75rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              OTP sent to <strong style={{ color: 'var(--text-primary)' }}>{forceChangeForm.email}</strong>
            </div>
            {otpError && <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.82rem', display: 'flex', gap: '0.5rem' }}><AlertCircle size={15} style={{ flexShrink: 0 }} />{otpError}</div>}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Enter 6-digit OTP</label>
              <input required autoFocus type="text" inputMode="numeric" maxLength={6} className="search-bar" style={{ width: '100%', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 700, color: 'var(--text-primary)' }} value={otpInput} onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '')); setOtpError(''); }} placeholder="------" />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="action-btn" style={{ flex: 1 }} onClick={() => setForceChangeStep('change')}>← Back</button>
              <button type="submit" className="checkout-btn" style={{ flex: 2 }}>Verify &amp; Set Password</button>
            </div>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline' }} onClick={() => {
                const generated = String(Math.floor(100000 + Math.random() * 900000));
                setOtpCode(generated);
                emailjs.send('service_hi4ywgn', 'template_3swxmyo', { to_email: forceChangeForm.email, to_name: forceChangeUser?.username || 'User', otp_code: generated }, 'c0zc4zxCJrfMnM5As');
                setOtpInput('');
                setOtpError('');
              }}>Resend OTP</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  const renderSharedUI = () => (
    <>
      {forceChangeUser && renderForceChangeModal()}

      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.65rem', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.1rem', borderRadius: '0.9rem', background: t.type === 'error' ? 'rgba(239,68,68,0.95)' : t.type === 'warning' ? 'rgba(245,158,11,0.95)' : 'rgba(16,185,129,0.95)', color: 'white', fontSize: '0.88rem', fontWeight: 500, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', maxWidth: '360px' }}>
            <span>{t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : '✅'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {confirmModal && (
        <div className="modal-overlay" onClick={() => { confirmModal.onCancel?.(); setConfirmModal(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'left', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{confirmModal.title}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="action-btn" style={{ flex: 1 }} onClick={() => { confirmModal.onCancel?.(); setConfirmModal(null); }}>Cancel</button>
              <button className="checkout-btn" style={{ flex: 1 }} onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {promptModal && (
        <div className="modal-overlay" onClick={() => setPromptModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'left', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{promptModal.title}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>{promptModal.message}</p>
            <input autoFocus type="text" className="search-bar" style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }} placeholder={promptModal.placeholder} value={promptValue} onChange={e => setPromptValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && promptValue.trim()) { promptModal.onConfirm(promptValue.trim()); setPromptModal(null); } if (e.key === 'Escape') setPromptModal(null); }} />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="action-btn" style={{ flex: 1 }} onClick={() => setPromptModal(null)}>Cancel</button>
              <button className="checkout-btn" style={{ flex: 1 }} disabled={!promptValue.trim()} onClick={() => { promptModal.onConfirm(promptValue.trim()); setPromptModal(null); }}>Submit</button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        position: 'fixed',
        bottom: '1.25rem',
        left: '1.25rem',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        background: 'var(--bg-card)',
        padding: '0.6rem 1.1rem',
        borderRadius: '2rem',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
        fontSize: '0.75rem',
        fontWeight: 700,
        backdropFilter: 'blur(8px)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: isOnline ? '#10b981' : '#f59e0b',
          boxShadow: isOnline ? '0 0 10px #10b981' : '0 0 10px #f59e0b',
          animation: isOnline ? 'none' : 'pulse 1.5s infinite'
        }} />
        <span style={{ color: isOnline ? 'var(--text-primary)' : '#f59e0b', letterSpacing: '0.05em' }}>
          {isOnline ? 'CLOUD SYNC ACTIVE' : 'WORKING OFFLINE'}
        </span>
        {!isOnline && <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', opacity: 0.8 }}> (Local Storage Engaged)</span>}
      </div>
    </>
  );

  // ─────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────

  if (isInitializing) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
        <Loader2 className="animate-spin" size={48} style={{ color: 'var(--accent)', marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Initializing FreshPOS...</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>Preparing your database and inventory.</p>
        {renderSharedUI()}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="app-container">
        {renderAuth()}
        {renderSharedUI()}
      </div>
    );
  }

  return (
    <div className="app-container">
      {renderSidebar()}

      <main className="content-area" style={{ position: 'relative' }}>
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'pos' && renderPOS()}
        {currentView === 'inventory' && renderInventory()}
        {currentView === 'reports' && renderReports()}
      </main>

      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px', width: '100%', margin: '0 auto', position: 'relative', padding: '1.5rem' }}>
            <button className="close-btn" onClick={() => setEditingProduct(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}><X size={24} /></button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center', paddingRight: '20rem' }}>Edit Product</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}><label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Product Name</label><input type="text" className="search-bar" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}><label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Price (₱)</label><input type="number" className="search-bar" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || '' })} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}><label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Cost Price (₱)</label><input type="number" className="search-bar" value={editingProduct.costPrice} onChange={e => setEditingProduct({ ...editingProduct, costPrice: parseFloat(e.target.value) || '' })} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}><label style={{ fontSize: '0.9rem', fontWeight: 600 }}>In Stock</label><input type="number" className="search-bar" value={editingProduct.stock} onChange={e => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || '' })} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Tax Status</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.65rem 0.75rem', borderRadius: '0.5rem', cursor: 'pointer', border: '1px solid var(--border)' }}>
                    <input type="checkbox" checked={editingProduct.isVatExempt} onChange={e => setEditingProduct({ ...editingProduct, isVatExempt: e.target.checked })} />
                    <span style={{ fontSize: '0.85rem' }}>VAT Exempt</span>
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}><label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Unit</label><select className="search-bar" style={{ background: 'rgba(255,255,255,0.05)', cursor: 'pointer', color: 'var(--text-primary)', padding: '0.75rem' }} value={editingProduct.unit || 'ea'} onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value })}><option value="ea" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Piece (ea)</option><option value="pack" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Pack</option><option value="box" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Box</option><option value="kg" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Kilogram (kg)</option><option value="g" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Gram (g)</option><option value="liter" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Liter (L)</option><option value="ml" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Milliliter (ml)</option><option value="dozen" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Dozen</option></select></div>
              <button className="checkout-btn" style={{ marginTop: '1rem' }} onClick={() => { const updatedProduct = { ...editingProduct, price: parseFloat(editingProduct.price) || 0, stock: parseInt(editingProduct.stock) || 0 }; setProducts(prev => prev.map(p => p.id === editingProduct.id ? updatedProduct : p)); setEditingProduct(null); showToast('✓ Product updated successfully', 'success'); }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {isTrialExpired && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="auth-card" style={{ maxWidth: '450px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', background: 'rgba(239,68,68,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#ef4444' }}><Loader2 size={40} /></div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem' }}>Trial Period Expired</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>Your 7-day free trial of FreshPOS has ended. Please purchase a license key.</p>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Your Machine ID</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.1em', marginTop: '4px' }}>{machineId}</div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Send this ID to your distributor to get your activation key.</p>
            </div>
            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <label>Enter Activation Key</label>
              <input type="text" className="search-bar" placeholder="FPOS-XXXX-XXXX-XXXX" value={licenseInput} onChange={(e) => { setLicenseInput(e.target.value.toUpperCase()); setLicenseError(''); }} />
              {licenseError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>{licenseError}</p>}
            </div>
            <button className="checkout-btn" style={{ width: '100%', marginBottom: '1rem' }} onClick={() => {
              if (validateLicense(licenseInput)) { setIsLicensed(true); localStorage.setItem('pos_is_licensed', 'true'); showToast('Application Activated Successfully!', 'success'); }
              else { setLicenseError('Invalid Activation Key for this Machine ID.'); }
            }}>Activate Full Version</button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Contact Developer: <strong>itdeveloper081124@gmail.com</strong></p>
          </div>
        </div>
      )}

      {showPaymentMethod && (
        <div className="modal-overlay" onClick={() => { setShowPaymentMethod(false); setSelectedPaymentMethod(null); setIsSelectingCashless(false); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            {!selectedPaymentMethod ? (
              <>
                {!isSelectingCashless ? (
                  <>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>Choose Payment Type</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <button onClick={() => handlePaymentMethodSelect(paymentMethods[0])} style={{ padding: '2.5rem 1.5rem', borderRadius: '1.25rem', border: '2px solid var(--border)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '3rem' }}>💵</span>
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Cash</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Pay with bills & coins</div></div>
                      </button>
                      <button onClick={() => setIsSelectingCashless(true)} style={{ padding: '2.5rem 1.5rem', borderRadius: '1.25rem', border: '2px solid var(--border)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }} onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                        <span style={{ fontSize: '3rem' }}>📱</span>
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Cashless</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>E-Wallet / Card / QR Ph</div></div>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Cashless Options</h2>
                      <button className="action-btn" onClick={() => setIsSelectingCashless(false)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Back</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                      {paymentMethods.filter(m => m.id !== 'cash').map(method => (
                        <button key={method.id} onClick={() => handlePaymentMethodSelect(method)} style={{ padding: '1.25rem', borderRadius: '1rem', border: '2px solid var(--border)', background: 'rgba(255,255,255,0.03)', color: 'inherit', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'all 0.15s' }} onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }} onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                          <span style={{ fontSize: '1.8rem' }}>{method.icon}</span>{method.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <button onClick={() => { setShowPaymentMethod(false); setSelectedPaymentMethod(null); setIsSelectingCashless(false); }} style={{ width: '100%', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'inherit', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              </>
            ) : selectedPaymentMethod.id === 'cash' ? (
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Cash Payment</h2>
                  <span className="badge success" style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>TOTAL: ₱{total.toFixed(2)}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>AMOUNT TENDERED:</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--accent)' }}>₱</span>
                      <input autoFocus type="number" step="0.01" className="search-bar" style={{ width: '100%', paddingLeft: '3rem', fontSize: '2rem', fontWeight: 700, height: '70px', border: '2px solid var(--accent)', background: 'rgba(0,0,0,0.2)' }} value={cashReceived} onChange={e => setCashReceived(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {[100, 200, 500, 1000].map(amt => <button key={amt} className="action-btn" style={{ padding: '0.75rem 0', fontWeight: 700 }} onClick={() => setCashReceived(amt.toString())}>₱{amt}</button>)}
                    <button className="action-btn" style={{ gridColumn: 'span 4', padding: '0.75rem 0', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid #10b981' }} onClick={() => setCashReceived(total.toFixed(2))}>EXACT AMOUNT (₱{total.toFixed(2)})</button>
                  </div>
                  {cashReceived && parseFloat(cashReceived) >= total ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(16,185,129,0.15)', borderRadius: '0.75rem', border: '2px solid #10b981', marginBottom: '1.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>CHANGE:</span>
                      <strong style={{ fontSize: '2.25rem', color: '#10b981' }}>₱{(parseFloat(cashReceived) - total).toFixed(2)}</strong>
                    </div>
                  ) : cashReceived ? (
                    <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: '0.75rem', border: '1px solid #ef4444', marginBottom: '1.5rem', color: '#ef4444', textAlign: 'center', fontWeight: 600 }}>Insufficient Amount</div>
                  ) : null}
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="action-btn" style={{ flex: 1, height: '54px' }} onClick={() => setSelectedPaymentMethod(null)}>Back</button>
                    <button className="checkout-btn" style={{ flex: 2, height: '54px' }} disabled={!cashReceived || parseFloat(cashReceived) < total} onClick={() => completeTransaction(selectedPaymentMethod, cashReceived)}>Complete Sale</button>
                  </div>
                </div>
              </div>
            ) : (selectedPaymentMethod.id === 'gcash' || selectedPaymentMethod.id === 'maya' || selectedPaymentMethod.id === 'qr_ph') ? (
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: selectedPaymentMethod.id === 'gcash' ? '#2563eb' : selectedPaymentMethod.id === 'maya' ? '#10b981' : 'inherit' }}>{selectedPaymentMethod.name} Payment</h2>
                  <span className="badge" style={{ padding: '0.5rem 1rem', fontSize: '1rem', background: 'rgba(255,255,255,0.05)' }}>₱{total.toFixed(2)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Option A: Customer Scans Merchant</label>
                    <div style={{ background: 'white', padding: '10px', borderRadius: '0.75rem', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', minWidth: '140px', minHeight: '140px' }}>
                      {(selectedPaymentMethod.id === 'gcash' ? storeProfile.gcashQR : storeProfile.mayaQR) ? (
                        <img src={selectedPaymentMethod.id === 'gcash' ? storeProfile.gcashQR : storeProfile.mayaQR} alt="Official QR" style={{ width: '140px', height: '140px', display: 'block', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ width: '140px', height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', fontSize: '0.65rem', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🖼️</div>
                          <div>No Official QR Uploaded</div>
                          <div style={{ marginTop: '4px', opacity: 0.7 }}>Set in Settings &gt; Store Profile</div>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', border: '1px dashed var(--border)', marginTop: '1rem' }}>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Express Send to:</p>
                      <strong style={{ fontSize: '1rem', letterSpacing: '1px' }}>{(selectedPaymentMethod.id === 'gcash' ? storeProfile.gcashNumber : storeProfile.mayaNumber) || 'No Number Set'}</strong>
                    </div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>Option B: Merchant Scans Customer</label>
                    <div style={{ background: 'rgba(16,185,129,0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px dashed #10b981', textAlign: 'center', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📷</div>
                      <p style={{ fontSize: '0.75rem', margin: 0, fontWeight: 500 }}>Scanner is ACTIVE</p>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>Please scan the QR on customer's phone</p>
                    </div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>REFERENCE / TOKEN:</label>
                    <input autoFocus type="text" className="search-bar" style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700, height: '48px', border: `2px solid ${cashlessRef.length >= 8 ? '#10b981' : 'var(--border)'}`, background: 'rgba(255,255,255,0.05)' }} value={cashlessRef} onChange={e => setCashlessRef(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && cashlessRef.length >= 8) completeTransaction(selectedPaymentMethod); }} placeholder="Scan or Enter Ref #" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                      <button className="checkout-btn" style={{ width: '100%', height: '52px' }} disabled={!cashlessRef || cashlessRef.length < 8} onClick={() => completeTransaction(selectedPaymentMethod)}>Confirm Transaction</button>
                      <button className="action-btn" style={{ width: '100%', height: '44px' }} onClick={() => setSelectedPaymentMethod(null)}>Back</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Card Details</h2>
                  <span className="badge" style={{ padding: '0.5rem 1rem', fontSize: '1rem', background: 'rgba(255,255,255,0.05)' }}>₱{total.toFixed(2)}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>NETWORK:</label>
                      <select className="search-bar" style={{ width: '100%', height: '48px', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }} value={cardNetwork} onChange={e => setCardNetwork(e.target.value)}>
                        {['Visa', 'Mastercard', 'BancNet', 'JCB', 'Amex'].map(n => <option key={n} value={n} style={{ color: 'black' }}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>LAST 4 DIGITS:</label>
                      <input type="text" className="search-bar" style={{ width: '100%', height: '48px', textAlign: 'center', fontSize: '1.1rem', background: 'rgba(255,255,255,0.05)' }} value={last4} onChange={e => setLast4(e.target.value.replace(/[^0-9]/g, ''))} placeholder="xxxx" maxLength={4} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>APPROVAL / AUTH CODE:</label>
                    <input autoFocus type="text" className="search-bar" style={{ width: '100%', height: '52px', fontSize: '1.2rem', fontWeight: 700, textAlign: 'center', letterSpacing: '2px', border: `2px solid ${cashlessRef ? 'var(--accent)' : 'var(--border)'}`, background: 'rgba(255,255,255,0.05)' }} value={cashlessRef} onChange={e => setCashlessRef(e.target.value)} placeholder="ENTER CODE FROM TERMINAL" />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="action-btn" style={{ flex: 1, height: '50px' }} onClick={() => setSelectedPaymentMethod(null)}>Back</button>
                    <button className="checkout-btn" style={{ flex: 2, height: '50px' }} disabled={!cashlessRef} onClick={() => completeTransaction(selectedPaymentMethod)}>Complete Card Sale</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showInvoice && (
        <div className="modal-overlay" onClick={resetCart}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="success-icon" style={{ background: '#10b981', color: 'white' }}>✓</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Payment Received</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Receipt has been generated and saved.</p>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '1rem', marginTop: '1rem', textAlign: 'left', fontSize: '0.9rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><strong>Ref:</strong><span>{transactions[0]?.id}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><strong>Payment Method:</strong><span>{transactions[0]?.paymentMethod || 'N/A'}</span></div>
              {transactions[0]?.referenceNumber && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><strong>{transactions[0]?.paymentMethodId.includes('card') ? 'Auth Code:' : 'Ref No:'}</strong><span>{transactions[0]?.referenceNumber}</span></div>}
              {transactions[0]?.cardLast4 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><strong>Card:</strong><span>{transactions[0]?.cardNetwork} (**** {transactions[0]?.cardLast4})</span></div>}
              <div style={{ borderTop: '1px dashed var(--border)', margin: '0.75rem 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><strong>Amount Tendered:</strong><span>₱{parseFloat(transactions[0]?.amountReceived || 0).toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><strong>Total Amount:</strong><span style={{ fontWeight: 700 }}>₱{parseFloat(transactions[0]?.total || 0).toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', marginTop: '0.5rem', paddingTop: '0.5rem', color: '#10b981' }}>
                <strong>Change:</strong><strong>₱{parseFloat(transactions[0]?.change || 0).toFixed(2)}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="action-btn" onClick={handlePrint} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none' }}><Printer size={18} /> Reprint Receipt</button>
              <button className="checkout-btn" onClick={resetCart} style={{ flex: 1 }}>Process Next</button>
            </div>
          </div>
        </div>
      )}

      {voidApproval && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'left', maxWidth: '460px' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>{voidApproval.title}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>BIR mode is enabled. Admin or supervisor approval is required.</p>
            <form onSubmit={handleVoidApprovalSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Swipe ID</label>
                <input autoFocus type="password" className="search-bar" style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }} value={voidApprovalForm.swipeId} onChange={e => setVoidApprovalForm({ ...voidApprovalForm, swipeId: e.target.value })} placeholder="Swipe supervisor/admin ID card" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <div style={{ height: '1px', flex: 1, background: 'var(--border)' }} /><span>OR ENTER CREDENTIALS</span><div style={{ height: '1px', flex: 1, background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Username</label><input type="text" className="search-bar" style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }} value={voidApprovalForm.username} onChange={e => setVoidApprovalForm({ ...voidApprovalForm, username: e.target.value })} placeholder="Admin/Supervisor username" /></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label><input type="password" className="search-bar" style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }} value={voidApprovalForm.password} onChange={e => setVoidApprovalForm({ ...voidApprovalForm, password: e.target.value })} placeholder="Password" /></div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="action-btn" style={{ flex: 1 }} onClick={() => setVoidApproval(null)}>Cancel</button>
                <button type="submit" className="checkout-btn" style={{ flex: 1 }}>Approve Void</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddProduct && (
        <div className="modal-overlay" onClick={() => setShowAddProduct(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'left', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Add New Product</h2>
            <form onSubmit={handleAddProduct}>
              <div style={{ marginBottom: '1rem' }}><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Barcode / SKU</label><input type="text" className="search-bar" style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }} value={newProduct.barcode} onChange={e => setNewProduct({ ...newProduct, barcode: e.target.value.trim() })} placeholder="Scan or enter item barcode" /></div>
              <div style={{ marginBottom: '1rem' }}><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Product Name</label><input required type="text" className="search-bar" style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }} value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Selling Price (₱)</label><input required type="number" step="0.01" className="search-bar" style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }} value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} /></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Cost Price (₱)</label><input required type="number" step="0.01" className="search-bar" style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }} value={newProduct.costPrice} onChange={e => setNewProduct({ ...newProduct, costPrice: e.target.value })} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Category</label>
                  <select required className="search-bar" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', color: 'var(--text-primary)' }} value={newProduct.category} onChange={e => setNewProduct(prev => ({ ...prev, category: e.target.value }))}>
                    <option value="" disabled style={{ color: 'var(--text-muted)', background: 'var(--bg-main)' }}>Select a category</option>
                    {['Milk', 'Coffee', 'Canned Meat', 'Canned Fish', 'Noodles', 'Biscuits', 'Condiments', 'Snacks', 'Beverages', 'Toilet Soap', 'Laundry Soap', 'Shampoo', 'Household'].map(c => (
                      <option key={c} value={c} style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>{c}</option>
                    ))}
                  </select>
                </div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Unit</label><select required className="search-bar" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', color: 'var(--text-primary)' }} value={newProduct.unit} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}><option value="" disabled style={{ color: 'var(--text-muted)', background: 'var(--bg-main)' }}>Select unit</option><option value="ea" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Piece (ea)</option><option value="pack" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Pack</option><option value="box" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Box</option><option value="kg" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Kilogram (kg)</option><option value="g" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Gram (g)</option><option value="liter" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Liter (L)</option><option value="ml" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Milliliter (ml)</option><option value="dozen" style={{ color: 'var(--text-primary)', background: 'var(--bg-main)' }}>Dozen</option></select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>In Stock</label><input type="number" className="search-bar" style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }} value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} /></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Stock Alert Limit</label><input type="number" min="1" className="search-bar" style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }} value={newProduct.minStock} onChange={e => setNewProduct({ ...newProduct, minStock: e.target.value })} /></div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Tax Type</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.7rem 0.8rem', borderRadius: '0.75rem', cursor: 'pointer', border: '1px solid var(--border)' }}>
                  <input type="checkbox" checked={newProduct.isVatExempt} onChange={e => setNewProduct({ ...newProduct, isVatExempt: e.target.checked })} />
                  <span style={{ fontSize: '0.85rem' }}>VAT Exempt (BNPC)</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="action-btn" style={{ flex: 1 }} onClick={() => setShowAddProduct(false)}>Cancel</button>
                <button type="submit" className="checkout-btn" style={{ flex: 1 }}>Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <div><h2>Account Settings</h2><p>{currentUser?.role === 'admin' ? 'Admin controls and store setup' : 'Profile preferences'}</p></div>
              <button type="button" className="settings-close" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <form className="settings-form" onSubmit={handleSaveSettings}>
              <div className="settings-scroll">
                <section className="settings-card settings-card-row">
                  <div className="settings-card-title">
                    {isDarkMode ? <Moon size={20} color="var(--accent)" /> : <Sun size={20} color="#f59e0b" />}
                    <span>Dark Mode</span>
                  </div>
                  <button type="button" className={`toggle-switch ${isDarkMode ? 'active' : ''}`} onClick={() => setIsDarkMode(!isDarkMode)} aria-label="Toggle dark mode"><span /></button>
                </section>

                <section className="settings-card">
                  <h3>Account</h3>
                  <div className="settings-grid two-cols">
                    <label className="settings-field"><span>Username</span><input required type="text" className="search-bar" value={settingsForm.username} onChange={e => setSettingsForm({ ...settingsForm, username: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })} placeholder="admin" /></label>
                    <label className="settings-field"><span>Password</span><input type="password" className="search-bar" value={settingsForm.password} onChange={e => setSettingsForm({ ...settingsForm, password: e.target.value })} placeholder="Leave blank to keep current" /></label>
                  </div>
                </section>

                {currentUser?.role === 'admin' && (
                  <>
                    <section className="settings-card">
                      <h3>Store Profile</h3>
                      <div className="settings-grid">
                        <label className="settings-field"><span>Store Name</span><input type="text" className="search-bar" value={storeForm.name} onChange={e => setStoreForm({ ...storeForm, name: e.target.value })} placeholder="e.g. FRESH GROCERY" /></label>
                        <label className="settings-field"><span>Store Address</span><input type="text" className="search-bar" value={storeForm.address} onChange={e => setStoreForm({ ...storeForm, address: e.target.value })} /></label>
                        <label className="settings-field"><span>Contact / Tel No.</span><input type="text" className="search-bar" value={storeForm.tel} onChange={e => setStoreForm({ ...storeForm, tel: e.target.value })} /></label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <label className="settings-field"><span>GCash Merchant No.</span><input type="text" className="search-bar" value={storeForm.gcashNumber} onChange={e => setStoreForm({ ...storeForm, gcashNumber: e.target.value })} placeholder="0917-123-4567" /></label>
                          <label className="settings-field"><span>Maya Merchant No.</span><input type="text" className="search-bar" value={storeForm.mayaNumber} onChange={e => setStoreForm({ ...storeForm, mayaNumber: e.target.value })} placeholder="0918-987-6543" /></label>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                          <div className="settings-field">
                            <span>GCash QR Image</span>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input type="file" accept="image/*" disabled={isUploadingQR} onChange={async (e) => { const file = e.target.files[0]; if (file) { if (file.size > 5 * 1024 * 1024) { showToast('❌ File is too large (Max 5MB).', 'error'); return; } setIsUploadingQR(true); const reader = new FileReader(); reader.onloadend = async () => { try { const compressed = await compressImage(reader.result); setStoreForm(prev => ({ ...prev, gcashQR: compressed })); } catch (err) { showToast('❌ Compression failed.', 'error'); } finally { setIsUploadingQR(false); } }; reader.readAsDataURL(file); } }} style={{ display: 'none' }} id="upload-gcash-qr" />
                              <label htmlFor="upload-gcash-qr" className="action-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', cursor: isUploadingQR ? 'wait' : 'pointer', opacity: isUploadingQR ? 0.6 : 1 }}>{isUploadingQR ? '⌛ Processing...' : storeForm.gcashQR ? 'Change GCash QR' : 'Upload QR'}</label>
                              {storeForm.gcashQR && <div style={{ width: '30px', height: '30px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}><img src={storeForm.gcashQR} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /></div>}
                            </div>
                          </div>
                          <div className="settings-field">
                            <span>Maya QR Image</span>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input type="file" accept="image/*" disabled={isUploadingQR} onChange={async (e) => { const file = e.target.files[0]; if (file) { if (file.size > 5 * 1024 * 1024) { showToast('❌ File is too large (Max 5MB).', 'error'); return; } setIsUploadingQR(true); const reader = new FileReader(); reader.onloadend = async () => { try { const compressed = await compressImage(reader.result); setStoreForm(prev => ({ ...prev, mayaQR: compressed })); } catch (err) { showToast('❌ Compression failed.', 'error'); } finally { setIsUploadingQR(false); } }; reader.readAsDataURL(file); } }} style={{ display: 'none' }} id="upload-maya-qr" />
                              <label htmlFor="upload-maya-qr" className="action-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', cursor: isUploadingQR ? 'wait' : 'pointer', opacity: isUploadingQR ? 0.6 : 1 }}>{isUploadingQR ? '⌛ Processing...' : storeForm.mayaQR ? 'Change Maya QR' : 'Upload QR'}</label>
                              {storeForm.mayaQR && <div style={{ width: '30px', height: '30px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}><img src={storeForm.mayaQR} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /></div>}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Tax Calculation Mode</h4>
                              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {storeForm.taxMode === 'inclusive' ? 'Inclusive: Tax is inside the price (₱5.00 total)' : 'Exclusive: Tax is added on top (₱5.60 total)'}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button type="button" onClick={() => setStoreForm({ ...storeForm, taxMode: 'inclusive' })} style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--border)', background: storeForm.taxMode === 'inclusive' ? 'var(--accent)' : 'transparent', color: storeForm.taxMode === 'inclusive' ? 'white' : 'var(--text-muted)', fontWeight: 700 }}>INClUSIVE</button>
                              <button type="button" onClick={() => setStoreForm({ ...storeForm, taxMode: 'exclusive' })} style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--border)', background: storeForm.taxMode === 'exclusive' ? 'var(--accent)' : 'transparent', color: storeForm.taxMode === 'exclusive' ? 'white' : 'var(--text-muted)', fontWeight: 700 }}>EXCLUSIVE</button>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Loyalty & CRM System</h4>
                              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enable 'Allocate Customer' to track Suki points and history.</p>
                            </div>
                            <button type="button" className={`toggle-switch ${storeForm.enableCRM ? 'active' : ''}`} onClick={() => setStoreForm({ ...storeForm, enableCRM: !storeForm.enableCRM })} aria-label="Toggle CRM mode"><span /></button>
                          </div>
                        </div>
                      </div>
                    </section>





                    <section className="settings-card">
                      <div className="settings-card-row bir-toggle-row">
                        <div><h3>Legal BIR Mode</h3><p>Receipt compliance fields</p></div>
                        <button type="button" className={`toggle-switch ${settingsForm.birEnabled ? 'active' : ''}`} onClick={() => setSettingsForm({ ...settingsForm, birEnabled: !settingsForm.birEnabled })} aria-label="Toggle BIR mode"><span /></button>
                      </div>
                      {settingsForm.birEnabled && (
                        <div className="settings-grid bir-fields">
                          <label className="settings-field"><span>TIN Number</span><input type="text" className="search-bar" value={settingsForm.tin} onChange={e => setSettingsForm({ ...settingsForm, tin: e.target.value })} placeholder="000-000-000-000" /></label>
                          <label className="settings-field"><span>PTU Number</span><input type="text" className="search-bar" value={settingsForm.ptu} onChange={e => setSettingsForm({ ...settingsForm, ptu: e.target.value })} placeholder="e.g. 1900-123456" /></label>
                          <label className="settings-field"><span>Machine ID Number</span><input type="text" className="search-bar" value={settingsForm.min} onChange={e => setSettingsForm({ ...settingsForm, min: e.target.value })} placeholder="e.g. MIN-0001" /></label>
                        </div>
                      )}
                    </section>

                    <section className="settings-card">
                      <h3>Database Management</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Backup your products and sales to a file to prevent data loss.</p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" className="action-btn" onClick={backupDatabase} style={{ flex: 1, padding: '0.8rem' }}><Download size={18} /> Backup Data</button>
                        <label className="action-btn" style={{ flex: 1, padding: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                          <RefreshCcw size={18} /> Restore Data
                          <input type="file" accept=".json" onChange={restoreDatabase} style={{ display: 'none' }} />
                        </label>
                      </div>
                      <button type="button" className="action-btn" onClick={() => {
                        setConfirmModal({
                          title: 'FACTORY RESET: Delete All Data?',
                          message: 'This will permanently wipe EVERY product, transaction, and user from both this computer and the Supabase CLOUD. There is no undo. Proceed?',
                          onConfirm: async () => {
                            try {
                              setIsResetting(true);
                              showToast('🧹 Wiping Cloud Database...', 'info');
                              
                              await Promise.all([
                                supabase.from('products').delete().neq('name', '___NON_EXISTENT_PROD___'),
                                supabase.from('transactions').delete().neq('id', '___NON_EXISTENT_TRX___'),
                                supabase.from('time_logs').delete().neq('username', '___NON_EXISTENT_USER___'),
                                supabase.from('customers').delete().neq('name', '___NON_EXISTENT_CUST___'),
                                supabase.from('users').delete().neq('username', 'admin') // Keep at least one record to avoid RLS issues if any
                              ]);
                              await db.clear();
                              showToast('Everything Cleared!', 'success');
                              setTimeout(() => window.location.reload(), 1500);
                            } catch (err) {
                              console.error('Reset failed:', err);
                              await db.clear();
                              window.location.reload();
                            }
                          }
                        });
                      }} style={{ width: '100%', marginTop: '1rem', color: '#ef4444', borderColor: '#ef4444' }}>
                        <Trash2 size={16} /> Clear All System Data
                      </button>
                    </section>

                    <section className="settings-card">
                      <h3>Manage Users</h3>
                      <div className="user-list">
                        {users.map(u => (
                          <div key={u.username} className="user-row">
                            <div><strong>{u.username}</strong><span>{u.role.toUpperCase()}</span></div>
                            {u.username !== currentUser.username && <button type="button" className="icon-danger-btn" onClick={() => handleDeleteUser(u.username)} aria-label={`Delete ${u.username}`}><Trash2 size={16} /></button>}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Username</label><input type="text" className="search-bar" style={{ width: '100%' }} value={newUserForm.username} onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })} placeholder="e.g. cashier01" /></div>
                          <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Password</label><input type="password" className="search-bar" style={{ width: '100%' }} value={newUserForm.password} onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })} placeholder="Min 8 characters" /></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Role</label>
                            <select className="search-bar" style={{ width: '100%', cursor: 'pointer', color: 'var(--text-primary)' }} value={newUserForm.role} onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}>
                              <option value="cashier" style={{ color: 'black' }}>Cashier</option>
                              <option value="supervisor" style={{ color: 'black' }}>Supervisor</option>
                            </select>
                          </div>
                          <div><label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Swipe ID</label><input type="text" className="search-bar" style={{ width: '100%' }} value={newUserForm.swipeId} onChange={e => setNewUserForm({ ...newUserForm, swipeId: e.target.value.trim() })} placeholder="Optional" /></div>
                        </div>
                        <button type="button" onClick={handleAddUser} className="checkout-btn" style={{ width: '100%' }} disabled={!newUserForm.username || !newUserForm.password}><Plus size={16} /> Add User</button>
                      </div>
                    </section>
                  </>
                )}
              </div>
              <div className="settings-footer">
                <button type="button" className="action-btn" onClick={() => setShowSettings(false)}>Close</button>
                <button type="submit" className="checkout-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirmSettings && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setShowConfirmSettings(false)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Confirm Changes</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Enter your current password to save changes.</p>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ position: 'relative' }}>
                <input autoFocus type={confirmSettingsShowPw ? 'text' : 'password'} className="search-bar" style={{ width: '100%', paddingRight: '2.5rem' }} value={confirmSettingsPassword} onChange={e => { e.stopPropagation(); setConfirmSettingsPassword(e.target.value); }} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); handleConfirmSettingsSave(); } }} placeholder="Current Password" />
                <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmSettingsShowPw(!confirmSettingsShowPw); }} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {confirmSettingsShowPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmSettingsError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>{confirmSettingsError}</p>}
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="action-btn" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); setShowConfirmSettings(false); }}>Cancel</button>
              <button type="button" className="checkout-btn" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); handleConfirmSettingsSave(); }}>Confirm Save</button>
            </div>
          </div>
        </div>
      )}

      {renderSharedUI()}
      {renderCustomerModal()}

      {/* Hidden Printable Receipt */}
      <div className="printable-receipt">
        {printState === 'receipt' ? (
          <>
            <div className="receipt-header">
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{storeProfile.name || 'STORE NAME'}</h2>
              <p style={{ margin: '2px 0' }}>{storeProfile.address}</p>
              <p style={{ margin: '2px 0' }}>Tel: {storeProfile.tel}</p>
              {birSettings.enabled && birSettings.tin && <p style={{ margin: '2px 0' }}>TIN: {birSettings.tin}</p>}
            </div>
            <div className="receipt-divider"></div>
            <div style={{ fontSize: '0.9rem' }}>
              <p style={{ margin: '2px 0' }}>Ref: {transactions[0]?.id}</p>
              <p style={{ margin: '2px 0' }}>Date: {transactions[0]?.date}</p>
              <p style={{ margin: '2px 0' }}>Cashier: {currentUser?.username || 'SYSTEM'}</p>
              <p style={{ margin: '2px 0' }}>Payment: {transactions[0]?.paymentMethod || 'N/A'}</p>
              {transactions[0]?.referenceNumber && <p style={{ margin: '2px 0' }}>{transactions[0]?.paymentMethodId.includes('card') ? 'Auth Code:' : 'Ref No:'} {transactions[0]?.referenceNumber}</p>}
              {transactions[0]?.cardLast4 && <p style={{ margin: '2px 0' }}>Card: {transactions[0]?.cardNetwork} (**** {transactions[0]?.cardLast4})</p>}
              <p style={{ margin: '2px 0' }}>Sale Type: {isVatSale ? 'VAT' : 'NON-VAT'}</p>
            </div>
            <div className="receipt-divider"></div>
            <div style={{ marginBottom: '5mm' }}>
              {(transactions[0]?.items || cart).map((item, idx) => (
                <div key={`print-${item.id}-${idx}`} className="receipt-item">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{item.quantity} x {parseFloat(item.isSeniorSale ? (item.price / 1.12) * 0.8 : item.price).toFixed(2)} {item.isVatExempt ? '[E]' : '[V]'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>₱{(item.quantity * (transactions[0]?.isSeniorSale ? (item.price / 1.12) * 0.8 : item.price)).toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div className="receipt-divider"></div>
            <div className="receipt-item"><span>VATable Sales</span><span>₱{(transactions[0]?.vatableSales || 0).toFixed(2)}</span></div>
            <div className="receipt-item"><span>VAT Amount (12%)</span><span>₱{(transactions[0]?.tax || 0).toFixed(2)}</span></div>
            <div className="receipt-item"><span>VAT-Exempt Sales</span><span>₱{(transactions[0]?.vatExemptSales || 0).toFixed(2)}</span></div>
            <div className="receipt-item" style={{ borderBottom: '1px solid black', paddingBottom: '2mm' }}><span>Zero-Rated Sales</span><span>₱0.00</span></div>

            {transactions[0]?.discount > 0 && (
              <div className="receipt-item" style={{ marginTop: '2mm', color: 'black', fontWeight: 'bold' }}>
                <span>SC/PWD DISCOUNT</span><span>-₱{(transactions[0]?.discount || 0).toFixed(2)}</span>
              </div>
            )}

            <div className="receipt-item" style={{ fontSize: '1.25rem', fontWeight: '900', marginTop: '2mm' }}>
              <span>TOTAL</span><span>₱{(transactions[0]?.total || 0).toFixed(2)}</span>
            </div>

            <div style={{ marginTop: '4mm' }}>
              <div className="receipt-item"><span>Amt Tendered</span><span>₱{parseFloat(transactions[0]?.amountReceived || 0).toFixed(2)}</span></div>
              <div className="receipt-item"><span>Change</span><span>₱{parseFloat(transactions[0]?.change || 0).toFixed(2)}</span></div>
            </div>

            {transactions[0]?.isSeniorSale && (
              <div style={{ marginTop: '4mm', fontSize: '0.75rem', border: '1px solid black', padding: '2mm' }}>
                <strong>SC/PWD INFO:</strong><br />
                ID: {transactions[0]?.seniorInfo?.id}<br />
                Name: {transactions[0]?.seniorInfo?.name}
              </div>
            )}

            <div className="receipt-divider"></div>
            <div className="receipt-footer">
              <h4 style={{ margin: '5px 0' }}>{birSettings.enabled ? 'OFFICIAL RECEIPT' : 'ORDER SLIP'}</h4>
              {birSettings.enabled ? (
                <>
                  <p>THIS INVOICE/RECEIPT SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF THE PERMIT TO USE.</p>
                  <p style={{ marginTop: '5px' }}>PTU No: {birSettings.ptu || 'PENDING'}</p>
                  <p>MIN: {birSettings.min || 'PENDING'}</p>
                </>
              ) : (
                <p>(Not valid as Official Receipt)</p>
              )}
              <p style={{ marginTop: '10px', fontSize: '1rem', fontWeight: 'bold' }}>THANK YOU, COME AGAIN!</p>
              <p style={{ fontSize: '0.7rem' }}>FreshPOS v2.0 - PH Local Edition</p>
            </div>
          </>
        ) : printState === 'xreading' ? (
          <>
            <div className="receipt-header">
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{storeProfile.name || 'STORE NAME'}</h2>
              <p style={{ margin: '2px 0' }}>{storeProfile.address}</p>
              <h3 style={{ margin: '15px 0 5px 0', fontSize: '1.1rem', fontWeight: 'bold' }}>X-READING REPORT</h3>
              <p style={{ margin: '2px 0' }}>Business Date: {new Date().toLocaleDateString()}</p>
              <p style={{ margin: '2px 0' }}>Print Time: {new Date().toLocaleTimeString()}</p>
              <p style={{ margin: '2px 0' }}>Cashier: {currentUser?.username || 'SYSTEM'}</p>
              {birSettings.enabled && birSettings.tin && <p style={{ margin: '2px 0' }}>TIN: {birSettings.tin}</p>}
            </div>
            <div className="receipt-divider"></div>
            <h3 style={{ margin: '15px 0 5px 0', fontSize: '1.1rem' }}>SALES PER CASHIER</h3>
            <div className="receipt-item"><span>Today's Transactions:</span><span>{todaysTransactions.length}</span></div>
            {Object.values(salesByCashier).length === 0 ? (
              <div className="receipt-item"><span>No cashier sales today</span><span>₱0.00</span></div>
            ) : Object.values(salesByCashier).map(row => (
              <div key={row.cashier} style={{ marginTop: '8px' }}>
                <div className="receipt-item" style={{ fontWeight: 'bold' }}><span>{row.cashier}</span><span>₱{row.total.toFixed(2)}</span></div>
                <div className="receipt-item" style={{ fontSize: '8pt' }}><span>Transactions</span><span>{row.transactions}</span></div>
              </div>
            ))}
            <div className="receipt-item" style={{ fontSize: '1.1rem', fontWeight: 'bold', borderTop: '1px solid black', paddingTop: '5px', marginTop: '8px' }}><span>TOTAL CASHIER SALES:</span><span>₱{todaysSales.toFixed(2)}</span></div>
            <div className="receipt-divider" style={{ marginTop: '30px' }}></div>
            <div className="receipt-footer"><p>*** END OF X-READING ***</p><p style={{ fontSize: '8pt' }}>Interim report only. No sales reset performed.</p></div>
          </>
        ) : (
          <>
            <div className="receipt-header">
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{storeProfile.name || 'STORE NAME'}</h2>
              <p style={{ margin: '2px 0' }}>{storeProfile.address}</p>
              <h3 style={{ margin: '15px 0 5px 0', fontSize: '1.1rem', fontWeight: 'bold' }}>Z-READING REPORT</h3>
              <p style={{ margin: '2px 0' }}>Business Date: {new Date().toLocaleDateString()}</p>
              <p style={{ margin: '2px 0' }}>Print Time: {new Date().toLocaleTimeString()}</p>
              <p style={{ margin: '2px 0' }}>Cashier: {currentUser?.username || 'SYSTEM'}</p>
              {birSettings.enabled && birSettings.tin && <p style={{ margin: '2px 0' }}>TIN: {birSettings.tin}</p>}
            </div>
            <div className="receipt-divider"></div>
            <h3 style={{ margin: '15px 0 5px 0', fontSize: '1.1rem' }}>SALES TOTALS</h3>
            <div className="receipt-item"><span>Today's Transactions:</span><span>{todaysTransactions.length}</span></div>
            <div className="receipt-item" style={{ fontSize: '1.2rem', fontWeight: 'bold', borderTop: '1px solid black', paddingTop: '5px', marginTop: '5px' }}><span>DAILY SALES TOTAL:</span><span>₱{todaysSales.toFixed(2)}</span></div>
            <div className="receipt-divider" style={{ marginTop: '30px' }}></div>
            <div className="receipt-footer">
              <p>*** END OF Z-READING ***</p>
              {birSettings.enabled && <><p style={{ marginTop: '5px' }}>PTU No: {birSettings.ptu || 'PENDING'}</p><p>MIN: {birSettings.min || 'PENDING'}</p></>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
