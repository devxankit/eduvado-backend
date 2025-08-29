import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testModels() {
  try {
    console.log('Testing model imports...');
    
    // Test importing models
    const PrivacyPolicy = await import('./models/PrivacyPolicy.js');
    console.log('✓ PrivacyPolicy imported successfully');
    
    const TermsAndConditions = await import('./models/TermsAndConditions.js');
    console.log('✓ TermsAndConditions imported successfully');
    
    const ReturnAndRefund = await import('./models/ReturnAndRefund.js');
    console.log('✓ ReturnAndRefund imported successfully');
    
    const User = await import('./models/User.js');
    console.log('✓ User imported successfully');
    
    console.log('All models imported successfully!');
    
  } catch (error) {
    console.error('Error importing models:', error);
  } finally {
    process.exit(0);
  }
}

testModels();
