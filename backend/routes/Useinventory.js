import { useState, useEffect, useCallback } from 'react';
import {
  initDatabase,
  getProducts,
  getDatabaseStats,
  addProduct,
  deleteProduct,
  toggleFavorite,
  recordPurchase,
} from './database';

// ─── One-time init (call this at app root) ────────────────────────────────────
export function useInitDatabase() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initDatabase();
    setReady(true);
  }, []);
  return ready;
}

// ─── Main inventory hook ──────────────────────────────────────────────────────
export function useInventory() {
  const [products, setProducts] = useState([]);
  const [stats, setStats]       = useState({});
  const [query, setQuery]       = useState('');
  const [filter, setFilter]     = useState('all');  // 'all' | 'favorites'
  const [sort, setSort]         = useState('name'); // 'name' | 'freq_desc' | 'freq_asc' | 'price_desc' | 'price_asc'
  const [loading, setLoading]   = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    setProducts(getProducts({ query, filter, sort }));
    setStats(getDatabaseStats());
    setLoading(false);
  }, [query, filter, sort]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAdd = useCallback((productData) => {
    addProduct(productData);
    refresh();
  }, [refresh]);

  const handleDelete = useCallback((productId) => {
    deleteProduct(productId);
    refresh();
  }, [refresh]);

  const handleToggleFavorite = useCallback((productId) => {
    toggleFavorite(productId);
    refresh();
  }, [refresh]);

  const handlePurchase = useCallback((productId) => {
    recordPurchase(productId);
    refresh();
  }, [refresh]);

  return {
    products,
    stats,
    loading,
    query,    setQuery,
    filter,   setFilter,
    sort,     setSort,
    handleAdd,
    handleDelete,
    handleToggleFavorite,
    handlePurchase,
    refresh,
  };
}