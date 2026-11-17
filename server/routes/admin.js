const express = require('express');
const router = express.Router();
const User = require('../models/User.js');
const Donation = require('../models/Donation.js');
const auth = require('../middleware/auth.js');

// Admin authorization middleware
const adminAuth = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Master Ledger administrator privileges required.' });
  }
  next();
};

// Apply auth and adminAuth to all routes
router.use(auth, adminAuth);

// GET /api/admin/users - List all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const filter = {};

    if (req.query.role && req.query.role !== 'all') {
      filter.role = req.query.role;
    }
    if (req.query.isVerified !== undefined && req.query.isVerified !== 'all') {
      filter.isVerified = req.query.isVerified === 'true';
    }
    if (req.query.isBanned !== undefined && req.query.isBanned !== 'all') {
      filter.isBanned = req.query.isBanned === 'true';
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching user ledger.', error: err.message });
  }
});

// PUT /api/admin/users/:id/verify - Verify a user (admin only)
router.put('/users/:id/verify', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User successfully accredited.', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error accrediting user.', error: err.message });
  }
});

// PUT /api/admin/users/:id/ban - Ban a user (admin only)
router.put('/users/:id/ban', async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: true, banReason: reason || 'Violation of FoodShare guidelines' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User credentials revoked (Banned).', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error revoking credentials.', error: err.message });
  }
});

// PUT /api/admin/users/:id/unban - Unban a user (admin only)
router.put('/users/:id/unban', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: false, banReason: null },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User reinstated.', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error reinstating user.', error: err.message });
  }
});

// GET /api/admin/donations - List all donations (admin only)
router.get('/donations', async (req, res) => {
  try {
    const donations = await Donation.find()
      .populate('donor', '-password')
      .populate('claimedBy', '-password')
      .populate('volunteer', '-password')
      .sort({ createdAt: -1 });

    res.json(donations);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching donations ledger.', error: err.message });
  }
});

// DELETE /api/admin/donations/:id - Delete a donation (admin only)
router.delete('/donations/:id', async (req, res) => {
  try {
    const donation = await Donation.findByIdAndDelete(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    res.json({ message: 'Consignment record expunged from ledger.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting donation.', error: err.message });
  }
});

// GET /api/admin/stats - Dashboard statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    const [usersByRole, donationsByStatus, recentDonations] = await Promise.all([
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      Donation.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Donation.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('donor', '-password')
        .populate('claimedBy', '-password')
        .populate('volunteer', '-password')
    ]);

    const users = {};
    usersByRole.forEach((entry) => {
      users[entry._id] = entry.count;
    });

    const donations = {};
    donationsByStatus.forEach((entry) => {
      donations[entry._id] = entry.count;
    });

    const totalDonors = users['donor'] || 0;
    const totalNGOs = users['ngo'] || 0;
    const totalVolunteers = users['volunteer'] || 0;
    const activeDonations = (donations['PENDING'] || 0) + (donations['CLAIMED'] || 0) + (donations['IN_TRANSIT'] || 0);
    const completedDeliveries = donations['COMPLETED'] || 0;
    const expiredItems = donations['EXPIRED'] || 0;

    res.json({
      totalDonors,
      totalNGOs,
      totalVolunteers,
      activeDonations,
      completedDeliveries,
      expiredItems,
      users,
      donations,
      recentDonations
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error compiling statistics.', error: err.message });
  }
});

module.exports = router;
