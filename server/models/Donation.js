const mongoose = require('mongoose');
const mock = require('../config/mockStore');

const DONATION_STATUSES = ['PENDING', 'CLAIMED', 'IN_TRANSIT', 'COMPLETED', 'EXPIRED', 'CANCELLED'];

const donationSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  foodType: {
    type: String,
    enum: ['cooked', 'raw'],
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: String,
    required: true,
    trim: true,
  },
  quantityUnit: {
    type: String,
    enum: ['meals', 'kg'],
    required: true,
  },
  expiryTime: {
    type: Date,
    required: true,
  },
  pickupAddress: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [72.8777, 19.0760] },
  },
  status: {
    type: String,
    enum: DONATION_STATUSES,
    default: 'PENDING',
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  claimedAt: { type: Date, default: null },
  volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  volunteerAcceptedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  otp: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  images: [{ type: String }],
  eventName: { type: String, trim: true },
  contactPhone: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const RealDonationModel = mongoose.model('Donation', donationSchema);

// In-Memory Document simulation
class MockDonationDoc {
  constructor(data) {
    this._id = data._id || mock.generateId();
    this.id = this._id;
    this.donor = data.donor;
    this.foodType = data.foodType || 'cooked';
    this.description = data.description || '';
    this.quantity = data.quantity || '';
    this.quantityUnit = data.quantityUnit || 'meals';
    this.expiryTime = data.expiryTime ? new Date(data.expiryTime) : new Date(Date.now() + 4 * 3600000);
    this.pickupAddress = data.pickupAddress || '';
    this.location = data.location || { type: 'Point', coordinates: [72.8777, 19.0760] };
    this.status = data.status || 'PENDING';
    this.claimedBy = data.claimedBy || null;
    this.claimedAt = data.claimedAt || null;
    this.volunteer = data.volunteer || null;
    this.volunteerAcceptedAt = data.volunteerAcceptedAt || null;
    this.completedAt = data.completedAt || null;
    this.otp = data.otp || null;
    this.otpExpiresAt = data.otpExpiresAt || null;
    this.images = data.images || [];
    this.eventName = data.eventName || this.description;
    this.contactPhone = data.contactPhone || '';
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
  }

  async save() {
    const idx = mock.store.donations.findIndex((d) => d._id.toString() === this._id.toString());
    const plainObj = { ...this };
    if (idx >= 0) {
      mock.store.donations[idx] = plainObj;
    } else {
      mock.store.donations.unshift(plainObj);
    }
    return this;
  }

  toObject() {
    return { ...this };
  }
}

// Populate helper for in-memory records
function populateMockDoc(rawDoc) {
  const doc = new MockDonationDoc(rawDoc);

  // Populate donor
  if (doc.donor) {
    const donorId = doc.donor._id ? doc.donor._id.toString() : doc.donor.toString();
    const donorUser = mock.store.users.find((u) => u._id.toString() === donorId);
    if (donorUser) {
      const safeDonor = { ...donorUser };
      delete safeDonor.password;
      doc.donor = safeDonor;
    }
  }

  // Populate claimedBy
  if (doc.claimedBy) {
    const claimedId = doc.claimedBy._id ? doc.claimedBy._id.toString() : doc.claimedBy.toString();
    const ngoUser = mock.store.users.find((u) => u._id.toString() === claimedId);
    if (ngoUser) {
      const safeNGO = { ...ngoUser };
      delete safeNGO.password;
      doc.claimedBy = safeNGO;
    }
  }

  // Populate volunteer
  if (doc.volunteer) {
    const volId = doc.volunteer._id ? doc.volunteer._id.toString() : doc.volunteer.toString();
    const volUser = mock.store.users.find((u) => u._id.toString() === volId);
    if (volUser) {
      const safeVol = { ...volUser };
      delete safeVol.password;
      doc.volunteer = safeVol;
    }
  }

  return doc;
}

// Unified proxy that falls back to in-memory store if MongoDB is not connected
const DonationProxy = function (data) {
  if (mongoose.connection.readyState === 1) {
    return new RealDonationModel(data);
  }
  return new MockDonationDoc(data);
};

DonationProxy.find = function (filter = {}) {
  const queryObj = {
    _filter: filter,
    _populates: [],
    _sort: null,
    _limit: null,
    populate(field) {
      this._populates.push(field);
      return this;
    },
    sort(s) {
      this._sort = s;
      return this;
    },
    limit(n) {
      this._limit = n;
      return this;
    },
    then(resolve, reject) {
      if (mongoose.connection.readyState === 1) {
        let q = RealDonationModel.find(this._filter);
        this._populates.forEach((p) => (q = q.populate(p)));
        if (this._sort) q = q.sort(this._sort);
        if (this._limit) q = q.limit(this._limit);
        return q.then(resolve, reject);
      }

      let results = [...mock.store.donations];

      if (this._filter.status) {
        if (typeof this._filter.status === 'object' && this._filter.status.$in) {
          results = results.filter((d) => this._filter.status.$in.includes(d.status));
        } else {
          results = results.filter((d) => d.status === this._filter.status);
        }
      }

      if (this._filter.foodType) {
        results = results.filter((d) => d.foodType === this._filter.foodType);
      }

      if (this._filter.donor) {
        const dId = this._filter.donor.toString();
        results = results.filter((d) => (d.donor ? (d.donor._id ? d.donor._id.toString() : d.donor.toString()) === dId : false));
      }

      // Sort newest first
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      if (this._limit && typeof this._limit === 'number') {
        results = results.slice(0, this._limit);
      }

      // Populate references
      const populated = results.map(populateMockDoc);
      resolve(populated);
    }
  };
  return queryObj;
};

DonationProxy.findById = function (id) {
  const queryObj = {
    _id: id ? (id._id ? id._id.toString() : id.toString()) : '',
    _populates: [],
    populate(field) {
      this._populates.push(field);
      return this;
    },
    then(resolve, reject) {
      if (mongoose.connection.readyState === 1) {
        let q = RealDonationModel.findById(this._id);
        this._populates.forEach((p) => (q = q.populate(p)));
        return q.then(resolve, reject);
      }

      const found = mock.store.donations.find((d) => d._id.toString() === this._id);
      if (!found) return resolve(null);
      resolve(populateMockDoc(found));
    }
  };
  return queryObj;
};

DonationProxy.findByIdAndUpdate = async function (id, update, options = {}) {
  if (mongoose.connection.readyState === 1) {
    return RealDonationModel.findByIdAndUpdate(id, update, options);
  }
  const idStr = id ? (id._id ? id._id.toString() : id.toString()) : '';
  const idx = mock.store.donations.findIndex((d) => d._id.toString() === idStr);
  if (idx === -1) return null;

  const target = mock.store.donations[idx];
  const setVals = update.$set || update;
  Object.assign(target, setVals);
  return populateMockDoc(target);
};

DonationProxy.findByIdAndDelete = async function (id) {
  if (mongoose.connection.readyState === 1) {
    return RealDonationModel.findByIdAndDelete(id);
  }
  const idStr = id ? (id._id ? id._id.toString() : id.toString()) : '';
  const idx = mock.store.donations.findIndex((d) => d._id.toString() === idStr);
  if (idx === -1) return null;
  const removed = mock.store.donations.splice(idx, 1)[0];
  return removed;
};

DonationProxy.countDocuments = async function (filter = {}) {
  if (mongoose.connection.readyState === 1) {
    return RealDonationModel.countDocuments(filter);
  }
  if (!filter || Object.keys(filter).length === 0) {
    return mock.store.donations.length;
  }
  if (filter.status) {
    return mock.store.donations.filter((d) => d.status === filter.status).length;
  }
  return mock.store.donations.length;
};

DonationProxy.updateMany = async function (filter, update) {
  if (mongoose.connection.readyState === 1) {
    return RealDonationModel.updateMany(filter, update);
  }
  let count = 0;
  const setVals = update.$set || update;
  mock.store.donations.forEach((d) => {
    let match = true;
    if (filter.status && filter.status.$in && !filter.status.$in.includes(d.status)) {
      match = false;
    }
    if (filter.expiryTime && filter.expiryTime.$lte && new Date(d.expiryTime) > new Date(filter.expiryTime.$lte)) {
      match = false;
    }
    if (match) {
      Object.assign(d, setVals);
      count++;
    }
  });
  return { modifiedCount: count };
};

DonationProxy.aggregate = async function (pipeline) {
  if (mongoose.connection.readyState === 1) {
    return RealDonationModel.aggregate(pipeline);
  }
  const statusCounts = {};
  for (const d of mock.store.donations) {
    statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
  }
  return Object.keys(statusCounts).map((s) => ({ _id: s, count: statusCounts[s] }));
};

module.exports = DonationProxy;
