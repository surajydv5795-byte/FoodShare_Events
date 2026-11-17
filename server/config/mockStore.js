// ============================================================
//  FoodShare Events — Resilient In-Memory Storage & Demo Engine
// ============================================================

const bcrypt = require('bcryptjs');

let isInMemoryActive = true;

// Generate standard hex ID resembling MongoDB ObjectId
const generateId = () => {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const random = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return timestamp + random;
};

// Pre-compute common password hash for instant readiness
const commonPass = bcrypt.hashSync('password123', 10);

const donorId = '66f500000000000000000001';
const ngoId = '66f500000000000000000002';
const volunteerId = '66f500000000000000000003';
const adminId = '66f500000000000000000004';

// Initial pre-seeded collections ready immediately
const store = {
  users: [
    {
      _id: donorId,
      name: 'Lord Percival Sterling',
      email: 'donor@foodshare.org',
      password: commonPass,
      role: 'donor',
      organization: 'Sterling Event Hall & Banquets',
      phone: '+91 98200 11223',
      address: '42 Ironworks Avenue, Grand Ballroom',
      isVerified: true,
      isBanned: false,
      ratings: [],
      createdAt: new Date(Date.now() - 7 * 86400000),
    },
    {
      _id: ngoId,
      name: 'Sister Clara Vance',
      email: 'ngo@foodshare.org',
      password: commonPass,
      role: 'ngo',
      organization: 'Steam-Powered Hearth Foundation',
      phone: '+91 98200 44556',
      address: '17 Foundry Street, Community Kitchen',
      isVerified: true,
      isBanned: false,
      ratings: [],
      createdAt: new Date(Date.now() - 14 * 86400000),
    },
    {
      _id: volunteerId,
      name: 'Arthur Pendelton',
      email: 'volunteer@foodshare.org',
      password: commonPass,
      role: 'volunteer',
      phone: '+91 98200 77889',
      address: 'Dockside Courier Station 3',
      isVerified: true,
      isBanned: false,
      ratings: [],
      createdAt: new Date(Date.now() - 20 * 86400000),
    },
    {
      _id: adminId,
      name: 'Chief Inspector Bartholomew',
      email: 'admin@foodshare.org',
      password: commonPass,
      role: 'admin',
      phone: '+91 98200 99999',
      address: 'Central Clockwork Administration Tower',
      isVerified: true,
      isBanned: false,
      ratings: [],
      createdAt: new Date(Date.now() - 30 * 86400000),
    },
  ],
  donations: [
    {
      _id: '66f500000000000000000010',
      donor: donorId,
      eventName: 'Victorian Autumn Gala Banquet',
      foodType: 'cooked',
      description: '85 gourmet banquet meals: roasted chicken, herb potatoes, steamed vegetables, and dinner rolls',
      quantity: '85',
      quantityUnit: 'meals',
      expiryTime: new Date(Date.now() + 6 * 3600000),
      pickupAddress: '42 Ironworks Avenue, Grand Ballroom',
      contactPhone: '+91 98200 11223',
      location: { type: 'Point', coordinates: [72.8777, 19.0760] },
      status: 'PENDING',
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      _id: '66f500000000000000000011',
      donor: donorId,
      eventName: 'Harvest Pavilion Exhibition',
      foodType: 'raw',
      description: '150 kg farm-fresh carrots, potatoes, seasonal squash and grains in wooden crates',
      quantity: '150',
      quantityUnit: 'kg',
      expiryTime: new Date(Date.now() + 18 * 3600000),
      pickupAddress: 'Expo Pavilion 4, Iron District',
      contactPhone: '+91 98200 11223',
      location: { type: 'Point', coordinates: [72.8850, 19.0820] },
      status: 'CLAIMED',
      claimedBy: ngoId,
      claimedAt: new Date(Date.now() - 15 * 60000),
      otp: '482910',
      createdAt: new Date(Date.now() - 4 * 3600000),
    },
    {
      _id: '66f500000000000000000012',
      donor: donorId,
      eventName: 'Tech Artisans Guild Symposium',
      foodType: 'cooked',
      description: '45 packaged artisan bento lunches: fresh sandwiches, whole fruits, and savory pastries',
      quantity: '45',
      quantityUnit: 'meals',
      expiryTime: new Date(Date.now() + 4 * 3600000),
      pickupAddress: 'Guildhall Annex, West Promenade',
      contactPhone: '+91 98200 11223',
      location: { type: 'Point', coordinates: [72.8600, 19.0600] },
      status: 'IN_TRANSIT',
      claimedBy: ngoId,
      claimedAt: new Date(Date.now() - 45 * 60000),
      volunteer: volunteerId,
      volunteerAcceptedAt: new Date(Date.now() - 20 * 60000),
      otp: '739154',
      createdAt: new Date(Date.now() - 5 * 3600000),
    },
    {
      _id: '66f500000000000000000013',
      donor: donorId,
      eventName: 'Spring Clockmakers Wedding',
      foodType: 'cooked',
      description: '120 meals of slow-braised beef stew, basmati rice, and celebration cupcakes',
      quantity: '120',
      quantityUnit: 'meals',
      expiryTime: new Date(Date.now() - 12 * 3600000),
      pickupAddress: 'St. Jude Cathedral Plaza',
      contactPhone: '+91 98200 11223',
      location: { type: 'Point', coordinates: [72.8700, 19.0700] },
      status: 'COMPLETED',
      claimedBy: ngoId,
      claimedAt: new Date(Date.now() - 24 * 3600000),
      volunteer: volunteerId,
      completedAt: new Date(Date.now() - 18 * 3600000),
      createdAt: new Date(Date.now() - 26 * 3600000),
    },
    {
      _id: '66f500000000000000000014',
      donor: donorId,
      eventName: 'Foundry Union Luncheon',
      foodType: 'cooked',
      description: '25 hot meals of fish & chips and coleslaw',
      quantity: '25',
      quantityUnit: 'meals',
      expiryTime: new Date(Date.now() - 30 * 60000),
      pickupAddress: 'Foundry Pier 9',
      contactPhone: '+91 98200 11223',
      location: { type: 'Point', coordinates: [72.8900, 19.0900] },
      status: 'EXPIRED',
      createdAt: new Date(Date.now() - 6 * 3600000),
    }
  ],
};

const seedStore = async () => {
  // Already seeded synchronously
  return store;
};

module.exports = {
  store,
  generateId,
  seedStore,
  isInMemoryActive: () => isInMemoryActive,
  setInMemoryActive: (val) => { isInMemoryActive = val; },
};
