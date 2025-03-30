const express = require('express');
const router = express.Router();
const News = require('../models/News');
const Category = require('../models/Category');
const Settings = require('../models/Settings');

// Router tìm kiếm
router.get('/search', async (req, res) => {
  try {
    const searchQuery = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const settings = await Settings.getSettings();

    if (!searchQuery) {
      return res.redirect('/');
    }
 
    const searchCondition = {
      $or: [
        { title: { $regex: searchQuery, $options: 'i' } },
        { content: { $regex: searchQuery, $options: 'i' } }
      ],
      status: 'published'
    };
 
    const [news, total, categories] = await Promise.all([
      News.find(searchCondition)
        .populate('author', 'username')
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      News.countDocuments(searchCondition),
      Category.find().sort({ order: 1 })
    ]); 
    const categoryMap = {};
    categories.forEach(category => {
      category.children = [];
      categoryMap[category._id] = category;
    });

    categories.forEach(category => {
      if (category.parent) {
        const parent = categoryMap[category.parent];
        if (parent) {
          parent.children.push(category);
        }
      }
    });
 
    const rootCategories = categories.filter(category => !category.parent);
 
    news.forEach(article => {
      article.excerpt = article.content
        .replace(/<[^>]*>/g, '')  
        .slice(0, 150)  
        + '...';  
    }); 
    res.render('client/search', {
      title: `Tìm kiếm: ${searchQuery}`,
      news,
      searchQuery,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      categories: rootCategories,
      user: req.user,
      settings
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).render('error', { 
      message: 'Đã xảy ra lỗi khi tìm kiếm',
      user: req.user
    });
  }
});

module.exports = router; 