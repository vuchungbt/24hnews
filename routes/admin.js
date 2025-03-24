const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const slugify = require('slugify');
const News = require('../models/News');
const Category = require('../models/Category');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const Dashboard = require('../models/Dashboard');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Settings = require('../models/Settings');

// Cấu hình multer cho upload ảnh
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh!'));
    }
  }
});

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    let dashboard = await Dashboard.findOne();
    
    if (!dashboard) {
      dashboard = new Dashboard();
    }
    
    await dashboard.updateStatistics();
    
    res.render('admin/dashboard', {
      title: 'Dashboard',
      dashboard,
      path: '/admin/dashboard'
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    req.flash('error', 'Lỗi khi tải trang dashboard');
    res.redirect('/admin');
  }
});

// Posts Management
router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username')
      .populate('category', 'name')
      .sort({ createdAt: -1 });
      
    res.render('admin/posts', {
      title: 'Quản lý bài viết',
      posts,
      path: '/admin/posts'
    });
  } catch (error) {
    console.error('Error loading posts:', error);
    req.flash('error', 'Lỗi khi tải danh sách bài viết');
    res.redirect('/admin/dashboard');
  }
});

// Add new post
router.post('/posts', upload.single('featuredImage'), async (req, res) => {
  try {
    const { title, content, category, tags, status } = req.body;
    const post = new Post({
      title,
      content,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      status,
      author: req.user._id,
      featuredImage: req.file ? `/uploads/${req.file.filename}` : undefined
    });
    await post.save();
    req.flash('success', 'Thêm bài viết thành công');
    res.redirect('/admin/posts');
  } catch (error) {
    console.error('Error adding post:', error);
    req.flash('error', 'Lỗi khi thêm bài viết');
    res.redirect('/admin/posts');
  }
});

// Edit post
router.post('/posts/:id', upload.single('featuredImage'), async (req, res) => {
  try {
    const { title, content, category, tags, status } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      req.flash('error', 'Không tìm thấy bài viết');
      return res.redirect('/admin/posts');
    }
    
    post.title = title;
    post.content = content;
    post.category = category;
    post.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
    post.status = status;
    
    if (req.file) {
      // Xóa ảnh cũ
      if (post.featuredImage) {
        const oldImagePath = path.join(__dirname, '../public', post.featuredImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      post.featuredImage = `/uploads/${req.file.filename}`;
    }
    
    await post.save();
    req.flash('success', 'Cập nhật bài viết thành công');
    res.redirect('/admin/posts');
  } catch (error) {
    console.error('Error updating post:', error);
    req.flash('error', 'Lỗi khi cập nhật bài viết');
    res.redirect('/admin/posts');
  }
});

// Delete post
router.delete('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    
    // Xóa ảnh
    if (post.featuredImage) {
      const imagePath = path.join(__dirname, '../public', post.featuredImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await post.remove();
    res.json({ message: 'Xóa bài viết thành công' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Lỗi khi xóa bài viết' });
  }
});

// Categories Management
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ name: 1 });
      
    res.render('admin/categories', {
      title: 'Quản lý danh mục',
      categories,
      path: '/admin/categories'
    });
  } catch (error) {
    console.error('Error loading categories:', error);
    req.flash('error', 'Lỗi khi tải danh sách danh mục');
    res.redirect('/admin/dashboard');
  }
});

// Add new category
router.post('/categories', async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = new Category({
      name,
      description,
      slug: slugify(name, { lower: true, strict: true, locale: 'vi' })
    });
    await category.save();
    req.flash('success', 'Thêm danh mục thành công');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Error adding category:', error);
    req.flash('error', 'Lỗi khi thêm danh mục');
    res.redirect('/admin/categories');
  }
});

// Edit category
router.post('/categories/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      req.flash('error', 'Không tìm thấy danh mục');
      return res.redirect('/admin/categories');
    }
    
    category.name = name;
    category.description = description;
    category.slug = slugify(name, { lower: true, strict: true, locale: 'vi' });
    
    await category.save();
    req.flash('success', 'Cập nhật danh mục thành công');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Error updating category:', error);
    req.flash('error', 'Lỗi khi cập nhật danh mục');
    res.redirect('/admin/categories');
  }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }
    
    // Kiểm tra xem danh mục có bài viết không
    const postCount = await Post.countDocuments({ category: category._id });
    if (postCount > 0) {
      return res.status(400).json({ message: 'Không thể xóa danh mục có bài viết' });
    }
    
    await category.remove();
    res.json({ message: 'Xóa danh mục thành công' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Lỗi khi xóa danh mục' });
  }
});

// Comments Management
router.get('/comments', async (req, res) => {
  try {
    const comments = await Comment.find()
      .populate('author', 'username')
      .populate('post', 'title')
      .sort({ createdAt: -1 });
      
    res.render('admin/comments', {
      title: 'Quản lý bình luận',
      comments,
      path: '/admin/comments'
    });
  } catch (error) {
    console.error('Error loading comments:', error);
    req.flash('error', 'Lỗi khi tải danh sách bình luận');
    res.redirect('/admin/dashboard');
  }
});

// Approve comment
router.post('/comments/:id/approve', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    }
    
    comment.status = 'approved';
    await comment.save();
    
    res.json({ message: 'Duyệt bình luận thành công' });
  } catch (error) {
    console.error('Error approving comment:', error);
    res.status(500).json({ message: 'Lỗi khi duyệt bình luận' });
  }
});

// Reject comment
router.post('/comments/:id/reject', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    }
    
    comment.status = 'rejected';
    await comment.save();
    
    res.json({ message: 'Từ chối bình luận thành công' });
  } catch (error) {
    console.error('Error rejecting comment:', error);
    res.status(500).json({ message: 'Lỗi khi từ chối bình luận' });
  }
});

// Delete comment
router.delete('/comments/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    }
    
    await comment.remove();
    res.json({ message: 'Xóa bình luận thành công' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Lỗi khi xóa bình luận' });
  }
});

// Users Management
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
      
    res.render('admin/users', {
      title: 'Quản lý người dùng',
      users,
      path: '/admin/users'
    });
  } catch (error) {
    console.error('Error loading users:', error);
    req.flash('error', 'Lỗi khi tải danh sách người dùng');
    res.redirect('/admin/dashboard');
  }
});

// Update user status
router.post('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    user.status = status;
    await user.save();
    
    res.json({ message: 'Cập nhật trạng thái thành công' });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái' });
  }
});

// Settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const dashboard = await Dashboard.findOne();
    
    res.render('admin/settings', {
      title: 'Cài đặt hệ thống',
      settings,
      dashboard,
      path: '/admin/settings'
    });
  } catch (error) {
    console.error('Error loading settings:', error);
    req.flash('error', 'Lỗi khi tải cài đặt');
    res.redirect('/admin/dashboard');
  }
});

// Update settings
router.post('/settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    await settings.updateSettings(req.body);
    
    req.flash('success', 'Cập nhật cài đặt thành công');
    res.redirect('/admin/settings');
  } catch (error) {
    console.error('Error updating settings:', error);
    req.flash('error', 'Lỗi khi cập nhật cài đặt');
    res.redirect('/admin/settings');
  }
});

// Backup management
router.get('/backup', async (req, res) => {
  try {
    const dashboard = await Dashboard.findOne();
    res.render('admin/backup', {
      title: 'Quản lý Backup',
      dashboard,
      path: '/admin/backup'
    });
  } catch (error) {
    console.error('Error loading backup settings:', error);
    req.flash('error', 'Lỗi khi tải cài đặt backup');
    res.redirect('/admin/dashboard');
  }
});

// Create backup
router.post('/backup/create', async (req, res) => {
  try {
    // Implement backup logic here
    res.json({ success: true, message: 'Backup đã được tạo thành công' });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo backup' });
  }
});

// News Management
router.get('/news', async (req, res) => {
  try {
    const news = await News.find()
      .populate('author', 'username')
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    const categories = await Category.find().sort({ name: 1 });
      
    res.render('admin/news-management', {
      title: 'Quản lý tin tức',
      news,
      categories,
      path: '/admin/news'
    });
  } catch (error) {
    console.error('Error loading news:', error);
    req.flash('error', 'Lỗi khi tải danh sách tin tức');
    res.redirect('/admin/dashboard');
  }
});

// Create News
router.post('/news/create', upload.single('imageUrl'), async (req, res) => {
  try {
    const { title, content, category, tags, status } = req.body;
    
    const news = new News({
      title,
      content,
      author: req.user._id,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      status: status || 'draft',
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null
    });

    await news.save();
    req.flash('success', 'Thêm bài viết thành công');
    res.redirect('/admin/news');
  } catch (error) {
    console.error('Error creating news:', error);
    req.flash('error', 'Lỗi khi thêm bài viết');
    res.redirect('/admin/news');
  }
});

// Edit News
router.post('/news/edit/:id', upload.single('imageUrl'), async (req, res) => {
  try {
    const { title, content, category, tags, status } = req.body;
    
    const news = await News.findById(req.params.id);
    if (!news) {
      req.flash('error', 'Không tìm thấy bài viết');
      return res.redirect('/admin/news');
    }

    news.title = title;
    news.content = content;
    news.category = category;
    news.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
    news.status = status;

    if (req.file) {
      // Xóa ảnh cũ nếu có
      if (news.imageUrl) {
        const oldImagePath = path.join(__dirname, '../public', news.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      news.imageUrl = `/uploads/${req.file.filename}`;
    }

    await news.save();
    req.flash('success', 'Cập nhật bài viết thành công');
    res.redirect('/admin/news');
  } catch (error) {
    console.error('Error updating news:', error);
    req.flash('error', 'Lỗi khi cập nhật bài viết');
    res.redirect('/admin/news');
  }
});

// Delete News
router.get('/news/delete/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      req.flash('error', 'Không tìm thấy bài viết');
      return res.redirect('/admin/news');
    }

    // Xóa ảnh nếu có
    if (news.imageUrl) {
      const imagePath = path.join(__dirname, '../public', news.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await News.findByIdAndDelete(req.params.id);
    req.flash('success', 'Xóa bài viết thành công');
    res.redirect('/admin/news');
  } catch (error) {
    console.error('Error deleting news:', error);
    req.flash('error', 'Lỗi khi xóa bài viết');
    res.redirect('/admin/news');
  }
});

module.exports = router;
