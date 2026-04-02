/**
 * One-time: set lat/lng on establishments by name (Taft area, approximate).
 * Run from project root: node scripts/backfill-establishment-coordinates.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'key.env') });
const mongoose = require('mongoose');
const Establishment = require('../models/Establishment');

const COORDS = {
  '24 Chicken': { lat: 14.56525, lng: 120.99345 },
  'Prelude Cafe': { lat: 14.56455, lng: 120.99285 },
  "Ate Rica's Bacsilog": { lat: 14.56495, lng: 120.99315 },
  'Mongolian Master': { lat: 14.56505, lng: 120.99215 },
  "Brother's Burger": { lat: 14.56435, lng: 120.99355 },
  Subway: { lat: 14.56515, lng: 120.99405 },
  'Tapa King': { lat: 14.5642, lng: 120.9938 },
  'Jollibee Taft': { lat: 14.566, lng: 120.993 },
  'Starbucks Taft': { lat: 14.5647, lng: 120.9936 },
  'BonChon Taft': { lat: 14.5658, lng: 120.9925 },
  'KFC Taft': { lat: 14.564, lng: 120.9928 },
  "Manang's Chicken": { lat: 14.5654, lng: 120.9942 },
};

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tafteria';
  await mongoose.connect(uri);
  for (const [name, { lat, lng }] of Object.entries(COORDS)) {
    const r = await Establishment.updateOne({ name }, { $set: { lat, lng } });
    console.log(name, r.modifiedCount ? 'updated' : 'no match or unchanged');
  }
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
