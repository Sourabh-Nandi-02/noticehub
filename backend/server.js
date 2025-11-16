// backend/server.js (Mongoose / MongoDB Atlas version)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const User = require('./models/User');
const Notice = require('./models/Notice');

const app = express();
app.use(cors());
app.use(express.json());

const PUBLIC_DIR = path.join(__dirname, '..'); // parent directory where index.html lives
app.use(express.static(PUBLIC_DIR));

const MONGODB_URI = process.env.MONGODB_URI || '';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const PORT = process.env.PORT || 10000;

if (!MONGODB_URI) {
  console.warn('MONGODB_URI is not set. The server will still run but database actions will fail.');
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err.message || err);
});

// Helpers
function signToken(user) {
  return jwt.sign({ id: user._id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing Authorization' });
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Auth
app.post('/api/signup', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already exists' });

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const userRole = role === 'admin' ? 'admin' : 'user';
    const user = new User({ _id: id, name, email: email.toLowerCase(), password_hash: hash, role: userRole });
    await user.save();
    return res.json({ ok: true, message: 'Account created' });
  } catch (err) {
    console.error('signup error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    return res.json({ ok: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Notices
app.get('/api/notices', async (req, res) => {
  try {
    const notices = await Notice.find().sort({ created_at: -1 }).lean();
    res.json(notices);
  } catch (err) {
    console.error('get notices', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/notices', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { title, content, category, expiry } = req.body;
  if (!title || !content || !category) return res.status(400).json({ error: 'Missing fields' });

  try {
    const id = uuidv4();
    const notice = new Notice({
      _id: id,
      title, content, category,
      author: req.user.name || req.user.email,
      date: new Date(),
      status: 'pending',
      expiry: expiry ? new Date(expiry) : null
    });
    await notice.save();
    res.json({ ok: true, id: notice._id });
  } catch (err) {
    console.error('create notice', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/notices/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  const { title, content, category, expiry } = req.body;
  try {
    await Notice.updateOne({ _id: id }, { $set: { title, content, category, expiry: expiry ? new Date(expiry) : null, updated_at: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    console.error('update notice', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/notices/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  try {
    await Notice.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch (err) {
    console.error('delete notice', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/notices/:id/status', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  const { status } = req.body;
  if (!['approved','rejected','pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    await Notice.updateOne({ _id: id }, { $set: { status, updated_at: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    console.error('status update', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
