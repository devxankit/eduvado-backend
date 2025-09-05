import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../models/Course.js';
import CourseCategory from '../models/CourseCategory.js';

// Load environment variables
dotenv.config();

// Migration script to convert old string categories to new category references
const migrateCategories = async () => {
  try {
    console.log('Starting migration...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create default categories
    const defaultCategories = [
      {
        name: 'JEE',
        description: 'Joint Entrance Examination preparation courses',
        color: '#3B82F6',
        icon: 'BookOpen',
        sortOrder: 1
      },
      {
        name: 'NEET',
        description: 'National Eligibility cum Entrance Test preparation courses',
        color: '#10B981',
        icon: 'Microscope',
        sortOrder: 2
      },
      {
        name: 'Other',
        description: 'Other educational courses',
        color: '#6B7280',
        icon: 'GraduationCap',
        sortOrder: 3
      }
    ];

    // Create categories if they don't exist
    const createdCategories = {};
    for (const categoryData of defaultCategories) {
      let category = await CourseCategory.findOne({ name: categoryData.name });
      if (!category) {
        category = await CourseCategory.create(categoryData);
        console.log(`Created category: ${category.name}`);
      } else {
        console.log(`Category already exists: ${category.name}`);
      }
      createdCategories[categoryData.name] = category._id;
    }

    // Update courses with old string categories or no categories
    const coursesWithStringCategories = await Course.find({ 
      category: { $type: 'string', $ne: 'undefined' } 
    });
    const coursesWithoutCategories = await Course.find({ 
      $or: [
        { category: { $exists: false } },
        { category: null },
        { category: 'undefined' }
      ]
    });
    
    console.log(`Found ${coursesWithStringCategories.length} courses with string categories`);
    console.log(`Found ${coursesWithoutCategories.length} courses without categories`);

    // Update courses with string categories
    for (const course of coursesWithStringCategories) {
      const categoryId = createdCategories[course.category];
      if (categoryId) {
        course.category = categoryId;
        await course.save();
        console.log(`Updated course "${course.title}" to use category ID: ${categoryId}`);
      } else {
        console.log(`Warning: No category found for "${course.category}" in course "${course.title}"`);
      }
    }

    // Assign default "Other" category to courses without categories
    const otherCategoryId = createdCategories['Other'];
    for (const course of coursesWithoutCategories) {
      course.category = otherCategoryId;
      await course.save();
      console.log(`Assigned "Other" category to course "${course.title}"`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run migration
migrateCategories().catch(console.error);

export default migrateCategories;
