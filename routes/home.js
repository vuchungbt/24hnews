const express = require('express');
const router = express.Router();
const News = require('../models/News');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware/auth');
const { getCategoriesHierarchy } = require('../utils/categoryUtils');
const Settings = require('../models/Settings');

// Home page
router.get('/', async (req, res) => {
  try { 
    const categories = await getCategoriesHierarchy();
    const settings = await Settings.getSettings();
     
    const featuredNews = await News.find({ status: 'published' })
      .sort({ viewCount: -1 })
      .limit(6)
      .populate('author', 'username')
      .populate('category', 'name')
      .populate('tags', 'name');
       
    const latestNews = await News.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(4)
      .populate('author', 'username')
      .populate('category', 'name')
      .populate('tags', 'name');
 
    const tags = await Tag.find()
      .sort({ useCount: -1 })
      .limit(10);
      
    res.render('client/home', {
      title: 'Trang chủ',
      categories,
      featuredNews,
      latestNews,
      tags,
      user: req.user,
      settings
    });
  } catch (error) {
    console.error('Error loading home page:', error);
    res.status(500).render('error', { message: 'Lỗi khi tải trang chủ' });
  }
});
 
router.get('/login', async (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  try {
    const categories = await getCategoriesHierarchy();
    const settings = await Settings.getSettings();
    res.render('client/login', { 
      user: req.user,
      title: 'Đăng nhập',
      categories,
      settings
    });
  } catch (error) {
    console.error('Error loading login page:', error);
    res.status(500).render('error', { message: 'Lỗi khi tải trang đăng nhập' });
  }
});
 
router.get('/register', async (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  try {
    const categories = await getCategoriesHierarchy();
    const settings = await Settings.getSettings();
    res.render('client/register', { 
      user: req.user,
      title: 'Đăng ký',
      categories,
      settings
    });
  } catch (error) {
    console.error('Error loading register page:', error);
    res.status(500).render('error', { message: 'Lỗi khi tải trang đăng ký' });
  }
});
 
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const categories = await getCategoriesHierarchy();
    const settings = await Settings.getSettings();
    
    res.render('client/profile', {
      user: req.user,
      categories,
      title: 'Hồ sơ cá nhân',
      settings
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Lỗi máy chủ',
      user: req.user
    });
  }
});
 
router.get('/news/:id', async (req, res) => {
  try {
    const newsId = req.params.id;
    const settings = await Settings.getSettings();
     
    let news;
    if (mongoose.Types.ObjectId.isValid(newsId)) {
      news = await News.findById(newsId)
        .populate('category')
        .populate('author', 'username')
        .populate('tags', 'name');
    } else {
      news = await News.findOne({ slug: newsId })
        .populate('category')
        .populate('author', 'username')
        .populate('tags', 'name');
    }

    if (!news) {
      return res.status(404).render('error', { 
        message: 'Không tìm thấy bài viết',
        user: req.user
      });
    } 
    news.viewCount = (news.viewCount || 0) + 1;
    await news.save();
 
    const relatedNews = await News.find({
      category: news.category._id,
      _id: { $ne: news._id },
      status: 'published'
    })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(4);
 
    const categories = await getCategoriesHierarchy();
 
    const latestNews = await News.find({ 
      status: 'published',
      _id: { $ne: news._id }
    })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(5);

    res.render('client/news-detail', {
      news,
      relatedNews,
      categories,
      latestNews,
      user: req.user,
      title: news.title,
      settings
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Lỗi máy chủ',
      user: req.user
    });
  }
});
 
router.get('/category/:slug', async (req, res) => {
  try {
    const categories = await getCategoriesHierarchy();
    const category = await Category.findOne({ slug: req.params.slug });
    const settings = await Settings.getSettings();
    
    if (!category) {
      return res.status(404).render('error', { 
        message: 'Không tìm thấy danh mục',
        user: req.user
      });
    } 
    const childCategories = await Category.find({ parent: category._id });
    const childCategoryIds = childCategories.map(cat => cat._id);
     
    const news = await News.find({
      $or: [
        { category: category._id },
        { category: { $in: childCategoryIds } }
      ],
      status: 'published'
    })
    .sort({ createdAt: -1 })
    .populate('author', 'username')
    .populate('category', 'name')
    .populate('tags', 'name');
    
    res.render('client/category', {
      title: category.name,
      categories,
      category,
      news,
      user: req.user,
      settings
    });
  } catch (error) {
    console.error('Error loading category page:', error);
    res.status(500).render('error', { message: 'Lỗi khi tải trang danh mục' });
  }
});
 
router.get('/tag/:slug', async (req, res) => {
  try {
    const categories = await getCategoriesHierarchy();
    const tag = await Tag.findOne({ slug: req.params.slug });
    const settings = await Settings.getSettings();
    
    if (!tag) {
      return res.status(404).render('error', { 
        message: 'Không tìm thấy thẻ',
        user: req.user
      });
    }
     
    const news = await News.find({
      tags: tag._id,
      status: 'published'
    })
    .sort({ createdAt: -1 })
    .populate('author', 'username')
    .populate('category', 'name')
    .populate('tags', 'name');
 
    const tags = await Tag.find()
      .sort({ newsCount: -1 })
      .limit(10);
 
    const tagsWithCount = await Promise.all(tags.map(async (tag) => {
      const count = await News.countDocuments({
        tags: tag._id,
        status: 'published'
      });
      return {
        ...tag.toObject(),
        newsCount: count
      };
    }));
    
    res.render('client/tag', {
      title: `Tin tức với thẻ "${tag.name}"`,
      categories,
      tag,
      currentTag: tag,
      news,
      tags: tagsWithCount,
      user: req.user,
      settings
    });
  } catch (error) {
    console.error('Error loading tag page:', error);
    res.status(500).render('error', { message: 'Lỗi khi tải trang thẻ' });
  }
});

module.exports = router;
