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
const Settings = require('../models/Settings');
const Tag = require('../models/Tag');


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


router.get('/dashboard', async (req, res) => {
  try {
    let dashboard = await Dashboard.findOne();
    
    if (!dashboard) {
      dashboard = new Dashboard();
    }
    
    await dashboard.updateStatistics();
    await dashboard.updateTimeStats();
    
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

router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find()
      .populate('parent', 'name')
      .sort({ level: 1, name: 1 });
    res.render('admin/categories', { 
      categories,
      path: '/admin/categories'
    });
  } catch (error) {
    console.error('Error:', error);
    req.flash('error', 'Lỗi khi tải danh sách danh mục');
    res.redirect('/admin/dashboard');
  }
});


router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
      
    res.render('admin/users', {
      title: 'Quản lý người dùng',
      users,
      currentUser: req.user,
      path: '/admin/users'
    });
  } catch (error) {
    console.error('Error loading users:', error);
    req.flash('error', 'Lỗi khi tải danh sách người dùng');
    res.redirect('/admin/dashboard');
  }
});


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


router.get('/settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    res.render('admin/settings', {
      title: 'Cài đặt hệ thống',
      settings,
      path: '/admin/settings'
    });
  } catch (error) {
    console.error('Error loading settings:', error);
    req.flash('error', 'Lỗi khi tải trang cài đặt');
    res.redirect('/admin/dashboard');
  }
});


router.post('/settings/general', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'favicon', maxCount: 1 }
]), async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cài đặt' });
    }

    const { siteName, siteDescription, contactEmail, contactPhone, address } = req.body;

    if (req.files && req.files.logo) {
      const logoFile = req.files.logo[0];
      settings.siteLogo = `/uploads/${logoFile.filename}`;
    }

    if (req.files && req.files.favicon) {
      const faviconFile = req.files.favicon[0];
      settings.siteFavicon = `/uploads/${faviconFile.filename}`;
    }

    settings.siteName = siteName;
    settings.siteDescription = siteDescription;
    settings.contactEmail = contactEmail;
    settings.contactPhone = contactPhone;
    settings.address = address;

    await settings.save();
    res.json({ success: true, message: 'Đã cập nhật cài đặt chung' });
  } catch (error) {
    console.error('Error updating general settings:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật cài đặt' });
  }
});
 
router.post('/settings/email', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      message: 'Thông tin email được cấu hình trong file .env. Vui lòng cập nhật file .env để thay đổi cài đặt email.' 
    });
  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật cài đặt' });
  }
}); 
router.post('/settings/social', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cài đặt' });
    }

    const { facebook, twitter, instagram, youtube } = req.body;

    settings.socialMedia = {
      facebook,
      twitter,
      instagram,
      youtube
    };

    await settings.save();
    res.json({ success: true, message: 'Đã cập nhật cài đặt mạng xã hội' });
  } catch (error) {
    console.error('Error updating social media settings:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật cài đặt' });
  }
});
 
router.post('/settings/test-email', async (req, res) => {
  try {
    res.json({ success: true, message: 'Đã gửi email thử nghiệm' });
  } catch (error) {
    console.error('Error testing email settings:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi gửi email thử nghiệm' });
  }
}); 
router.get('/news', async (req, res) => {
  try {
    const news = await News.find()
      .populate('author', 'username')
      .populate('category', 'name')
      .populate({
        path: 'tags',
        select: 'name'
      })
      .sort({ createdAt: -1 });

    const categories = await Category.find().sort({ name: 1 });
    const tags = await Tag.find().sort({ name: 1 });
      
    res.render('admin/news-management', {
      title: 'Quản lý tin tức',
      news,
      categories,
      tags,
      path: '/admin/news'
    });
  } catch (error) {
    console.error('Error loading news:', error);
    req.flash('error', 'Lỗi khi tải danh sách tin tức');
    res.redirect('/admin/dashboard');
  }
});
 
router.post('/news/create', upload.single('imageUrl'), async (req, res) => {
  try {
    const { title, content, category, tags, status } = req.body;
     
    let processedTags = [];
    if (tags) {
      if (typeof tags === 'string') {
        processedTags = tags.split(',').filter(tag => tag.trim() !== '');
      } else if (Array.isArray(tags)) {
        processedTags = tags;
      }
    }
    
    const news = new News({
      title,
      content,
      author: req.user._id,
      category,
      tags: processedTags,
      status: status || 'draft',
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
      publishedAt: status === 'published' ? new Date() : null
    });

    await news.save();
     
    const dashboard = await Dashboard.findOne();
    if (dashboard) {
      await dashboard.updateTimeStats();
    }

    res.json({
      success: true,
      message: 'Thêm bài viết thành công'
    });
  } catch (error) {
    console.error('Error creating news:', error);
     
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề bài viết đã tồn tại, vui lòng đổi tiêu đề khác'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm bài viết'
    });
  }
});
 
router.post('/news/edit/:id', upload.single('imageUrl'), async (req, res) => {
  try {
    const { title, content, category, tags, status } = req.body;
    
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    news.title = title;
    news.content = content;
    news.category = category; 

    if (tags) { 
      if (typeof tags === 'string') {
        news.tags = tags.split(',').filter(tag => tag.trim() !== '');
      } else if (Array.isArray(tags)) {
        news.tags = tags;
      } else {
        news.tags = [];
      }
    } else {
      news.tags = [];
    }
    
    news.status = status;
    news.publishedAt = status === 'published' ? new Date() : null;

    if (req.file) { 
      if (news.imageUrl) {
        const oldImagePath = path.join(__dirname, '../public', news.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      news.imageUrl = `/uploads/${req.file.filename}`;
    }

    await news.save();
 
    const dashboard = await Dashboard.findOne();
    if (dashboard) {
      await dashboard.updateTimeStats();
    }

    res.json({
      success: true,
      message: 'Cập nhật bài viết thành công'
    });
  } catch (error) {
    console.error('Error updating news:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật bài viết'
    });
  }
});
 
router.get('/news/delete/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      req.flash('error', 'Không tìm thấy bài viết');
      return res.redirect('/admin/news');
    }
 
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
 
router.post('/users/create', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
 
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc tên người dùng đã tồn tại'
      });
    }

 
    const user = new User({
      username,
      email,
      password,  
      role: role || 'user',
      status: 'active'
    });

    await user.save();

 
    const dashboard = await Dashboard.findOne();
    if (dashboard) {
      await dashboard.updateStatistics();
    }

    res.json({
      success: true,
      message: 'Thêm người dùng thành công'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm người dùng'
    });
  }
});
 
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin người dùng'
    });
  }
});
 
router.put('/users/:id', async (req, res) => {
  try {
    const { username, email, password, role, status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
 
    const existingUser = await User.findOne({
      $and: [
        { _id: { $ne: user._id } },
        { $or: [{ email }, { username }] }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc tên người dùng đã tồn tại'
      });
    }
 
    user.username = username;
    user.email = email;
    user.role = role;
    user.status = status;
 
    if (password) {
      user.password = password;
    }

    await user.save();
 
    const dashboard = await Dashboard.findOne();
    if (dashboard) {
      await dashboard.updateStatistics();
    }

    res.json({
      success: true,
      message: 'Cập nhật thông tin người dùng thành công'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật thông tin người dùng'
    });
  }
});

 
router.delete('/users/:id', async (req, res) => {
  try {
 
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }

    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Không cho phép xóa chính mình
    if (userToDelete._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tài khoản của chính mình'
      });
    }

    // Không cho phép xóa user có quyền admin
    if (userToDelete.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tài khoản có quyền admin'
      });
    }

    await User.findByIdAndDelete(userToDelete._id);

 
    const dashboard = await Dashboard.findOne();
    if (dashboard) {
      await dashboard.updateStatistics();
    }

    res.json({
      success: true,
      message: 'Xóa người dùng thành công'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa người dùng'
    });
  }
});

 
router.get('/tags', async (req, res) => {
  try {
    const tags = await Tag.find().sort({ name: 1 });
    res.render('admin/tags', {
      title: 'Quản lý thẻ',
      tags,
      currentUser: req.user,
      path: 'tags'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Lỗi khi tải danh sách thẻ');
    res.redirect('/admin/dashboard');
  }
});

module.exports = router;
