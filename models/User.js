const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Tên người dùng không được để trống'],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email không được để trống'],
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Mật khẩu không được để trống'],
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự']
  },
  fullName: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: '/images/default-avatar.png'
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'editor'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  loginHistory: [{
    date: Date,
    ip: String,
    device: String
  }],
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'News'
  }],
  readHistory: [{
    news: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'News'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned'],
    default: 'active'
  },
  bio: String,
  phone: String,
  address: String,
  activities: [{
    action: String,
    details: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});
 
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
 
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
 
userSchema.methods.generateEmailVerificationToken = function() {
  this.emailVerificationToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
};
 
userSchema.methods.generatePasswordResetToken = function() {
  this.resetPasswordToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
};

const User = mongoose.model('User', userSchema);

module.exports = User;
