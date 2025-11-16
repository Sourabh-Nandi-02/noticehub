// backend/migrate.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Set MONGODB_URI env var before running migrate.js');
  process.exit(1);
}

(async () => {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB for migration');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const adminPass = process.env.ADMIN_PASS || 'Admin@123';
  const existing = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existing) {
    console.log('Admin already exists:', adminEmail);
  } else {
    const hash = await bcrypt.hash(adminPass, 10);
    const id = uuidv4();
    const admin = new User({ _id: id, name: 'Admin User', email: adminEmail.toLowerCase(), password_hash: hash, role: 'admin' });
    await admin.save();
    console.log('Admin user created:', adminEmail, 'Password:', adminPass);
  }

  await mongoose.disconnect();
  console.log('Migration finished');
  process.exit(0);
})();
