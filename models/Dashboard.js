const mongoose = require('mongoose');
const Post = require('./Post');
const User = require('./User');
const Comment = require('./Comment');

const dashboardSchema = new mongoose.Schema({
  // Thống kê tổng quan
  statistics: {
    totalUsers: {
      type: Number,
      default: 0
    },
    totalNews: {
      type: Number,
      default: 0
    },
    totalComments: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    lastUpdated: Date
  },
  
  // Thống kê theo thời gian
  timeStats: {
    daily: [{
      date: Date,
      users: Number,
      news: Number,
      comments: Number,
      views: Number
    }],
    weekly: [{
      week: Number,
      year: Number,
      users: Number,
      news: Number,
      comments: Number,
      views: Number
    }],
    monthly: [{
      month: Number,
      year: Number,
      users: Number,
      news: Number,
      comments: Number,
      views: Number
    }]
  },
  
  // Cài đặt hệ thống
  settings: {
    siteName: {
      type: String,
      default: 'Website Tin Tức'
    },
    siteDescription: String,
    logo: String,
    favicon: String,
    contactEmail: String,
    socialMedia: {
      facebook: String,
      twitter: String,
      instagram: String,
      youtube: String
    },
    maintenance: {
      enabled: {
        type: Boolean,
        default: false
      },
      message: String
    },
    registration: {
      enabled: {
        type: Boolean,
        default: true
      },
      requireEmailVerification: {
        type: Boolean,
        default: true
      }
    },
    comments: {
      enabled: {
        type: Boolean,
        default: true
      },
      requireApproval: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Backup settings
  backup: {
    enabled: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    lastBackup: Date,
    backupPath: String
  },
  
  // Cache settings
  cache: {
    enabled: {
      type: Boolean,
      default: true
    },
    duration: {
      type: Number,
      default: 3600 // 1 hour in seconds
    },
    lastCleared: Date
  },

  totalPosts: {
    type: Number,
    default: 0
  },
  totalUsers: {
    type: Number,
    default: 0
  },
  totalComments: {
    type: Number,
    default: 0
  },
  pendingComments: {
    type: Number,
    default: 0
  },
  recentPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  recentUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  recentComments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Method to update statistics
dashboardSchema.methods.updateStatistics = async function() {
  try {
    // Cập nhật tổng số bài viết
    this.totalPosts = await Post.countDocuments();
    
    // Cập nhật tổng số người dùng
    this.totalUsers = await User.countDocuments();
    
    // Cập nhật tổng số bình luận
    this.totalComments = await Comment.countDocuments();
    
    // Cập nhật số bình luận đang chờ duyệt
    this.pendingComments = await Comment.countDocuments({ status: 'pending' });
    
    // Cập nhật bài viết gần đây
    this.recentPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt');
    
    // Cập nhật người dùng gần đây
    this.recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username createdAt');
    
    // Cập nhật bình luận gần đây
    this.recentComments = await Comment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('author', 'username')
      .populate('post', 'title');
    
    this.lastUpdated = new Date();
    await this.save();
    
    return this;
  } catch (error) {
    console.error('Error updating dashboard statistics:', error);
    throw error;
  }
};

// Method to update time-based statistics
dashboardSchema.methods.updateTimeStats = async function() {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  
  const User = mongoose.model('User');
  const News = mongoose.model('News');
  const Comment = mongoose.model('Comment');
  
  try {
    const [users, news, comments] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      News.countDocuments({ createdAt: { $gte: startOfDay } }),
      Comment.countDocuments({ createdAt: { $gte: startOfDay } })
    ]);
    
    // Update daily stats
    this.timeStats.daily.push({
      date: startOfDay,
      users,
      news,
      comments
    });
    
    // Keep only last 30 days
    if (this.timeStats.daily.length > 30) {
      this.timeStats.daily.shift();
    }
    
    await this.save();
  } catch (error) {
    console.error('Error updating time stats:', error);
  }
};

const Dashboard = mongoose.model('Dashboard', dashboardSchema);

module.exports = Dashboard; 