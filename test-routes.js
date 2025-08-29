import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testRoutes() {
  try {
    console.log('Testing route imports...');
    
    // Test importing routes
    const contentRouter = await import('./routes/contentRoutes.js');
    console.log('✓ Content routes imported successfully');
    
    // Test importing middleware
    const { protect, admin } = await import('./middleware/authMiddleware.js');
    console.log('✓ Auth middleware imported successfully');
    
    console.log('All routes and middleware imported successfully!');
    
  } catch (error) {
    console.error('Error importing routes:', error);
  } finally {
    process.exit(0);
  }
}

testRoutes();
