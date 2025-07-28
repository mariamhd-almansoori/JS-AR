const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

const ATTENDANCE_FILE = path.join(__dirname, 'attendance.json');
const MISMATCH_FILE = path.join(__dirname, 'mismatch.json');

app.use(express.json());

// Helper: read JSON file (returns array), creates file if not exists
async function readJsonArray(file) {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(file, '[]');
      return [];
    }
    throw err;
  }
}

// Helper: append entry to JSON file (array)
async function appendJsonArray(file, entry) {
  const arr = await readJsonArray(file);
  arr.push(entry);
  await fs.writeFile(file, JSON.stringify(arr, null, 2));
}

// 1. Validate Token
app.post('/api/validate_token', async (req, res) => {
  const { token, email, fingerprint } = req.body;
  if (!token || !email || !fingerprint) {
    return res.status(400).json({ valid: false, message: 'Missing fields.' });
  }

  const records = await readJsonArray(ATTENDANCE_FILE);
  const tokenUses = records.filter(rec => rec.token === token);

  if (tokenUses.length === 0) {
    // Token not used before
    return res.json({ valid: true, email, fingerprint });
  }

  // Check previous uses for mismatches
  for (let rec of tokenUses) {
    if (rec.email !== email) {
      return res.json({ valid: false, emailMismatch: true });
    }
    if (rec.fingerprint !== fingerprint) {
      return res.json({ valid: false, fingerprintMismatch: true });
    }
  }
  // All matched (token, email, fingerprint)
  return res.json({ valid: true, email, fingerprint });
});

// 2. Attend (Check-in/Check-out)
app.post('/api/attend', async (req, res) => {
  const { email, fingerprint, token, operation } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (!email || !fingerprint || !token || !operation) {
    return res.status(400).json({ success: false, message: 'Missing fields.' });
  }

  const entry = {
    email,
    fingerprint,
    token,
    operation,
    timestamp: new Date().toISOString(),
    ip,
  };
  try {
    await appendJsonArray(ATTENDANCE_FILE, entry);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal error.' });
  }
});

// 3. Report Mismatch
app.post('/api/report_mismatch', async (req, res) => {
  const { email, fingerprint, token } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (!email || !fingerprint || !token) {
    return res.status(400).json({ success: false, message: 'Missing fields.' });
  }

  const entry = {
    email,
    fingerprint,
    token,
    timestamp: new Date().toISOString(),
    ip,
  };
  try {
    await appendJsonArray(MISMATCH_FILE, entry);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal error.' });
  }
});

// Serve static files (for testing with your frontend)
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
