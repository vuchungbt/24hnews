const express = require('express');
const router = express.Router();
const News = require('../models/News');
const { authMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Tạo bài viết mới
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

// Lấy danh sách bài viết
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

// Chi tiết bài viết
router.get('/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('author', 'username')
      .populate('category', 'name');

    if (!news) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    res.json(news);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Cập nhật bài viết
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, content, category, tags, imageUrl, status } = req.body;

    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    // Kiểm tra quyền chỉnh sửa
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

// Xóa bài viết
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    // Kiểm tra quyền xóa
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
