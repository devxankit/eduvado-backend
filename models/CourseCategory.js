import mongoose from 'mongoose';

const courseCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters long'],
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Category description is required'],
    trim: true,
    minlength: [10, 'Category description must be at least 10 characters long'],
    maxlength: [200, 'Category description cannot exceed 200 characters']
  },
  color: {
    type: String,
    default: '#3B82F6',
    validate: {
      validator: function(v) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Color must be a valid hex color code'
    }
  },
  icon: {
    type: String,
    default: 'BookOpen',
    enum: {
      values: [
        'BookOpen', 'GraduationCap', 'Laptop', 'Code', 'Calculator', 
        'Microscope', 'Atom', 'Dna', 'FlaskConical', 'Brain',
        'Lightbulb', 'Target', 'Trophy', 'Star', 'Award', 'Users',
        'Book', 'PenTool', 'Layers', 'Puzzle', 'Rocket'
      ],
      message: 'Invalid icon selected'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: [0, 'Sort order cannot be negative']
  },
  courseCount: {
    type: Number,
    default: 0,
    min: [0, 'Course count cannot be negative']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate slug
courseCategorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Index for better performance
courseCategorySchema.index({ name: 1 });
courseCategorySchema.index({ slug: 1 });
courseCategorySchema.index({ isActive: 1, sortOrder: 1 });
courseCategorySchema.index({ courseCount: -1 });

// Virtual for course count (will be updated by course operations)
courseCategorySchema.virtual('courses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'category'
});

// Method to update course count
courseCategorySchema.methods.updateCourseCount = async function() {
  const Course = mongoose.model('Course');
  const count = await Course.countDocuments({ category: this._id, isActive: true });
  this.courseCount = count;
  return this.save();
};

// Static method to get categories with course counts
courseCategorySchema.statics.getCategoriesWithCounts = async function() {
  return this.aggregate([
    {
      $lookup: {
        from: 'courses',
        localField: '_id',
        foreignField: 'category',
        as: 'courses'
      }
    },
    {
      $addFields: {
        courseCount: { $size: '$courses' }
      }
    },
    {
      $project: {
        courses: 0
      }
    },
    {
      $sort: { sortOrder: 1, name: 1 }
    }
  ]);
};

const CourseCategory = mongoose.model('CourseCategory', courseCategorySchema);
export default CourseCategory;
