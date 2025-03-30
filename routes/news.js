const express = require('express');
const router = express.Router();
const News = require('../models/News');
const { authMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { getCategoriesHierarchy } = require('../utils/categoryUtils');
const Tag = require('../models/Tag');

router.post('/create', [
  authMiddleware,
  body('title').notEmpty().withMessage('Tiêu đề không được để trống'),
  body('content').notEmpty().withMessage('Nội dung không được để trống'),
  body('category').notEmpty().withMessage('Danh mục không được để trống')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, content, category, tags, imageUrl, status } = req.body;

    const newNews = new News({
      title,
      content,
      author: req.user._id,
      category,
      tags,
      imageUrl,
      status: status || 'draft',
      publishedAt: status === 'published' ? new Date() : null
    });

    const savedNews = await newNews.save();
    res.status(201).json(savedNews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, status } = req.query;
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;

    const news = await News.find(query)
      .populate('author', 'username')
      .populate('category', 'name')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await News.countDocuments(query);

    res.json({
      news,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const searchQuery = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;

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

    const news = await News.find(searchCondition)
      .populate('author', 'username')
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await News.countDocuments(searchCondition);

    news.forEach(article => {
      article.excerpt = article.content
        .replace(/<[^>]*>/g, '') // Loại bỏ HTML tags
        .slice(0, 150) // Lấy 150 ký tự đầu
        + '...'; // Thêm dấu ...
    });
 
    res.render('client/search', {
      title: `Tìm kiếm: ${searchQuery}`,
      news,
      searchQuery,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      user: req.user
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).render('error', { 
      message: 'Đã xảy ra lỗi khi tìm kiếm',
      user: req.user
    });
  }
}); 
router.get('/:id', async (req, res) => {
  try {
    const newsId = req.params.id;
     
    let news;
    if (mongoose.Types.ObjectId.isValid(newsId)) {
      news = await News.findById(newsId)
        .populate('category')
        .populate('author', 'username')
        .populate({
          path: 'tags',
          select: 'name slug'
        });
    } else {
      news = await News.findOne({ slug: newsId })
        .populate('category')
        .populate('author', 'username')
        .populate({
          path: 'tags',
          select: 'name slug'
        });
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
    .limit(4)
    .populate('category')
    .populate('author', 'username');
 
    const categories = await getCategoriesHierarchy();
 
    const latestNews = await News.find({ 
      status: 'published',
      _id: { $ne: news._id }
    })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(5);
 
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

    res.render('client/news-detail', {
      news,
      relatedNews,
      categories,
      latestNews,
      tags: tagsWithCount,
      currentTag: null,  
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
 
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, content, category, tags, imageUrl, status } = req.body;

    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    if (news.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền chỉnh sửa' });
    }

    news.title = title || news.title;
    news.content = content || news.content;
    news.category = category || news.category;
    news.tags = tags || news.tags;
    news.imageUrl = imageUrl || news.imageUrl;
    
    if (status) {
      news.status = status;
      news.publishedAt = status === 'published' ? new Date() : null;
    }

    const updatedNews = await news.save();
    res.json(updatedNews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    if (news.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền xóa' });
    }

    await News.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xóa bài viết thành công' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

module.exports = router;
