const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ status: 1 });

// Methods
commentSchema.methods.like = async function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    this.dislikes = this.dislikes.filter(id => id.toString() !== userId.toString());
    await this.save();
    return true;
  }
  return false;
};

commentSchema.methods.dislike = async function(userId) {
  if (!this.dislikes.includes(userId)) {
    this.dislikes.push(userId);
    this.likes = this.likes.filter(id => id.toString() !== userId.toString());
    await this.save();
    return true;
  }
  return false;
};

commentSchema.methods.edit = async function(newContent) {
  this.editHistory.push({
    content: this.content
  });
  this.content = newContent;
  this.isEdited = true;
  await this.save();
};

// Virtuals
commentSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

commentSchema.virtual('dislikesCount').get(function() {
  return this.dislikes.length;
});

// Pre-save middleware
commentSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.isEdited = true;
  }
  next();
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment; 