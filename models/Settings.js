const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  siteName: {
    type: String,
    required: true,
    default: 'Website Tin Tức'
  },
  siteDescription: {
    type: String,
    default: 'Website tin tức tổng hợp'
  },
  siteLogo: {
    type: String,
    default: '/images/logo.png'
  },
  siteFavicon: {
    type: String,
    default: '/images/favicon.png'
  },
  contactEmail: {
    type: String,
    default: 'contact@thien.com'
  },
  contactPhone: {
    type: String,
    default: '+84 123 456 789'
  },
  address: {
    type: String,
    default: 'Đà Nẵng, Việt Nam'
  },
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    youtube: String
  },
  analytics: {
    googleAnalyticsId: String,
    facebookPixelId: String
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String]
  },
  features: {
    enableComments: {
      type: Boolean,
      default: true
    },
    enableRegistration: {
      type: Boolean,
      default: true
    },
    enableNewsletter: {
      type: Boolean,
      default: true
    },
    enableSocialLogin: {
      type: Boolean,
      default: false
    }
  },
  maintenance: {
    isMaintenanceMode: {
      type: Boolean,
      default: false
    },
    maintenanceMessage: String
  },
  cache: {
    enabled: {
      type: Boolean,
      default: true
    },
    duration: {
      type: Number,
      default: 3600 // 1 hour in seconds
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});
 
settingsSchema.methods.updateSettings = async function(newSettings) {
  try {
    Object.assign(this, newSettings);
    this.lastUpdated = new Date();
    await this.save();
    return this;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};
 
settingsSchema.statics.getSettings = async function() {
  try {
    let settings = await this.findOne();
    if (!settings) {
      settings = await this.create({});
    }
    return settings;
  } catch (error) {
    console.error('Error getting settings:', error);
    throw error;
  }
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings; 