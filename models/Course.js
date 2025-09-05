import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    minlength: [3, 'Course title must be at least 3 characters long'],
    maxlength: [100, 'Course title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    trim: true,
    minlength: [20, 'Course description must be at least 20 characters long'],
    maxlength: [1000, 'Course description cannot exceed 1000 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseCategory',
    required: [true, 'Course category is required'],
    validate: {
      validator: async function(categoryId) {
        const CourseCategory = mongoose.model('CourseCategory');
        const category = await CourseCategory.findById(categoryId);
        return category && category.isActive;
      },
      message: 'Category must exist and be active'
    }
  },
  price: {
    type: Number,
    required: [true, 'Course price is required'],
    min: [0, 'Course price cannot be negative'],
    max: [999999, 'Course price cannot exceed 999,999']
  },
  duration: {
    type: String,
    required: [true, 'Course duration is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Accept formats like "6 months", "12 weeks", "30 days", "2 years"
        return /^\d+\s+(month|week|day|year|hour)s?$/i.test(v);
      },
      message: 'Duration must be in format like "6 months", "12 weeks", "30 days", etc.'
    }
  },
  image: {
    type: String,
    required: [true, 'Course image is required'],
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Image must be a valid URL ending with .jpg, .jpeg, .png, .gif, or .webp'
    }
  },
  instructor: {
    type: String,
    trim: true,
    maxlength: [50, 'Instructor name cannot exceed 50 characters']
  },
  level: {
    type: String,
    enum: {
      values: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      message: 'Level must be one of: Beginner, Intermediate, Advanced, Expert'
    },
    default: 'Beginner'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Each tag cannot exceed 20 characters']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  enrollmentCount: {
    type: Number,
    default: 0,
    min: [0, 'Enrollment count cannot be negative']
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative']
    }
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  prerequisites: [{
    type: String,
    trim: true,
    maxlength: [100, 'Each prerequisite cannot exceed 100 characters']
  }],
  learningOutcomes: [{
    type: String,
    trim: true,
    maxlength: [200, 'Each learning outcome cannot exceed 200 characters']
  }]
}, {
  timestamps: true
});

// Pre-save middleware to generate slug
courseSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Post-save middleware to update category course count
courseSchema.post('save', async function(doc) {
  if (doc.category) {
    const CourseCategory = mongoose.model('CourseCategory');
    const category = await CourseCategory.findById(doc.category);
    if (category) {
      await category.updateCourseCount();
    }
  }
});

// Post-remove middleware to update category course count
courseSchema.post('deleteOne', { document: true, query: false }, async function(doc) {
  if (doc.category) {
    const CourseCategory = mongoose.model('CourseCategory');
    const category = await CourseCategory.findById(doc.category);
    if (category) {
      await category.updateCourseCount();
    }
  }
});

// Indexes for better performance
courseSchema.index({ title: 1 });
courseSchema.index({ slug: 1 });
courseSchema.index({ category: 1, isActive: 1 });
courseSchema.index({ isActive: 1, isFeatured: 1 });
courseSchema.index({ price: 1 });
courseSchema.index({ 'rating.average': -1 });
courseSchema.index({ enrollmentCount: -1 });
courseSchema.index({ createdAt: -1 });

// Text index for search
courseSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text',
  instructor: 'text'
});

// Virtual for formatted price
courseSchema.virtual('formattedPrice').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(this.price);
});

// Method to update enrollment count
courseSchema.methods.updateEnrollmentCount = async function() {
  // This would be called when a user enrolls/unenrolls
  // For now, we'll keep it simple
  return this.save();
};

// Static method to get courses by category with pagination
courseSchema.statics.getCoursesByCategory = async function(categoryId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  const courses = await this.find({ category: categoryId, isActive: true })
    .populate('category', 'name color icon')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
  const total = await this.countDocuments({ category: categoryId, isActive: true });
  
  return {
    courses,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  };
};

// Static method to search courses
courseSchema.statics.searchCourses = async function(query, filters = {}) {
  const searchQuery = {
    $and: [
      { isActive: true },
      filters.category ? { category: filters.category } : {},
      filters.level ? { level: filters.level } : {},
      filters.minPrice ? { price: { $gte: filters.minPrice } } : {},
      filters.maxPrice ? { price: { $lte: filters.maxPrice } } : {},
      query ? { $text: { $search: query } } : {}
    ]
  };

  return this.find(searchQuery)
    .populate('category', 'name color icon')
    .sort(filters.sortBy || { createdAt: -1 })
    .limit(filters.limit || 20);
};

const Course = mongoose.model('Course', courseSchema);
export default Course; 