require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const connectDB    = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// ── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());               // allows requests from Expo Go (any origin)
app.use(express.json());       // parse JSON request bodies

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/products', require('./routes/products'));
app.use('/api/metrics',  require('./routes/metrics'));

// Health check
app.get('/', (req, res) => res.json({ status: 'Grocery DB API running' }));

// ── Error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));