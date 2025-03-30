const express = require('express');
const router = express.Router();
const Tag = require('../models/Tag');
const News = require('../models/News');
const { authMiddleware, adminMiddleware, isAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

router.get('/', isAdmin, async (req, res) => {
  try {
    const tags = await Tag.find().sort({ name: 1 });
    
    for (let i = 0; i < tags.length; i++) {
      const count = await News.countDocuments({ tags: tags[i]._id });
      tags[i] = {
        ...tags[i]._doc,
        newsCount: count
      };
    }
    
    res.json({ success: true, data: tags });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
});

// Tạo thẻ mới
router.post('/add', [
  authMiddleware,
  adminMiddleware,
  isAdmin,
  body('name').notEmpty().withMessage('Tên thẻ không được để trống')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, description } = req.body;

    const existingTag = await Tag.findOne({ name });
    if (existingTag) {
      return res.status(400).json({ success: false, message: 'Tên thẻ đã tồn tại' });
    }

    const newTag = new Tag({
      name,
      description
    });

    const savedTag = await newTag.save();
    res.status(201).json({ success: true, data: savedTag });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
});

router.get('/detail/:id', isAdmin, async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thẻ' });
    }
    res.json({ success: true, data: tag });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
});
router.post('/update/:id', [
  authMiddleware,
  adminMiddleware,
  isAdmin,
  body('name').notEmpty().withMessage('Tên thẻ không được để trống')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, description } = req.body;
    const tag = await Tag.findById(req.params.id);
    
    if (!tag) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thẻ' });
    }

    // Kiểm tra tên thẻ đã tồn tại (trừ chính nó)
    const existingTag = await Tag.findOne({ name, _id: { $ne: req.params.id } });
    if (existingTag) {
      return res.status(400).json({ success: false, message: 'Tên thẻ đã tồn tại' });
    }

    tag.name = name;
    tag.description = description || tag.description;

    const updatedTag = await tag.save();
    res.json({ success: true, data: updatedTag });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
});

router.get('/delete/:id', [
  authMiddleware,
  adminMiddleware,
  isAdmin
], async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thẻ' });
    }

    const newsWithTag = await News.findOne({ tags: req.params.id });
    if (newsWithTag) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể xóa thẻ đang được sử dụng trong bài viết' 
      });
    }

    await Tag.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Xóa thẻ thành công' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
});

module.exports = router; 