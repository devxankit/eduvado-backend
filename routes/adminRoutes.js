import express from 'express';
import Course from '../models/Course.js';
import CourseCategory from '../models/CourseCategory.js';
import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import UserSubscription from '../models/UserSubscription.js';
import Payment from '../models/Payment.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Course Management Routes

// Get all courses with advanced filtering (admin)
router.get('/courses', protect, admin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      search, 
      level, 
      isActive, 
      isFeatured,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    let query = {};
    if (category) query.category = category;
    if (level) query.level = level;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';
    if (search) {
      query.$text = { $search: search };
    }
    
    // Build sort
    const sortOptions = {
      'createdAt': { createdAt: sortOrder === 'desc' ? -1 : 1 },
      'title': { title: sortOrder === 'desc' ? -1 : 1 },
      'price': { price: sortOrder === 'desc' ? -1 : 1 },
      'enrollmentCount': { enrollmentCount: sortOrder === 'desc' ? -1 : 1 },
      'rating': { 'rating.average': sortOrder === 'desc' ? -1 : 1 }
    };
    
    const sort = sortOptions[sortBy] || sortOptions.createdAt;
    
    const courses = await Course.find(query)
      .populate('category', 'name color icon courseCount')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Course.countDocuments(query);
    
    // Get category information for filters
    const categories = await CourseCategory.find({ isActive: true })
      .select('name _id')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      courses,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      },
      filters: {
        categories,
        levels: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get single course (admin)
router.get('/courses/:id', protect, admin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('category', 'name color icon description');
    
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }
    
    res.json({
      success: true,
      course
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Create new course (admin)
router.post('/courses', protect, admin, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      category, 
      price, 
      duration, 
      image, 
      instructor,
      level,
      tags,
      prerequisites,
      learningOutcomes
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !category || !price || !duration || !image) {
      return res.status(400).json({ 
        success: false,
        message: 'Title, description, category, price, duration, and image are required' 
      });
    }
    
    // Verify category exists and is active
    const categoryExists = await CourseCategory.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ 
        success: false,
        message: 'Selected category does not exist. Please create categories first in the Categories page.' 
      });
    }
    if (!categoryExists.isActive) {
      return res.status(400).json({ 
        success: false,
        message: 'Selected category is inactive. Please select an active category or activate the category first.' 
      });
    }
    
    const course = await Course.create({
      title: title.trim(),
      description: description.trim(),
      category,
      price: parseFloat(price),
      duration: duration.trim(),
      image: image.trim(),
      instructor: instructor?.trim(),
      level: level || 'Beginner',
      tags: tags || [],
      prerequisites: prerequisites || [],
      learningOutcomes: learningOutcomes || []
    });
    
    // Populate category for response
    await course.populate('category', 'name color icon');
    
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Error creating course:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: messages 
      });
    }
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Update course (admin)
router.put('/courses/:id', protect, admin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }

    const { 
      title, 
      description, 
      category, 
      price, 
      duration, 
      image, 
      instructor,
      level,
      tags,
      prerequisites,
      learningOutcomes,
      isActive,
      isFeatured
    } = req.body;
    
    // Verify category if being updated
    if (category && category !== course.category.toString()) {
      const categoryExists = await CourseCategory.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ 
          success: false,
          message: 'Selected category does not exist. Please create categories first in the Categories page.' 
        });
      }
      if (!categoryExists.isActive) {
        return res.status(400).json({ 
          success: false,
          message: 'Selected category is inactive. Please select an active category or activate the category first.' 
        });
      }
    }
    
    // Update fields
    if (title) course.title = title.trim();
    if (description) course.description = description.trim();
    if (category) course.category = category;
    if (price !== undefined) course.price = parseFloat(price);
    if (duration) course.duration = duration.trim();
    if (image) course.image = image.trim();
    if (instructor !== undefined) course.instructor = instructor?.trim();
    if (level) course.level = level;
    if (tags) course.tags = tags;
    if (prerequisites) course.prerequisites = prerequisites;
    if (learningOutcomes) course.learningOutcomes = learningOutcomes;
    if (isActive !== undefined) course.isActive = isActive;
    if (isFeatured !== undefined) course.isFeatured = isFeatured;

    const updatedCourse = await course.save();
    await updatedCourse.populate('category', 'name color icon');
    
    res.json({
      success: true,
      message: 'Course updated successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Error updating course:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: messages 
      });
    }
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Delete course (admin)
router.delete('/courses/:id', protect, admin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }

    await course.deleteOne();
    res.json({ 
      success: true,
      message: 'Course deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Toggle course status (admin)
router.patch('/courses/:id/toggle', protect, admin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }

    course.isActive = !course.isActive;
    await course.save();
    await course.populate('category', 'name color icon');
    
    res.json({
      success: true,
      message: `Course ${course.isActive ? 'activated' : 'deactivated'} successfully`,
      course
    });
  } catch (error) {
    console.error('Error toggling course status:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Toggle course featured status (admin)
router.patch('/courses/:id/feature', protect, admin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }

    course.isFeatured = !course.isFeatured;
    await course.save();
    await course.populate('category', 'name color icon');
    
    res.json({
      success: true,
      message: `Course ${course.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      course
    });
  } catch (error) {
    console.error('Error toggling course featured status:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get course statistics (admin)
router.get('/courses/stats', protect, admin, async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments();
    const activeCourses = await Course.countDocuments({ isActive: true });
    const featuredCourses = await Course.countDocuments({ isFeatured: true });
    
    const categoryStats = await Course.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      {
        $lookup: {
          from: 'coursecategories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      },
      {
        $project: {
          categoryName: '$category.name',
          count: 1,
          avgPrice: { $round: ['$avgPrice', 2] }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const levelStats = await Course.aggregate([
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    res.json({
      success: true,
      stats: {
        totalCourses,
        activeCourses,
        featuredCourses,
        categoryStats,
        levelStats
      }
    });
  } catch (error) {
    console.error('Error fetching course statistics:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Course Category Management Routes

// Get all course categories with course counts (admin)
router.get('/courseCategories', protect, admin, async (req, res) => {
  try {
    const { includeInactive = false, sortBy = 'sortOrder' } = req.query;
    
    let query = {};
    if (!includeInactive) {
      query.isActive = true;
    }
    
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

// Get single course category (admin)
router.get('/courseCategories/:id', protect, admin, async (req, res) => {
  try {
    const category = await CourseCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: 'Category not found' 
      });
    }
    
    // Get courses in this category
    const courses = await Course.find({ category: req.params.id })
      .select('title price isActive createdAt')
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

// Create new course category (admin)
router.post('/courseCategories', protect, admin, async (req, res) => {
  try {
    const { name, description, color, icon, sortOrder } = req.body;
    
    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({ 
        success: false,
        message: 'Name and description are required' 
      });
    }
    
    // Check if category name already exists
    const existingCategory = await CourseCategory.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    if (existingCategory) {
      return res.status(400).json({ 
        success: false,
        message: 'Category name already exists' 
      });
    }
    
    const category = await CourseCategory.create({
      name: name.trim(),
      description: description.trim(),
      color: color || '#3B82F6',
      icon: icon || 'BookOpen',
      sortOrder: sortOrder || 0
    });
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: messages 
      });
    }
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Update course category (admin)
router.put('/courseCategories/:id', protect, admin, async (req, res) => {
  try {
    const category = await CourseCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: 'Category not found' 
      });
    }

    const { name, description, color, icon, isActive, sortOrder } = req.body;
    
    // Check if category name already exists for other categories
    if (name && name !== category.name) {
      const existingCategory = await CourseCategory.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      if (existingCategory) {
        return res.status(400).json({ 
          success: false,
          message: 'Category name already exists' 
        });
      }
    }
    
    // Update fields
    if (name) category.name = name.trim();
    if (description) category.description = description.trim();
    if (color) category.color = color;
    if (icon) category.icon = icon;
    if (isActive !== undefined) category.isActive = isActive;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;

    const updatedCategory = await category.save();
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      category: updatedCategory
    });
  } catch (error) {
    console.error('Error updating category:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: messages 
      });
    }
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Delete course category (admin)
router.delete('/courseCategories/:id', protect, admin, async (req, res) => {
  try {
    const category = await CourseCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: 'Category not found' 
      });
    }

    // Check if any courses are using this category
    const coursesUsingCategory = await Course.countDocuments({ category: req.params.id });
    if (coursesUsingCategory > 0) {
      return res.status(400).json({ 
        success: false,
        message: `Cannot delete category. ${coursesUsingCategory} course(s) are using this category. Please reassign or delete these courses first.` 
      });
    }

    await category.deleteOne();
    res.json({ 
      success: true,
      message: 'Category deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Toggle category status (admin)
router.patch('/courseCategories/:id/toggle', protect, admin, async (req, res) => {
  try {
    const category = await CourseCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: 'Category not found' 
      });
    }

    category.isActive = !category.isActive;
    await category.save();
    
    res.json({
      success: true,
      message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
      category
    });
  } catch (error) {
    console.error('Error toggling category status:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get all users (admin)
router.get('/users', protect, admin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user role (admin)
router.put('/users/:id/role', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = req.body.role;
    const updatedUser = await user.save();
    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all subscription plans (admin)
router.get('/subscriptions', protect, admin, async (req, res) => {
  try {
    const subscriptionPlans = await SubscriptionPlan.find({});
    res.json(subscriptionPlans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new subscription plan (admin)
router.post('/subscriptions', protect, admin, async (req, res) => {
  try {
    const { planType, description, price } = req.body;
    
    // Check if plan type already exists
    const existingPlan = await SubscriptionPlan.findOne({ planType });
    if (existingPlan) {
      return res.status(400).json({ message: 'Plan type already exists' });
    }
    
    const subscriptionPlan = await SubscriptionPlan.create({
      planType,
      description,
      price
    });
    res.status(201).json(subscriptionPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update subscription plan (admin)
router.put('/subscriptions/:id', protect, admin, async (req, res) => {
  try {
    const subscriptionPlan = await SubscriptionPlan.findById(req.params.id);
    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    const { planType, description, price, isActive } = req.body;
    
    // Check if plan type already exists for other subscription plans
    if (planType && planType !== subscriptionPlan.planType) {
      const existingPlan = await SubscriptionPlan.findOne({ planType, _id: { $ne: req.params.id } });
      if (existingPlan) {
        return res.status(400).json({ message: 'Plan type already exists' });
      }
    }
    
    subscriptionPlan.planType = planType || subscriptionPlan.planType;
    subscriptionPlan.description = description || subscriptionPlan.description;
    subscriptionPlan.price = price || subscriptionPlan.price;
    subscriptionPlan.isActive = isActive !== undefined ? isActive : subscriptionPlan.isActive;

    const updatedSubscriptionPlan = await subscriptionPlan.save();
    res.json(updatedSubscriptionPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete subscription plan (admin)
router.delete('/subscriptions/:id', protect, admin, async (req, res) => {
  try {
    const subscriptionPlan = await SubscriptionPlan.findById(req.params.id);
    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    await subscriptionPlan.deleteOne();
    res.json({ message: 'Subscription plan removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all user subscriptions (admin)
router.get('/user-subscriptions', protect, admin, async (req, res) => {
  try {
    const subscriptions = await UserSubscription.find({})
      .populate('userId', 'name email')
      .populate('planId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      subscriptions: subscriptions
    });
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user subscription details (admin)
router.get('/user-subscriptions/:userId', protect, admin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const subscriptions = await UserSubscription.find({ userId })
      .populate('planId')
      .sort({ createdAt: -1 });

    const user = await User.findById(userId).select('name email hasActiveSubscription isTrialActive trialStartDate trialEndDate');

    res.json({
      success: true,
      user: user,
      subscriptions: subscriptions
    });
  } catch (error) {
    console.error('Error fetching user subscription details:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all payments (admin)
router.get('/payments', protect, admin, async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate('userId', 'name email')
      .populate('planId')
      .populate('subscriptionId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments: payments
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get payment statistics (admin)
router.get('/payment-stats', protect, admin, async (req, res) => {
  try {
    const totalPayments = await Payment.countDocuments({ status: 'captured' });
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'captured' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const monthlyStats = await Payment.aggregate([
      { $match: { status: 'captured' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    const planStats = await Payment.aggregate([
      { $match: { status: 'captured' } },
      {
        $group: {
          _id: '$planType',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalPayments,
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyStats,
        planStats
      }
    });
  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    res.status(500).json({ message: error.message });
  }
});

// Manage trial period (admin)
router.put('/manage-trial/:userId', protect, admin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, days } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const subscription = await UserSubscription.findOne({
      userId: userId,
      status: 'trial'
    });

    if (!subscription) {
      return res.status(404).json({ message: 'No trial subscription found for this user' });
    }

    if (action === 'extend') {
      // Extend trial period
      const newTrialEndDate = new Date(subscription.trialEndDate);
      newTrialEndDate.setDate(newTrialEndDate.getDate() + (days || 3));
      
      subscription.trialEndDate = newTrialEndDate;
      await subscription.save();

      // Update user trial status
      user.trialEndDate = newTrialEndDate;
      await user.save();

      res.json({
        success: true,
        message: `Trial extended by ${days || 3} days`,
        newTrialEndDate: newTrialEndDate
      });
    } else if (action === 'end') {
      // End trial immediately
      subscription.trialEndDate = new Date();
      subscription.status = 'expired';
      await subscription.save();

      user.isTrialActive = false;
      user.hasActiveSubscription = false;
      await user.save();

      res.json({
        success: true,
        message: 'Trial ended immediately'
      });
    } else {
      res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error managing trial period:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get subscription analytics (admin)
router.get('/subscription-analytics', protect, admin, async (req, res) => {
  try {
    const totalSubscriptions = await UserSubscription.countDocuments();
    const activeSubscriptions = await UserSubscription.countDocuments({
      status: { $in: ['trial', 'active'] }
    });
    const trialSubscriptions = await UserSubscription.countDocuments({ status: 'trial' });
    const paidSubscriptions = await UserSubscription.countDocuments({ status: 'active' });

    const planDistribution = await UserSubscription.aggregate([
      {
        $group: {
          _id: '$planType',
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlySubscriptions = await UserSubscription.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      analytics: {
        totalSubscriptions,
        activeSubscriptions,
        trialSubscriptions,
        paidSubscriptions,
        planDistribution,
        monthlySubscriptions
      }
    });
  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
    res.status(500).json({ message: error.message });
  }
});

export const adminRouter = router; 