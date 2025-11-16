// backend/models/Notice.js
const mongoose = require('mongoose');

const NoticeSchema = new mongoose.Schema({
  _id: { type: String }, // uuid string
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  author: { type: String },
  date: { type: Date },
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  expiry: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date }
});

module.exports = mongoose.model('Notice', NoticeSchema);
