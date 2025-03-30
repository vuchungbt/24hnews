const Settings = require('../models/Settings');

const settingsMiddleware = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    res.locals.settings = settings;
    next();
  } catch (error) {
    console.error('Error loading settings:', error);
    next();
  }
};

module.exports = settingsMiddleware; 