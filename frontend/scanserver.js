require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const https   = require('https');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.get('/', (req, res) => res.json({ status: 'BudgetScout Scan API running' }));

async function LookupBarcode(barcode) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'world.openfoodfacts.org',
      path: `/api/v0/product/${barcode}.json`,
      method: 'GET',
      headers: { 'User-Agent': 'BudgetScout/1.0' },
    }, (vRes) => {
      let data = '';
      vRes.on('data', chunk => data += chunk);
      vRes.on('end', () => {
        try { resolve(JSON.parse(data)?.product?.product_name || null); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

async function parseWalmartReceipt(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  const barcodeRe   = /\b(\d{9,14}[A-Z]{0,2})\b/;
  const itemPriceRe = /^(\d+\.\d{2})\s*[XNTO0]\s*$/;

  // Find item section boundaries
  let startLine = 0;
  let endLine   = lines.length;

  for (let i = 0; i < lines.length; i++) {
    if (barcodeRe.test(lines[i]) && startLine === 0) {
      startLine = Math.max(0, i - 1);
    }
    if (/^subtotal$/i.test(lines[i])) {
      endLine = i;
      break;
    }
  }

  const itemLines = lines.slice(startLine, endLine);
  console.log(`Item section: lines ${startLine}-${endLine}, ${itemLines.length} lines`);

  const nameLines  = [];
  const priceLines = [];

  for (const line of itemLines) {
    // Standalone price with Walmart flag
    if (itemPriceRe.test(line)) {
      priceLines.push(line.match(/(\d+\.\d{2})/)[1]);
      continue;
    }

    // weight lines — skip
    if (/^\d+\.\d+\s*lb/i.test(line)) continue;

    // "2 AT 1 FOR" deal lines — capture price only
    if (/^\d+\s*at\s*\d+\s*for/i.test(line)) {
      const p = line.match(/(\d+\.\d{2})/);
      if (p) priceLines.push(p[1]);
      continue;
    }

    // pure number / percentage lines
    if (/^[\d.,\s%]+$/.test(line)) continue;

    const bcOnlyMatch = line.match(/^(\d{9,14}[A-Z]{0,2})\s*[FXNOTK]?\s*$/);
    if (bcOnlyMatch) continue;

    // must have real letters
    if (!/[A-Za-z]{2,}/.test(line)) continue;
    if (line.length < 2) continue;

    // skips known non-item header lines
    if (/^tc#|^st#|^op#|^te#|^tr#/i.test(line)) continue;

    // should check if this line has only a barcode after the name (no price)
    const bcMatch   = line.match(barcodeRe);
    const hasPrice  = /(\d+\.\d{2})\s*[XNTO0N]\s*$/.test(line);

    // extracts name
    let name = line
      .replace(barcodeRe, '')
      .replace(/(\d+\.\d{2})\s*[XNTO0N]?\s*$/, '')
      .replace(/\s+[FXNOTK]\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!name || name.length < 2) continue;
    if (!/[A-Za-z]{2,}/.test(name)) continue;
    // Skip if it's ALL digits/symbols with no real word letters
    if (/^[\d\s#:*./%-]+$/.test(name)) continue;

    const inlinePrice = line.match(/(\d+\.\d{2})\s*[XNTO0N]\s*$/);
    if (inlinePrice) priceLines.push(inlinePrice[1]);

    nameLines.push({ name, barcode: bcMatch?.[1] ?? null });
  }

  console.log('Names found:', nameLines.map(n => n.name));
  console.log('Prices found:', priceLines);

  const items = [];
  const count = Math.min(nameLines.length, priceLines.length);

  for (let i = 0; i < count; i++) {
    let { name, barcode } = nameLines[i];
    const price = `$${priceLines[i]}`;

    if (barcode) {
      const realName = await LookupBarcode(barcode);
      if (realName) name = realName;
    }

    items.push({ name, price });
    console.log(`  ✓ ${name} — ${price}`);
  }

  return items;
}

app.post('/api/scan', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });
    const API_KEY = process.env.GOOGLE_VISION_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: 'Vision API key not set' });

    const payload = JSON.stringify({
      requests: [{ image: { content: image }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }],
    });

    const visionData = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'vision.googleapis.com',
        path: `/v1/images:annotate?key=${API_KEY}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      }, (vRes) => {
        let data = '';
        vRes.on('data', chunk => data += chunk);
        vRes.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    const rawText = visionData.responses?.[0]?.fullTextAnnotation?.text ?? '';
    if (!rawText) return res.json({ items: [] });

    console.log('\n=== RAW TEXT ===\n', rawText, '\n================\n');
    const items = await parseWalmartReceipt(rawText);
    console.log('\nFinal items:', items);
    res.json({ items });

  } catch (err) {
    console.error('Scan error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Scan server running on port ${PORT}`));