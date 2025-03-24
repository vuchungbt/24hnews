const express = require('express');
const router = express.Router();
const News = require('../models/News');
const Category = require('../models/Category');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware/auth');

// Trang chủ
router.get('/', async (req, res) => {
  try {
    const latestNews = await News.find({ status: 'published' })
      .populate('category')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(10);

    const categories = await Category.find().sort({ name: 1 });

    // Đếm số bài viết trong mỗi danh mục
    for (let i = 0; i < categories.length; i++) {
      const count = await News.countDocuments({ 
        category: categories[i]._id,
        status: 'published'
      });
      categories[i] = {
        ...categories[i]._doc,
        count
      };
    }

    res.render('client/index', {
      latestNews,
      categories,
      user: req.user,
      title: 'Trang chủ'
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Lỗi máy chủ' });
  }
});

// Trang đăng nhập
router.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('client/login', { 
    user: req.user,
    title: 'Đăng nhập'
  });
});

// Trang đăng ký
router.get('/register', (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('client/register', { 
    user: req.user,
    title: 'Đăng ký'
  });
});

// Trang profile người dùng
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    
    res.render('client/profile', {
      user: req.user,
      categories,
      title: 'Hồ sơ cá nhân'
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Lỗi máy chủ',
      user: req.user
    });
  }
});

// Trang chi tiết bài viết
router.get('/news/:id', async (req, res) => {
  try {
    const newsId = req.params.id;
    
    // Tìm bài viết theo ID hoặc slug
    let news;
    if (mongoose.Types.ObjectId.isValid(newsId)) {
      news = await News.findById(newsId)
        .populate('category')
        .populate('author', 'username');
    } else {
      news = await News.findOne({ slug: newsId })
        .populate('category')
        .populate('author', 'username');
    }

    if (!news) {
      return res.status(404).render('error', { 
        message: 'Không tìm thấy bài viết',
        user: req.user
      });
    }

    // Tăng lượt xem
    news.viewCount = (news.viewCount || 0) + 1;
    await news.save();

    // Lấy các bài viết liên quan cùng danh mục
    const relatedNews = await News.find({
      category: news.category._id,
      _id: { $ne: news._id },
      status: 'published'
    })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(4);

    // Lấy danh sách danh mục kèm số lượng bài viết
    const categories = await Category.find().sort({ name: 1 });
    for (let i = 0; i < categories.length; i++) {
      const count = await News.countDocuments({ 
        category: categories[i]._id,
        status: 'published'
      });
      categories[i] = {
        ...categories[i]._doc,
        count
      };
    }

    // Lấy tin mới nhất cho sidebar
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
      title: news.title
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Lỗi máy chủ',
      user: req.user
    });
  }
});

// Trang danh mục
router.get('/category/:slug', async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    
    if (!category) {
      return res.status(404).render('error', { 
        message: 'Không tìm thấy danh mục',
        user: req.user
      });
    }

    const news = await News.find({
      category: category._id,
      status: 'published'
    })
    .sort({ publishedAt: -1, createdAt: -1 });

    // Lấy danh sách tất cả danh mục
    const categories = await Category.find().sort({ name: 1 });

    res.render('client/category', {
      category,
      news,
      categories,
      user: req.user,
      title: category.name
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Lỗi máy chủ',
      user: req.user
    });
  }
});

module.exports = router;
