const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên danh mục không được để trống'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  description: String,
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0
  },
  postCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});
 
categorySchema.pre('save', async function(next) { 
  this.slug = slugify(this.name, { lower: true, strict: true });
  
  if (this.parent) {
    const parentCategory = await this.constructor.findById(this.parent);
    if (parentCategory) {
      this.level = parentCategory.level + 1;
      if (this.level > 1) {
        throw new Error('Không thể tạo danh mục con quá 2 cấp');
      }
    }
  } else {
    this.level = 0;
  }
  
  next();
});

categorySchema.methods.getChildren = async function() {
  return await this.constructor.find({ parent: this._id });
};

categorySchema.methods.getParents = async function() {
  return await this.constructor.find({ _id: { $in: this.path } });
};

categorySchema.methods.isParentOf = async function(categoryId) {
  const child = await this.constructor.findById(categoryId);
  if (!child) return false;
  
  let current = child;
  while (current.parent) {
    if (current.parent.toString() === this._id.toString()) {
      return true;
    }
    current = await this.constructor.findById(current.parent);
  }
  
  return false;
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
