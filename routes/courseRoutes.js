import express from 'express';
import Course from '../models/Course.js';
import CourseCategory from '../models/CourseCategory.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkEnrollmentAccess } from '../middleware/subscriptionMiddleware.js';

const router = express.Router();

// Public Category Routes

// Get all active categories (public)
router.get('/categories', async (req, res) => {
  try {
    const { sortBy = 'sortOrder', includeInactive = false } = req.query;
    
    let query = {};
    if (!includeInactive) {
      query.isActive = true;
    }
    
    // Get categories with course counts
    const categories = await CourseCategory.getCategoriesWithCounts();
    const filteredCategories = includeInactive ? categories : categories.filter(cat => cat.isActive);
    
    // Sort categories
    const sortOptions = {
      'sortOrder': { sortOrder: 1, name: 1 },
      'name': { name: 1 },
      'courseCount': { courseCount: -1 },
      'createdAt': { createdAt: -1 }
    };
    
    filteredCategories.sort((a, b) => {
      const sort = sortOptions[sortBy] || sortOptions.sortOrder;
      for (const [key, direction] of Object.entries(sort)) {
        if (a[key] !== b[key]) {
          return direction === 1 ? a[key] - b[key] : b[key] - a[key];
        }
      }
      return 0;
    });
    
    res.json({
      success: true,
      categories: filteredCategories,
      total: filteredCategories.length
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get single category by ID (public)
router.get('/categories/:id', async (req, res) => {
  try {
    const category = await CourseCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: 'Category not found' 
      });
    }
    
    // Get courses in this category (only active courses)
    const courses = await Course.find({ 
      category: req.params.id, 
      isActive: true 
    })
      .select('title description price duration image instructor level tags createdAt')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      category: {
        ...category.toObject(),
        courses
      }
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get single category by slug (public)
router.get('/categories/slug/:slug', async (req, res) => {
  try {
    const category = await CourseCategory.findOne({ 
      slug: req.params.slug,
      isActive: true 
    });
    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: 'Category not found' 
      });
    }
    
    // Get courses in this category (only active courses)
    const courses = await Course.find({ 
      category: category._id, 
      isActive: true 
    })
      .select('title description price duration image instructor level tags createdAt')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      category: {
        ...category.toObject(),
        courses
      }
    });
  } catch (error) {
    console.error('Error fetching category by slug:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get all courses (public, but enrollment requires subscription)
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true }).populate('category', 'name color icon');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get course by ID (public, but enrollment requires subscription)
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('category', 'name color icon');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get courses by category
router.get('/category/:category', async (req, res) => {
  try {
    const courses = await Course.find({
      category: req.params.category,
      isActive: true
    }).populate('category', 'name color icon');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Enroll in course (requires subscription)
router.post('/:id/enroll', protect, checkEnrollmentAccess, async (req, res) => {
  try {
    const courseId = req.params.id;
    // Use _id since protect middleware sets req.user to User document
    const userId = req.user._id;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Here you would typically add enrollment logic
    // For now, we'll just return success since subscription is already verified
    res.json({
      success: true,
      message: 'Successfully enrolled in course',
      course: course,
      subscription: req.subscription
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export const courseRouter = router; 