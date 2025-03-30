const mongoose = require('mongoose');
const slugify = require('slugify');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên thẻ không được để trống'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  description: String,
  newsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});
 
tagSchema.pre('save', function(next) { 
  this.slug = slugify(this.name, { lower: true, strict: true });
  next();
});

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag; 