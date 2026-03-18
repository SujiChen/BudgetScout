import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('inventory.db');

// ─── Initialize Tables ───────────────────────────────────────────────────────

export function initDatabase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      category    TEXT    DEFAULT 'Uncategorized',
      price       REAL    DEFAULT 0.0,
      barcode     TEXT,
      is_favorite INTEGER DEFAULT 0,
      purchases   INTEGER DEFAULT 0,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
  `);
}

// ─── Products ─────────────────────────────────────────────────────────────────

/**
 * Add a new product to the inventory.
 * Returns the inserted product's id.
 */
export function addProduct({ name, category = 'Uncategorized', price = 0.0, barcode = null }) {
  const result = db.runSync(
    `INSERT INTO products (name, category, price, barcode)
     VALUES (?, ?, ?, ?)`,
    [name, category, price, barcode]
  );
  return result.lastInsertRowId;
}

/**
 * Remove a product from the inventory.
 */
export function deleteProduct(productId) {
  db.runSync(`DELETE FROM products WHERE id = ?`, [productId]);
}

/**
 * Toggle the favorite status of a product.
 */
export function toggleFavorite(productId) {
  db.runSync(
    `UPDATE products
     SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END
     WHERE id = ?`,
    [productId]
  );
}

/**
 * Increment the purchase count for a product by 1.
 */
export function recordPurchase(productId) {
  db.runSync(
    `UPDATE products SET purchases = purchases + 1 WHERE id = ?`,
    [productId]
  );
}

/**
 * Search and filter products.
 * filter: 'all' | 'favorites'
 * sort:   'name' | 'freq_desc' | 'freq_asc' | 'price_desc' | 'price_asc'
 */
export function getProducts({ query = '', filter = 'all', sort = 'name' } = {}) {
  const sortMap = {
    name:       'name ASC',
    freq_desc:  'purchases DESC',
    freq_asc:   'purchases ASC',
    price_desc: 'price DESC',
    price_asc:  'price ASC',
  };
  const orderBy = sortMap[sort] || 'name ASC';

  const conditions = [];
  const params = [];

  if (query) {
    conditions.push(`(name LIKE ? OR category LIKE ?)`);
    params.push(`%${query}%`, `%${query}%`);
  }

  if (filter === 'favorites') {
    conditions.push(`is_favorite = 1`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  return db.getAllSync(
    `SELECT * FROM products ${where} ORDER BY ${orderBy}`,
    params
  );
}

/**
 * Get a single product by id.
 */
export function getProductById(productId) {
  return db.getFirstSync(
    `SELECT * FROM products WHERE id = ?`,
    [productId]
  );
}

/**
 * Find a product by barcode (used by Scan Class).
 */
export function getProductByBarcode(barcode) {
  return db.getFirstSync(
    `SELECT * FROM products WHERE barcode = ?`,
    [barcode]
  );
}

/**
 * Summary stats for the header cards.
 */
export function getDatabaseStats() {
  const total     = db.getFirstSync(`SELECT COUNT(*) AS count FROM products`);
  const favorites = db.getFirstSync(`SELECT COUNT(*) AS count FROM products WHERE is_favorite = 1`);
  const avgPrice  = db.getFirstSync(`SELECT ROUND(AVG(price), 2) AS avg FROM products`);

  return {
    totalItems:    total?.count     ?? 0,
    favoriteItems: favorites?.count ?? 0,
    avgPrice:      avgPrice?.avg    ?? 0,
  };
}

export default db;