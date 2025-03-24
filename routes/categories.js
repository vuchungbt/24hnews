const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Tạo danh mục mới
router.post('/create', [
  authMiddleware,
  adminMiddleware,
  body('name').notEmpty().withMessage('Tên danh mục không được để trống'),
  body('slug').notEmpty().withMessage('Slug không được để trống')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, slug } = req.body;

    // Kiểm tra slug đã tồn tại
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ message: 'Slug đã tồn tại' });
    }

    const newCategory = new Category({
      name,
      description,
      slug
    });

    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Lấy danh sách danh mục
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Chi tiết danh mục
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }
    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Cập nhật danh mục
router.put('/:id', [
  authMiddleware,
  adminMiddleware,
  body('name').notEmpty().withMessage('Tên danh mục không được để trống')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, slug } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }

    // Kiểm tra slug nếu có thay đổi
    if (slug && slug !== category.slug) {
      const existingCategory = await Category.findOne({ slug });
      if (existingCategory) {
        return res.status(400).json({ message: 'Slug đã tồn tại' });
      }
      category.slug = slug;
    }

    category.name = name;
    category.description = description || category.description;

    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Xóa danh mục
router.delete('/:id', [
  authMiddleware,
  adminMiddleware
], async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xóa danh mục thành công' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

module.exports = router;
