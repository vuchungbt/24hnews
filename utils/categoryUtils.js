const Category = require('../models/Category');

// Hàm lấy danh mục phân cấp
async function getCategoriesHierarchy() {
  try {
    const allCategories = await Category.find().sort({ name: 1 });
 
    const categoryMap = new Map();
    allCategories.forEach(category => {
      categoryMap.set(category._id.toString(), {
        ...category.toObject(),
        children: []
      });
    });
    
    const rootCategories = [];
    allCategories.forEach(category => {
      const categoryObj = categoryMap.get(category._id.toString());
      if (category.parent) {
        const parent = categoryMap.get(category.parent.toString());
        if (parent) {
          parent.children.push(categoryObj);
        }
      } else {
        rootCategories.push(categoryObj);
      }
    });
    
    return rootCategories;
  } catch (error) {
    console.error('Error getting categories hierarchy:', error);
    return [];
  }
}

module.exports = {
  getCategoriesHierarchy
}; 