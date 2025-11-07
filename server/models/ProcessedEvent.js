// server/models/ProcessedEvent.js
const mongoose = require('mongoose');

const processedEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  processedAt: { type: Date, default: Date.now },
});

// Auto-expire records after 90 days (optional cleanup)
processedEventSchema.index(
  { processedAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

module.exports = mongoose.model('ProcessedEvent', processedEventSchema);
