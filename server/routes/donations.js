const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const auth = require('../middleware/auth');
const { authorize, optionalAuth } = auth;

// ────────────────────────────────────────────────────────────
// Helper – generate a random 6-digit OTP string
// ────────────────────────────────────────────────────────────
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ────────────────────────────────────────────────────────────
// Edge Case Maintenance Helper: Auto-expire food 1 hr before expiry
// (PRD Section 6.2)
// ────────────────────────────────────────────────────────────
const runAutoExpiryCheck = async () => {
  try {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    await Donation.updateMany(
      {
        status: { $in: ['PENDING', 'CLAIMED', 'IN_TRANSIT'] },
        expiryTime: { $lte: oneHourFromNow }
      },
      { $set: { status: 'EXPIRED' } }
    );
  } catch (err) {
    // Non-blocking log
    console.error('Auto-expiry maintenance error:', err.message);
  }
};

// ────────────────────────────────────────────────────────────
// GET /api/donations/stats/overview  –  Statistics (admin only)
// ────────────────────────────────────────────────────────────
router.get('/stats/overview', auth, authorize('admin'), async (req, res) => {
  try {
    await runAutoExpiryCheck();
    const [total, completed, pending, expired] = await Promise.all([
      Donation.countDocuments(),
      Donation.countDocuments({ status: 'COMPLETED' }),
      Donation.countDocuments({ status: 'PENDING' }),
      Donation.countDocuments({ status: 'EXPIRED' }),
    ]);

    res.json({
      total,
      completed,
      pending,
      expired,
    });
  } catch (error) {
    console.error('Error fetching donation stats:', error);
    res.status(500).json({ message: 'Server error while fetching statistics.' });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/donations  –  Create a new donation (donor or admin)
// ────────────────────────────────────────────────────────────
router.post('/', auth, authorize('donor', 'admin'), async (req, res) => {
  try {
    const {
      foodType,
      description,
      quantity,
      quantityUnit,
      expiryTime,
      pickupAddress,
      location,
      images,
      eventName,
      contactPhone,
    } = req.body;

    if (!description || !quantity || !quantityUnit || !expiryTime || !pickupAddress || !contactPhone) {
      return res.status(400).json({ message: 'Please provide all required consignment details.' });
    }

    const donation = new Donation({
      donor: req.user._id,
      foodType: foodType || 'cooked',
      description,
      quantity,
      quantityUnit,
      expiryTime,
      pickupAddress,
      location: location || { type: 'Point', coordinates: [72.8777, 19.0760] },
      images: images || [],
      eventName: eventName || description,
      contactPhone,
      status: 'PENDING',
    });

    await donation.save();
    res.status(201).json(donation);
  } catch (error) {
    console.error('Error creating donation:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: 'Validation failed.', errors: messages });
    }

    res.status(500).json({ message: 'Server error while creating donation.' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/donations  –  List donations with filters (supports optionalAuth)
// ────────────────────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    await runAutoExpiryCheck();

    const { status, foodType } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (foodType) {
      filter.foodType = foodType;
    }

    // Role-based tailoring when no specific status filter is provided
    if (req.user && !status) {
      if (req.user.role === 'donor') {
        filter.donor = req.user._id;
      } else if (req.user.role === 'ngo') {
        filter.status = { $in: ['PENDING', 'CLAIMED'] };
      } else if (req.user.role === 'volunteer') {
        filter.status = { $in: ['CLAIMED', 'IN_TRANSIT'] };
      }
    }

    const donations = await Donation.find(filter)
      .populate('donor', '-password')
      .populate('claimedBy', '-password')
      .populate('volunteer', '-password')
      .sort({ createdAt: -1 });

    // Augment with PRD 6.1 Flag: 30-min volunteer unassigned alert
    const augmented = donations.map((d) => {
      const doc = d.toObject ? d.toObject() : d;
      if (doc.status === 'CLAIMED' && !doc.volunteer && doc.claimedAt) {
        const elapsedMinutes = (Date.now() - new Date(doc.claimedAt).getTime()) / 60000;
        if (elapsedMinutes >= 30) {
          doc.selfPickupRequired = true;
          doc.selfPickupAlert = 'No volunteer courier accepted within 30 minutes. NGO self-pickup activated.';
        }
      }
      return doc;
    });

    res.json(augmented);
  } catch (error) {
    console.error('Error listing donations:', error);
    res.status(500).json({ message: 'Server error while listing donations.' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/donations/:id  –  Get a single donation
// ────────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    await runAutoExpiryCheck();

    const donation = await Donation.findById(req.params.id)
      .populate('donor', '-password')
      .populate('claimedBy', '-password')
      .populate('volunteer', '-password');

    if (!donation) {
      return res.status(404).json({ message: 'Donation consignment not found.' });
    }

    const doc = donation.toObject ? donation.toObject() : donation;

    // Check PRD 6.1 (30 mins unassigned volunteer flag)
    if (doc.status === 'CLAIMED' && !doc.volunteer && doc.claimedAt) {
      const elapsedMinutes = (Date.now() - new Date(doc.claimedAt).getTime()) / 60000;
      if (elapsedMinutes >= 30) {
        doc.selfPickupRequired = true;
        doc.selfPickupAlert = 'Notice: Courier window has elapsed (>30 mins). NGO self-pickup requested.';
      }
    }

    // OTP Security: Only the recipient NGO who claimed it OR an admin can view the handshake OTP!
    // Couriers, donors, and unauthenticated visitors MUST NOT see the OTP.
    const isClaimingNgo = req.user && doc.claimedBy && (
      (doc.claimedBy._id && doc.claimedBy._id.toString() === req.user._id.toString()) ||
      (doc.claimedBy.toString() === req.user._id.toString())
    );
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isClaimingNgo && !isAdmin) {
      delete doc.otp;
      delete doc.otpExpiresAt;
    }

    res.json(doc);
  } catch (error) {
    console.error('Error fetching donation:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Donation not found.' });
    }
    res.status(500).json({ message: 'Server error while fetching donation.' });
  }
});

// ────────────────────────────────────────────────────────────
// PUT /api/donations/:id/claim  –  Claim donation (NGO only)
// ────────────────────────────────────────────────────────────
router.put('/:id/claim', auth, authorize('ngo', 'admin'), async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found.' });
    }

    if (donation.status !== 'PENDING') {
      return res.status(400).json({
        message: `Donation cannot be claimed. Current status: ${donation.status}.`,
      });
    }

    const otp = generateOTP();

    donation.status = 'CLAIMED';
    donation.claimedBy = req.user._id;
    donation.claimedAt = new Date();
    donation.otp = otp;
    donation.otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await donation.save();

    res.json({
      message: 'Donation claimed successfully.',
      donation,
      otp, // Provided to the claiming NGO for completion verification
    });
  } catch (error) {
    console.error('Error claiming donation:', error);
    res.status(500).json({ message: 'Server error while claiming donation.' });
  }
});

// ────────────────────────────────────────────────────────────
// PUT /api/donations/:id/accept  –  Accept delivery (volunteer only)
// ────────────────────────────────────────────────────────────
router.put('/:id/accept', auth, authorize('volunteer', 'admin'), async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found.' });
    }

    if (donation.status !== 'CLAIMED') {
      return res.status(400).json({
        message: `Consignment cannot be accepted. Current status: ${donation.status}.`,
      });
    }

    donation.status = 'IN_TRANSIT';
    donation.volunteer = req.user._id;
    donation.volunteerAcceptedAt = new Date();

    await donation.save();

    const returnDoc = donation.toObject ? donation.toObject() : { ...donation };
    delete returnDoc.otp;
    delete returnDoc.otpExpiresAt;

    res.json({
      message: 'Delivery accepted. Consignment is now IN TRANSIT.',
      donation: returnDoc,
    });
  } catch (error) {
    console.error('Error accepting donation delivery:', error);
    res.status(500).json({ message: 'Server error while accepting delivery.' });
  }
});

// ────────────────────────────────────────────────────────────
// PUT /api/donations/:id/complete  –  Complete delivery (OTP verification)
// ────────────────────────────────────────────────────────────
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'Delivery confirmation OTP is required.' });
    }

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found.' });
    }

    if (donation.status !== 'IN_TRANSIT') {
      return res.status(400).json({
        message: `Donation cannot be completed. Current status: ${donation.status}.`,
      });
    }

    // Verify OTP
    if (donation.otp !== otp.toString().trim()) {
      return res.status(400).json({ message: 'Invalid OTP verification code.' });
    }

    if (donation.otpExpiresAt && new Date() > donation.otpExpiresAt) {
      return res.status(400).json({ message: 'OTP has expired. Contact NGO for re-verification.' });
    }

    donation.status = 'COMPLETED';
    donation.completedAt = new Date();
    donation.otp = null;
    donation.otpExpiresAt = null;

    await donation.save();

    res.json({
      message: 'Delivery completed and confirmed successfully via OTP.',
      donation,
    });
  } catch (error) {
    console.error('Error completing donation delivery:', error);
    res.status(500).json({ message: 'Server error while completing delivery.' });
  }
});

// ────────────────────────────────────────────────────────────
// PUT /api/donations/:id/cancel  –  Cancel donation (donor or admin)
// ────────────────────────────────────────────────────────────
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found.' });
    }

    const donorId = (donation.donor && donation.donor._id ? donation.donor._id : donation.donor).toString();
    const currentUserId = (req.user._id || req.user.id).toString();
    const isDonor = donorId === currentUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isDonor && !isAdmin) {
      return res.status(403).json({ message: 'Only the donor or an administrator may cancel this consignment.' });
    }

    if (donation.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Cannot cancel a consignment that has already been delivered.' });
    }

    donation.status = 'CANCELLED';
    await donation.save();

    res.json({ message: 'Consignment cancelled successfully.', donation });
  } catch (error) {
    console.error('Error cancelling donation:', error);
    res.status(500).json({ message: 'Server error while cancelling donation.' });
  }
});

// ────────────────────────────────────────────────────────────
// DELETE /api/donations/:id  –  Remove donation (donor or admin)
// ────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found.' });
    }

    const donorId = (donation.donor && donation.donor._id ? donation.donor._id : donation.donor).toString();
    const currentUserId = (req.user._id || req.user.id).toString();
    const isDonor = donorId === currentUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isDonor && !isAdmin) {
      return res.status(403).json({ message: 'Only the donor or an administrator may remove this consignment.' });
    }

    if (donation.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Cannot remove a consignment that has already been delivered.' });
    }

    await Donation.findByIdAndDelete(req.params.id);

    res.json({ message: 'Consignment permanently removed.' });
  } catch (error) {
    console.error('Error deleting donation:', error);
    res.status(500).json({ message: 'Server error while deleting donation.' });
  }
});

module.exports = router;
