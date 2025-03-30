const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Nạp biến môi trường
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import models
const User = require('../models/User');
const Category = require('../models/Category');
const News = require('../models/News');
const Tag = require('../models/Tag');

// Dữ liệu mẫu
const seedData = async () => {
  try {
    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Xóa dữ liệu cũ
    await User.deleteMany({});
    await Category.deleteMany({});
    await News.deleteMany({});
    await Tag.deleteMany({});

    // Tạo người dùng
    const admin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      fullName: 'Administrator',
      role: 'admin',
      status: 'active',
      isEmailVerified: true,
      avatar: '/images/default-avatar.png',
      preferences: {
        emailNotifications: true,
        theme: 'system'
      },
      bio: 'Quản trị viên hệ thống',
      phone: '0123456789',
      address: 'Hà Nội, Việt Nam',
      activities: [{
        action: 'Tạo tài khoản',
        details: 'Tài khoản được tạo thông qua seed data'
      }]
    });

    const editor = await User.create({
      username: 'editor',
      email: 'editor@example.com',
      password: 'editor123',
      fullName: 'Editor User',
      role: 'editor',
      status: 'active',
      isEmailVerified: true,
      avatar: '/images/default-avatar.png',
      preferences: {
        emailNotifications: true,
        theme: 'system'
      },
      bio: 'Biên tập viên',
      phone: '0987654321',
      address: 'TP.HCM, Việt Nam',
      activities: [{
        action: 'Tạo tài khoản',
        details: 'Tài khoản được tạo thông qua seed data'
      }]
    });

    const user = await User.create({
      username: 'user',
      email: 'user@example.com',
      password: 'user123',
      fullName: 'Normal User',
      role: 'user',
      status: 'active',
      isEmailVerified: true,
      avatar: '/images/default-avatar.png',
      preferences: {
        emailNotifications: true,
        theme: 'system'
      },
      bio: 'Người dùng thông thường',
      phone: '0369852147',
      address: 'Đà Nẵng, Việt Nam',
      activities: [{
        action: 'Tạo tài khoản',
        details: 'Tài khoản được tạo thông qua seed data'
      }]
    });

    // Tạo danh mục
    const categories = await Category.create([
      { 
        name: 'Công Nghệ', 
        slug: 'cong-nghe',
        description: 'Tin tức về công nghệ mới nhất' 
      },
      { 
        name: 'Kinh Doanh', 
        slug: 'kinh-doanh',
        description: 'Thông tin về kinh tế và doanh nghiệp' 
      },
      { 
        name: 'Giải Trí', 
        slug: 'giai-tri',
        description: 'Tin tức giải trí và văn hóa' 
      }
    ]);

    // Tạo tags
    const tags = await Tag.create([
      { name: 'hot', slug: 'hot' },
      { name: 'popular', slug: 'popular' },
      { name: 'advertisement', slug: 'advertisement' }
    ]);

    // Tạo bài viết mẫu
    await News.create([
      {
        title: 'AI Thay Đổi Thế Giới Như Thế Nào?',
        content: 'Trí tuệ nhân tạo đang nhanh chóng thay đổi mọi lĩnh vực của cuộc sống...',
        author: admin._id,
        category: categories[0]._id,
        status: 'published',
        tags: [tags[0]._id, tags[1]._id],
        featuredImage: '/images/ai-tech.jpg',
        publishedAt: new Date(),
        viewCount: 1500
      },
      {
        title: 'Startup Việt Gọi Vốn Thành Công',
        content: 'Một startup công nghệ Việt Nam vừa nhận được khoản đầu tư lớn từ quỹ ngoại...',
        author: editor._id,
        category: categories[1]._id,
        status: 'published',
        tags: [tags[1]._id],
        featuredImage: '/images/startup-funding.jpg',
        publishedAt: new Date(),
        viewCount: 1200
      },
      {
        title: 'Phim Việt Tạo Dấu Ấn Quốc Tế',
        content: 'Điện ảnh Việt Nam đang có những bước tiến mạnh mẽ trên trường quốc tế...',
        author: admin._id,
        category: categories[2]._id,
        status: 'published',
        tags: [tags[0]._id],
        featuredImage: '/images/vietnamese-cinema.jpg',
        publishedAt: new Date(),
        viewCount: 980
      },
      {
        title: 'Xu Hướng Công Nghệ 2024',
        content: 'Những xu hướng công nghệ dự báo sẽ thống trị trong năm 2024...',
        author: editor._id,
        category: categories[0]._id,
        status: 'published',
        tags: [tags[2]._id],
        featuredImage: '/images/tech-trends.jpg',
        publishedAt: new Date(),
        viewCount: 750
      }
    ]);

    console.log('Dữ liệu mẫu đã được tạo thành công!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('Lỗi khi tạo dữ liệu mẫu:', error);
    process.exit(1);
  }
};

seedData();
