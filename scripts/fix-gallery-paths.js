require('dotenv').config({ path: require('path').join(__dirname, '..', 'key.env') });
const mongoose = require('mongoose');
const Establishment = require('../models/Establishment');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tafteria');
  const fixes = [
    { from: '/images/subway.jpg', to: '/images/subway.jpeg' },
    { from: '/images/bcs.jpg', to: '/images/bcs.png' },
  ];

  for (const fix of fixes) {
    const result = await Establishment.updateMany(
      { gallery: fix.from },
      { $set: { 'gallery.$[item]': fix.to } },
      { arrayFilters: [{ item: fix.from }] }
    );
    console.log(`${fix.from} -> ${fix.to}: ${result.modifiedCount} establishments updated`);
  }
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
