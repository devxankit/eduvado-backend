import express from 'express';
import Course from '../models/Course.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkEnrollmentAccess } from '../middleware/subscriptionMiddleware.js';

const router = express.Router();

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