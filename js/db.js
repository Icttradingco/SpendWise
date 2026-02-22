// ============================================================
// SpendWise - IndexedDB Service Layer
// ============================================================
const DB_NAME = 'SpendWiseDB';
const DB_VERSION = 2;
const STORES = { EXPENSES: 'expenses', SETTINGS: 'settings', CATEGORIES: 'categories' };

const SpendWiseDB = (() => {
  let db = null;

  const open = () =>
    new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORES.EXPENSES)) {
          const store = d.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORES.SETTINGS)) {
          d.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
        if (!d.objectStoreNames.contains(STORES.CATEGORIES)) {
          const catStore = d.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
          catStore.createIndex('name', 'name', { unique: true });
        }
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = (e) => reject(e.target.error);
    });

  const tx = async (store, mode = 'readonly') => {
    const d = await open();
    return d.transaction(store, mode).objectStore(store);
  };

  const promisify = (req) => new Promise((res, rej) => {
    req.onsuccess = (e) => res(e.target.result);
    req.onerror = (e) => rej(e.target.error);
  });

  // ── Expenses ──────────────────────────────────────────────
  const addExpense = async (expense) => {
    const store = await tx(STORES.EXPENSES, 'readwrite');
    const record = {
      id: crypto.randomUUID(),
      amount: parseFloat(expense.amount),
      category: expense.category,
      date: expense.date,
      note: expense.note || '',
      status: 'unpaid',
      paidDate: null,
      createdAt: Date.now(),
    };
    await promisify(store.add(record));
    return record;
  };

  const getAllExpenses = async () => {
    const store = await tx(STORES.EXPENSES);
    const all = await promisify(store.getAll());
    return all.sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);
  };

  const updateExpense = async (expense) => {
    const store = await tx(STORES.EXPENSES, 'readwrite');
    await promisify(store.put(expense));
    return expense;
  };

  const deleteExpense = async (id) => {
    const store = await tx(STORES.EXPENSES, 'readwrite');
    await promisify(store.delete(id));
  };

  // ── Settlement ────────────────────────────────────────────
  const settleCategory = async (category, paidDate) => {
    const all = await getAllExpenses();
    const toSettle = all.filter(
      (e) => e.category === category && e.status === 'unpaid' && e.date <= paidDate
    );
    const store = await tx(STORES.EXPENSES, 'readwrite');
    const settled = [];
    for (const expense of toSettle) {
      const updated = { ...expense, status: 'paid', paidDate };
      await promisify(store.put(updated));
      settled.push(updated);
    }
    return settled;
  };

  // ── Settings ──────────────────────────────────────────────
  const getSetting = async (key, fallback = null) => {
    const store = await tx(STORES.SETTINGS);
    const res = await promisify(store.get(key));
    return res ? res.value : fallback;
  };

  const setSetting = async (key, value) => {
    const store = await tx(STORES.SETTINGS, 'readwrite');
    await promisify(store.put({ key, value }));
  };

  // ── Categories ────────────────────────────────────────────
  const DEFAULT_CATEGORIES = [
    { id: 'food', name: 'Food', icon: 'fa-utensils', color: '#f59e0b' },
    { id: 'rent', name: 'Rent', icon: 'fa-home', color: '#6366f1' },
    { id: 'grocery', name: 'Grocery', icon: 'fa-shopping-cart', color: '#10b981' },
    { id: 'transport', name: 'Transport', icon: 'fa-car', color: '#3b82f6' },
    { id: 'utilities', name: 'Utilities', icon: 'fa-bolt', color: '#8b5cf6' },
    { id: 'entertainment', name: 'Entertainment', icon: 'fa-film', color: '#ec4899' },
    { id: 'health', name: 'Health', icon: 'fa-heartbeat', color: '#ef4444' },
    { id: 'other', name: 'Other', icon: 'fa-ellipsis-h', color: '#64748b' },
  ];

  const initCategories = async () => {
    const store = await tx(STORES.CATEGORIES, 'readwrite');
    const existing = await promisify(store.getAll());
    if (existing.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await promisify(store.put(cat));
      }
    }
    return existing.length > 0 ? existing : DEFAULT_CATEGORIES;
  };

  const getAllCategories = async () => {
    const store = await tx(STORES.CATEGORIES);
    const cats = await promisify(store.getAll());
    if (cats.length === 0) return initCategories();
    return cats.sort((a, b) => a.name.localeCompare(b.name));
  };

  const addCategory = async (cat) => {
    const store = await tx(STORES.CATEGORIES, 'readwrite');
    const record = { id: crypto.randomUUID(), name: cat.name, icon: cat.icon || 'fa-tag', color: cat.color || '#6366f1' };
    await promisify(store.put(record));
    return record;
  };

  const updateCategory = async (cat) => {
    const store = await tx(STORES.CATEGORIES, 'readwrite');
    await promisify(store.put(cat));
    return cat;
  };

  const deleteCategory = async (id) => {
    const store = await tx(STORES.CATEGORIES, 'readwrite');
    await promisify(store.delete(id));
  };

  // ── Reset ─────────────────────────────────────────────────
  const resetAll = async () => {
    const d = await open();
    await Promise.all([
      new Promise((res, rej) => {
        const t = d.transaction([STORES.EXPENSES, STORES.CATEGORIES, STORES.SETTINGS], 'readwrite');
        t.objectStore(STORES.EXPENSES).clear().onsuccess = () => {};
        t.objectStore(STORES.CATEGORIES).clear().onsuccess = () => {};
        t.objectStore(STORES.SETTINGS).clear().onsuccess = () => {};
        t.oncomplete = res;
        t.onerror = rej;
      })
    ]);
    await initCategories();
  };

  return {
    open, addExpense, getAllExpenses, updateExpense, deleteExpense,
    settleCategory, getSetting, setSetting,
    getAllCategories, addCategory, updateCategory, deleteCategory,
    initCategories, resetAll, DEFAULT_CATEGORIES,
  };
})();

window.SpendWiseDB = SpendWiseDB;
