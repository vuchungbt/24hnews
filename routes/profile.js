const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/avatars/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2000000 }, // 2MB
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

router.post('/update', authMiddleware, async (req, res) => {
  try {
    const { username, email, bio, phone, address } = req.body;
    const user = await User.findById(req.user._id);

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
    user.bio = bio;
    user.phone = phone;
    user.address = address;

    await user.save();

    user.activities.push({
      action: 'Cập nhật thông tin cá nhân',
      details: 'Đã cập nhật thông tin cá nhân'
    });
    await user.save();

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật thông tin'
    });
  }
});

router.post('/update-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác'
      });
    }

    user.password = newPassword;
    await user.save();

    user.activities.push({
      action: 'Đổi mật khẩu',
      details: 'Đã thay đổi mật khẩu'
    });
    await user.save();

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đổi mật khẩu'
    });
  }
});

router.post('/update-avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ảnh'
      });
    }

    if (user.avatar && user.avatar !== '/images/default-avatar.png') {
      const oldAvatarPath = path.join(__dirname, '../public', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    user.activities.push({
      action: 'Cập nhật ảnh đại diện',
      details: 'Đã thay đổi ảnh đại diện'
    });
    await user.save();

    res.json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật ảnh đại diện'
    });
  }
});

module.exports = router; 