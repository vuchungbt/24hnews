const mongoose = require('mongoose');
const News = require('./News');
const User = require('./User');
const Category = require('./Category');

const dashboardSchema = new mongoose.Schema({
  statistics: {
    totalUsers: {
      type: Number,
      default: 0
    },
    totalNews: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    lastUpdated: Date
  },
  
  timeStats: {
    daily: [{
      date: Date,
      users: Number,
      news: Number,
      views: Number,
      categories: [{
        name: String,
        count: Number
      }]
    }],
    weekly: [{
      week: Number,
      year: Number,
      users: Number,
      news: Number,
      views: Number,
      categories: [{
        name: String,
        count: Number
      }]
    }],
    monthly: [{
      month: Number,
      year: Number,
      users: Number,
      news: Number,
      views: Number,
      categories: [{
        name: String,
        count: Number
      }]
    }]
  },
  
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
    }
  },
  
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

  recentNews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'News'
  }],
  recentUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  categories: [{
    name: String,
    postCount: Number
  }]
}, {
  timestamps: true
});

dashboardSchema.methods.updateStatistics = async function() {
  try { 
    this.statistics = {
      totalUsers: await User.countDocuments(),
      totalNews: await News.countDocuments(),
      totalViews: await News.aggregate([
        { $group: { _id: null, total: { $sum: "$viewCount" } } }
      ]).then(result => result[0]?.total || 0),
      lastUpdated: new Date()
    };

    this.categories = await Category.aggregate([
      {
        $lookup: {
          from: 'news',
          localField: '_id',
          foreignField: 'category',
          as: 'news'
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          postCount: { $size: '$news' }
        }
      },
      { $sort: { postCount: -1 } }
    ]);

    for (const category of this.categories) {
      await Category.findByIdAndUpdate(category._id, {
        postCount: category.postCount
      });
    }

    this.recentNews = await News.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('author', 'username')
      .select('title createdAt author');
    
    this.recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username createdAt');
    
    this.lastUpdated = new Date();
    await this.save();
    
    return this;
  } catch (error) {
    console.error('Error updating dashboard statistics:', error);
    throw error;
  }
};

dashboardSchema.methods.updateTimeStats = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    console.log('Bắt đầu cập nhật thống kê theo thời gian...');
    
    const categories = await Category.find().select('name');
    console.log('Danh sách danh mục:', categories);
    
    if (!this.timeStats.daily) {
      this.timeStats.daily = [];
    }
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dailyStats = {
        date: date,
        users: await User.countDocuments({ 
          createdAt: { 
            $gte: new Date(date.setHours(0, 0, 0, 0)),
            $lt: new Date(date.setHours(23, 59, 59, 999))
          } 
        }),
        news: await News.countDocuments({ 
          createdAt: { 
            $gte: new Date(date.setHours(0, 0, 0, 0)),
            $lt: new Date(date.setHours(23, 59, 59, 999))
          },
          status: 'published'
        }),
        views: await News.aggregate([
          { 
            $match: { 
              createdAt: { 
                $gte: new Date(date.setHours(0, 0, 0, 0)),
                $lt: new Date(date.setHours(23, 59, 59, 999))
              },
              status: 'published'
            } 
          },
          { $group: { _id: null, total: { $sum: "$viewCount" } } }
        ]).then(result => result[0]?.total || 0),
        categories: await Promise.all(categories.map(async (category) => {
          const count = await News.countDocuments({
            category: category._id,
            createdAt: { 
              $gte: new Date(date.setHours(0, 0, 0, 0)),
              $lt: new Date(date.setHours(23, 59, 59, 999))
            },
            status: 'published'
          });
          return {
            name: category.name,
            count: count
          };
        }))
      };

      console.log(`Thống kê ngày ${date.toLocaleDateString('vi-VN')}:`, dailyStats);

      const existingDailyIndex = this.timeStats.daily.findIndex(
        stat => stat.date.getTime() === date.getTime()
      );

      if (existingDailyIndex === -1) {
        this.timeStats.daily.push(dailyStats);
      } else {
        this.timeStats.daily[existingDailyIndex] = dailyStats;
      }
    }

    if (this.timeStats.daily.length > 30) {
      this.timeStats.daily = this.timeStats.daily.slice(-30);
    }

    if (!this.timeStats.weekly) {
      this.timeStats.weekly = [];
    }

    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (today.getDay() + (i * 7)));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weeklyStats = {
        week: Math.ceil((today - weekStart) / (7 * 24 * 60 * 60 * 1000)),
        year: today.getFullYear(),
        users: await User.countDocuments({ 
          createdAt: { 
            $gte: weekStart,
            $lte: weekEnd
          } 
        }),
        news: await News.countDocuments({ 
          createdAt: { 
            $gte: weekStart,
            $lte: weekEnd
          },
          status: 'published'
        }),
        views: await News.aggregate([
          { 
            $match: { 
              createdAt: { 
                $gte: weekStart,
                $lte: weekEnd
              },
              status: 'published'
            } 
          },
          { $group: { _id: null, total: { $sum: "$viewCount" } } }
        ]).then(result => result[0]?.total || 0),
        categories: await Promise.all(categories.map(async (category) => {
          const count = await News.countDocuments({
            category: category._id,
            createdAt: { 
              $gte: weekStart,
              $lte: weekEnd
            },
            status: 'published'
          });
          return {
            name: category.name,
            count: count
          };
        }))
      };

      console.log(`Thống kê tuần ${weeklyStats.week}/${weeklyStats.year}:`, weeklyStats);

      const existingWeeklyIndex = this.timeStats.weekly.findIndex(
        stat => stat.week === weeklyStats.week && stat.year === weeklyStats.year
      );

      if (existingWeeklyIndex === -1) {
        this.timeStats.weekly.push(weeklyStats);
      } else {
        this.timeStats.weekly[existingWeeklyIndex] = weeklyStats;
      }
    }

    if (this.timeStats.weekly.length > 12) {
      this.timeStats.weekly = this.timeStats.weekly.slice(-12);
    }

    if (!this.timeStats.monthly) {
      this.timeStats.monthly = [];
    }

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

      const monthlyStats = {
        month: today.getMonth() - i + 1,
        year: today.getFullYear(),
        users: await User.countDocuments({ 
          createdAt: { 
            $gte: monthStart,
            $lte: monthEnd
          } 
        }),
        news: await News.countDocuments({ 
          createdAt: { 
            $gte: monthStart,
            $lte: monthEnd
          },
          status: 'published'
        }),
        views: await News.aggregate([
          { 
            $match: { 
              createdAt: { 
                $gte: monthStart,
                $lte: monthEnd
              },
              status: 'published'
            } 
          },
          { $group: { _id: null, total: { $sum: "$viewCount" } } }
        ]).then(result => result[0]?.total || 0),
        categories: await Promise.all(categories.map(async (category) => {
          const count = await News.countDocuments({
            category: category._id,
            createdAt: { 
              $gte: monthStart,
              $lte: monthEnd
            },
            status: 'published'
          });
          return {
            name: category.name,
            count: count
          };
        }))
      };

      console.log(`Thống kê tháng ${monthlyStats.month}/${monthlyStats.year}:`, monthlyStats);

      const existingMonthlyIndex = this.timeStats.monthly.findIndex(
        stat => stat.month === monthlyStats.month && stat.year === monthlyStats.year
      );

      if (existingMonthlyIndex === -1) {
        this.timeStats.monthly.push(monthlyStats);
      } else {
        this.timeStats.monthly[existingMonthlyIndex] = monthlyStats;
      }
    }

    if (this.timeStats.monthly.length > 12) {
      this.timeStats.monthly = this.timeStats.monthly.slice(-12);
    }

    await this.save();
    console.log('Đã cập nhật thống kê theo thời gian thành công');
  } catch (error) {
    console.error('Lỗi khi cập nhật thống kê theo thời gian:', error);
  }
};

const Dashboard = mongoose.model('Dashboard', dashboardSchema);

module.exports = Dashboard; 