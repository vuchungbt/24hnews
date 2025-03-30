const { getCategoriesHierarchy } = require('../utils/categoryUtils');

const categoriesMiddleware = async (req, res, next) => {
  try {
    const categories = await getCategoriesHierarchy();
    res.locals.categories = categories;
    next();
  } catch (error) {
    console.error('Error loading categories:', error);
    next();
  }
};

module.exports = categoriesMiddleware; 