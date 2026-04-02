/**
 * Inserts extra Taft establishments if they are not already in the DB (matched by name).
 * Run: node scripts/seed-additional-establishments.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'key.env') });
const mongoose = require('mongoose');
const Establishment = require('../models/Establishment');

const ADDITIONAL = [
  {
    name: 'Tapa King',
    mainImage: '/images/brothers.jpg',
    phone: '(02) 8524-1100',
    rating: 0,
    reviewsCount: 0,
    description:
      'Classic tapsilog and silog plates—quick, filling, and perfect between classes.',
    gallery: ['/images/brothers.jpg', '/images/brothers.jpg', '/images/brothers.jpg'],
    category: 'Stall',
    lat: 14.5642,
    lng: 120.9938,
  },
  {
    name: 'Jollibee Taft',
    mainImage: '/images/subway.jpeg',
    phone: '(02) 8524-2200',
    rating: 0,
    reviewsCount: 0,
    description:
      'Fried chicken, Jolly Spaghetti, and burgers—the Taft crowd favorite for a reason.',
    gallery: ['/images/subway.jpg', '/images/subway.jpg', '/images/subway.jpg'],
    category: 'Fastfood',
    lat: 14.566,
    lng: 120.993,
  },
  {
    name: 'Starbucks Taft',
    mainImage: '/images/prelude.jpg',
    phone: '(02) 8524-3300',
    rating: 0,
    reviewsCount: 0,
    description: 'Coffee, study sessions, and air-conditioned comfort along Taft Avenue.',
    gallery: ['/images/prelude.jpg', '/images/prelude.jpg', '/images/prelude.jpg'],
    category: 'Cafe',
    lat: 14.5647,
    lng: 120.9936,
  },
  {
    name: 'BonChon Taft',
    mainImage: '/images/24chk.jpg',
    phone: '(02) 8524-4400',
    rating: 0,
    reviewsCount: 0,
    description:
      'Korean-style crispy chicken with soy garlic glaze—great for sharing after group work.',
    gallery: ['/images/24chk.jpg', '/images/24chk.jpg', '/images/24chk.jpg'],
    category: 'Fastfood',
    lat: 14.5658,
    lng: 120.9925,
  },
  {
    name: 'KFC Taft',
    mainImage: '/images/mongolian.jpg',
    phone: '(02) 8524-5500',
    rating: 0,
    reviewsCount: 0,
    description: 'Buckets, zingers, and rice meals when you need something familiar and fast.',
    gallery: ['/images/mongolian.jpg', '/images/mongolian.jpg', '/images/mongolian.jpg'],
    category: 'Fastfood',
    lat: 14.564,
    lng: 120.9928,
  },
  {
    name: "Manang's Chicken",
    mainImage: '/images/bcs.png',
    phone: '(02) 8524-6600',
    rating: 0,
    reviewsCount: 0,
    description: 'Crispy chicken with signature sauces—stall vibes with big flavor.',
    gallery: ['/images/bcs.jpg', '/images/bcs.jpg', '/images/bcs.jpg'],
    category: 'Stall',
    lat: 14.5654,
    lng: 120.9942,
  },
];

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tafteria';
  await mongoose.connect(uri);
  for (const doc of ADDITIONAL) {
    const exists = await Establishment.findOne({ name: doc.name });
    if (exists) {
      console.log('Skip (exists):', doc.name);
      continue;
    }
    await Establishment.create(doc);
    console.log('Inserted:', doc.name);
  }
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
