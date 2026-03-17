const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: String,
      trim: true,
      default: 'Uncategorized',
    },
    price: {
      current: { type: Number, default: 0 },
      highest: { type: Number, default: 0 },
      lowest:  { type: Number, default: Infinity },
    },
    purchaseHistory: [
      {
        date:  { type: Date, default: Date.now },
        price: { type: Number, required: true },
        store: { type: String, default: null },
      },
    ],
    // Total times purchased — drives Frequent / Infrequent logic
    purchaseCount: {
      type: Number,
      default: 0,
    },
    // Favorite flag + when it was favorited
    isFavorite: {
      type: Boolean,
      default: false,
    },
    favoritedAt: {
      type: Date,
      default: null,
    },
    // Frequent threshold: recalculated by the /metrics route
    // but also stored here for quick reads
    frequencyLabel: {
      type: String,
      enum: ['frequent', 'infrequent'],
      default: 'infrequent',
    },
    isOnSale: {
      type: Boolean,
      default: false,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// ── Indexes for fast lookups ──────────────────────────────────────────────────
ProductSchema.index({ name: 'text', category: 'text' }); // full-text search
ProductSchema.index({ barcode: 1 });
ProductSchema.index({ purchaseCount: -1 });
ProductSchema.index({ isFavorite: 1 });

// ── Virtual: total spend on this product ─────────────────────────────────────
ProductSchema.virtual('totalSpent').get(function () {
  return this.purchaseHistory.reduce((sum, p) => sum + p.price, 0);
});

// ── Pre-save: keep price.highest / price.lowest in sync ──────────────────────
ProductSchema.pre('save', function (next) {
  if (this.purchaseHistory.length > 0) {
    const prices = this.purchaseHistory.map((p) => p.price);
    this.price.highest = Math.max(...prices);
    this.price.lowest  = Math.min(...prices);
  }
  next();
});

module.exports = mongoose.model('Product', ProductSchema);