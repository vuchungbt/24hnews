const jwt = require('jsonwebtoken');
const User = require('../models/User');


const userToView = (req, res, next) => {
  res.locals.user = req.user;
  next();
};

const authMiddleware = async (req, res, next) => {
  try {

    const token = req.cookies.token;
    
    if (!token) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ 
          success: false, 
          message: 'Vui lòng đăng nhập để thực hiện thao tác này' 
        });
      }
      return res.status(401).redirect('/login');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    

    const user = await User.findById(decoded.userId);
    
    if (!user) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ 
          success: false, 
          message: 'Phiên đăng nhập đã hết hạn' 
        });
      }
      return res.status(401).redirect('/login');
    }


    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Phiên đăng nhập đã hết hạn' 
      });
    }
    res.status(401).redirect('/login');
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).render('error', { message: 'Bạn không có quyền truy cập trang này' });
  }
};


const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error', 'Vui lòng đăng nhập để tiếp tục');
  res.redirect('/login');
};

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      req.flash('error', 'Vui lòng đăng nhập để tiếp tục');
      return res.redirect('/login');
    }

    if (req.user.role !== 'admin') {
      req.flash('error', 'Bạn không có quyền truy cập trang này');
      return res.redirect('/');
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    req.flash('error', 'Lỗi xác thực');
    res.redirect('/login');
  }
};

const isEditor = async (req, res, next) => {
  try {
    if (!req.user) {
      req.flash('error', 'Vui lòng đăng nhập để tiếp tục');
      return res.redirect('/login');
    }

    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      req.flash('error', 'Bạn không có quyền truy cập trang này');
      return res.redirect('/');
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.flash('error', 'Lỗi xác thực');
    res.redirect('/login');
  }
};


const checkAccountStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    if (req.user.status === 'banned') {
      req.flash('error', 'Tài khoản của bạn đã bị khóa');
      return res.redirect('/login');
    }

    if (req.user.status === 'inactive') {
      req.flash('warning', 'Tài khoản của bạn đang bị tạm khóa');
    }

    next();
  } catch (error) {
    console.error('Account status middleware error:', error);
    next();
  }
};


const logLoginHistory = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $push: {
            loginHistory: {
              date: new Date(),
              ip: req.ip,
              device: req.headers['user-agent']
            }
          },
          lastLogin: new Date()
        },
        { new: true }
      );
    }
    next();
  } catch (error) {
    console.error('Login history middleware error:', error);
    next();
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  isAuthenticated,
  isAdmin,
  isEditor,
  checkAccountStatus,
  logLoginHistory,
  userToView
};
