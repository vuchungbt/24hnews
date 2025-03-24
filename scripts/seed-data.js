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

    // Tạo người dùng
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      fullName: 'Administrator',
      role: 'admin',
      status: 'active'
    });

    const user = await User.create({
      username: 'journalist',
      email: 'journalist@example.com',
      password: await bcrypt.hash('author123', 10),
      fullName: 'Journalist User',
      role: 'user',
      status: 'active'
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

    // Tạo bài viết mẫu
    await News.create([
      {
        title: 'AI Thay Đổi Thế Giới Như Thế Nào?',
        content: 'Trí tuệ nhân tạo đang nhanh chóng thay đổi mọi lĩnh vực của cuộc sống...',
        author: admin._id,
        category: categories[0]._id,
        status: 'published',
        tags: ['hot', 'popular'],
        featuredImage: '/images/ai-tech.jpg',
        publishedAt: new Date(),
        viewCount: 1500
      },
      {
        title: 'Startup Việt Gọi Vốn Thành Công',
        content: 'Một startup công nghệ Việt Nam vừa nhận được khoản đầu tư lớn từ quỹ ngoại...',
        author: user._id,
        category: categories[1]._id,
        status: 'published',
        tags: ['popular'],
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
        tags: ['hot'],
        featuredImage: '/images/vietnamese-cinema.jpg',
        publishedAt: new Date(),
        viewCount: 980
      },
      {
        title: 'Xu Hướng Công Nghệ 2024',
        content: 'Những xu hướng công nghệ dự báo sẽ thống trị trong năm 2024...',
        author: user._id,
        category: categories[0]._id,
        status: 'published',
        tags: ['advertisement'],
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
