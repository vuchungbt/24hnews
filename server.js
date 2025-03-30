const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const cors = require('cors');
const { isAdmin, checkAccountStatus, logLoginHistory, userToView } = require('./middleware/auth');
const categoriesMiddleware = require('./middleware/categories');
const settingsMiddleware = require('./middleware/settings');
require('dotenv').config();


const categoriesRouter = require('./routes/categories');
const tagsRouter = require('./routes/tags');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/news-website')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(categoriesMiddleware);
app.use(settingsMiddleware);

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  res.locals.warning_msg = req.flash('warning');
  res.locals.info_msg = req.flash('info');
  next();
});


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (token) {
      const jwt = require('jsonwebtoken');
      const User = require('./models/User');
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId);
        
        if (user) {
          req.user = user;
        } else {
          res.clearCookie('token');
        }
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          res.clearCookie('token');
        }
      }
    }
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next();
  }
});


app.use('/api/auth', require('./routes/auth'));
app.use('/api/news', require('./routes/news'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/categories', require('./routes/categories'));
app.use('/news', require('./routes/news'));
app.use('/', require('./routes/home'));
app.use('/', require('./routes/client'));

app.use('/admin', userToView, checkAccountStatus, logLoginHistory, isAdmin, require('./routes/admin'));
app.use('/admin/categories', userToView, checkAccountStatus, logLoginHistory, isAdmin, categoriesRouter);
app.use('/admin/tags', userToView, checkAccountStatus, logLoginHistory, isAdmin, tagsRouter);


app.use((req, res) => {
  res.status(404).render('error', { message: 'Trang không tồn tại' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { message: 'Lỗi máy chủ' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
