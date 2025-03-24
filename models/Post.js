const mongoose = require('mongoose');
const slugify = require('slugify');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    trim: true
  },
  featuredImage: {
    type: String,
    default: '/images/default-post.jpg'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  isBreaking: {
    type: Boolean,
    default: false
  },
  metaTitle: String,
  metaDescription: String,
  metaKeywords: [String],
  lastEdited: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
postSchema.index({ title: 'text', content: 'text' });
postSchema.index({ slug: 1 });
postSchema.index({ category: 1 });
postSchema.index({ author: 1 });
postSchema.index({ status: 1 });
postSchema.index({ createdAt: -1 });

// Pre-save middleware
postSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      locale: 'vi'
    });
  }
  
  if (this.isModified('content')) {
    this.lastEdited = new Date();
  }
  
  next();
});

// Methods
postSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
};

postSchema.methods.like = async function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    this.dislikes = this.dislikes.filter(id => id.toString() !== userId.toString());
    await this.save();
    return true;
  }
  return false;
};

postSchema.methods.dislike = async function(userId) {
  if (!this.dislikes.includes(userId)) {
    this.dislikes.push(userId);
    this.likes = this.likes.filter(id => id.toString() !== userId.toString());
    await this.save();
    return true;
  }
  return false;
};

// Virtuals
postSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

postSchema.virtual('dislikesCount').get(function() {
  return this.dislikes.length;
});

postSchema.virtual('commentsCount').get(function() {
  return this.comments.length;
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post; 