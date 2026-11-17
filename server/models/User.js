const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const mock = require('../config/mockStore');

const SALT_ROUNDS = 10;

const ratingSchema = new mongoose.Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    feedback: { type: String, trim: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true, timestamps: true }
);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['donor', 'ngo', 'volunteer', 'admin'], required: true },
  phone: { type: String, trim: true },
  organization: { type: String, trim: true },
  address: { type: String, trim: true },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [72.8777, 19.0760] },
  },
  isVerified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String },
  ratings: [ratingSchema],
  createdAt: { type: Date, default: Date.now },
});

// Guard against double hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (this.password && (this.password.startsWith('$2a$') || this.password.startsWith('$2b$'))) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const RealUserModel = mongoose.model('User', userSchema);

// In-Memory Document simulation
class MockUserDoc {
  constructor(data) {
    this._id = data._id || mock.generateId();
    this.id = this._id;
    this.name = data.name;
    this.email = (data.email || '').toLowerCase().trim();
    this.password = data.password;
    this.role = data.role;
    this.phone = data.phone || '';
    this.organization = data.organization || '';
    this.address = data.address || '';
    this.location = data.location || { type: 'Point', coordinates: [72.8777, 19.0760] };
    this.isVerified = data.isVerified !== undefined ? data.isVerified : false;
    this.isBanned = data.isBanned !== undefined ? data.isBanned : false;
    this.banReason = data.banReason || null;
    this.ratings = data.ratings || [];
    this.createdAt = data.createdAt || new Date();
  }

  async save() {
    const existingIndex = mock.store.users.findIndex(
      (u) => u._id.toString() === this._id.toString() || u.email === this.email
    );
    const plainObj = { ...this };
    if (existingIndex >= 0) {
      mock.store.users[existingIndex] = plainObj;
    } else {
      mock.store.users.push(plainObj);
    }
    return this;
  }

  toObject() {
    return { ...this };
  }
}

// Unified proxy that falls back to in-memory store if MongoDB is not connected
const UserProxy = function (data) {
  if (mongoose.connection.readyState === 1) {
    return new RealUserModel(data);
  }
  return new MockUserDoc(data);
};

// Static methods
UserProxy.findOne = async function (query) {
  if (mongoose.connection.readyState === 1) {
    return RealUserModel.findOne(query);
  }
  const email = (query.email || '').toLowerCase();
  const found = mock.store.users.find((u) => u.email === email);
  return found ? new MockUserDoc(found) : null;
};

UserProxy.findById = function (id) {
  const queryObj = {
    _id: id ? id.toString() : '',
    _select: null,
    select(fields) {
      this._select = fields;
      return this;
    },
    then(resolve, reject) {
      if (mongoose.connection.readyState === 1) {
        return RealUserModel.findById(this._id).select(this._select).then(resolve, reject);
      }
      const found = mock.store.users.find((u) => u._id.toString() === this._id);
      if (!found) return resolve(null);
      const doc = new MockUserDoc(found);
      if (this._select && this._select.includes('-password')) {
        delete doc.password;
      }
      resolve(doc);
    }
  };
  return queryObj;
};

UserProxy.findByIdAndUpdate = async function (id, update, options = {}) {
  if (mongoose.connection.readyState === 1) {
    return RealUserModel.findByIdAndUpdate(id, update, options);
  }
  const idStr = id ? id.toString() : '';
  const index = mock.store.users.findIndex((u) => u._id.toString() === idStr);
  if (index === -1) return null;

  const target = mock.store.users[index];
  const setVals = update.$set || update;
  Object.assign(target, setVals);

  const doc = new MockUserDoc(target);
  return doc;
};

UserProxy.find = function (filter = {}) {
  const queryObj = {
    _filter: filter,
    _select: null,
    _sort: null,
    select(s) {
      this._select = s;
      return this;
    },
    sort(s) {
      this._sort = s;
      return this;
    },
    then(resolve, reject) {
      if (mongoose.connection.readyState === 1) {
        let q = RealUserModel.find(this._filter);
        if (this._select) q = q.select(this._select);
        if (this._sort) q = q.sort(this._sort);
        return q.then(resolve, reject);
      }

      let results = [...mock.store.users];
      if (this._filter.role && this._filter.role !== 'all') {
        results = results.filter((u) => u.role === this._filter.role);
      }
      if (this._filter.isVerified !== undefined && this._filter.isVerified !== 'all') {
        results = results.filter((u) => Boolean(u.isVerified) === Boolean(this._filter.isVerified));
      }
      if (this._filter.isBanned !== undefined && this._filter.isBanned !== 'all') {
        results = results.filter((u) => Boolean(u.isBanned) === Boolean(this._filter.isBanned));
      }

      const docs = results.map((u) => {
        const d = new MockUserDoc(u);
        if (this._select && this._select.includes('-password')) {
          delete d.password;
        }
        return d;
      });

      resolve(docs);
    }
  };
  return queryObj;
};

UserProxy.aggregate = async function (pipeline) {
  if (mongoose.connection.readyState === 1) {
    return RealUserModel.aggregate(pipeline);
  }
  // Basic group aggregation simulation for admin stats
  const roleCounts = {};
  for (const u of mock.store.users) {
    roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
  }
  return Object.keys(roleCounts).map((role) => ({ _id: role, count: roleCounts[role] }));
};

module.exports = UserProxy;
