const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
 
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find()
      .populate('parent', 'name')
      .sort({ level: 1, name: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
});
 
router.post('/add', [
  authMiddleware,
  adminMiddleware,
  body('name').notEmpty().withMessage('Tên danh mục không được để trống')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, description, parent } = req.body;
 
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Tên danh mục đã tồn tại' });
    }
 
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({ success: false, message: 'Danh mục cha không tồn tại' });
      }
      if (parentCategory.level !== 0) {
        return res.status(400).json({ success: false, message: 'Chỉ có thể chọn danh mục cấp 0 làm danh mục cha' });
      }
    }

    const newCategory = new Category({
      name,
      description,
      parent: parent || null
    });

    const savedCategory = await newCategory.save();
    res.status(201).json({ success: true, data: savedCategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi máy chủ' });
  }
});
 
router.get('/detail/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('parent', 'name');
    if (!category) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
});
 
router.post('/update/:id', [
  authMiddleware,
  adminMiddleware,
  body('name').notEmpty().withMessage('Tên danh mục không được để trống')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, description, parent } = req.body;
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    }
 
    const existingCategory = await Category.findOne({ name, _id: { $ne: req.params.id } });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Tên danh mục đã tồn tại' });
    }
 
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({ success: false, message: 'Danh mục cha không tồn tại' });
      }
      if (parentCategory.level !== 0) {
        return res.status(400).json({ success: false, message: 'Chỉ có thể chọn danh mục cấp 0 làm danh mục cha' });
      }
       
      if (parent === req.params.id) {
        return res.status(400).json({ success: false, message: 'Không thể chọn chính mình làm danh mục cha' });
      }
       
      const isChild = await category.isParentOf(parent);
      if (isChild) {
        return res.status(400).json({ success: false, message: 'Không thể chọn danh mục con làm danh mục cha' });
      }
    }

    category.name = name;
    category.description = description || category.description;
    category.parent = parent || null;

    const updatedCategory = await category.save();
    res.json({ success: true, data: updatedCategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi máy chủ' });
  }
});
 
router.get('/delete/:id', [
  authMiddleware,
  adminMiddleware
], async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    }
 
    await Category.deleteMany({ parent: req.params.id });
     
    await Category.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, message: 'Xóa danh mục thành công' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
});

module.exports = router;
