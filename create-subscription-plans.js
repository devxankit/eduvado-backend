import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import the SubscriptionPlan model
import SubscriptionPlan from './models/SubscriptionPlan.js';

// Database connection function
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('MongoDB Connection Error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    process.exit(1);
  }
};

// Function to create default subscription plans
const createDefaultPlans = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Check if plans already exist
    const existingPlans = await SubscriptionPlan.find({});
    
    if (existingPlans.length > 0) {
      console.log('✅ Subscription plans already exist:');
      existingPlans.forEach(plan => {
        console.log(`   - ${plan.planType}: ₹${plan.price}`);
      });
      console.log('\n🎉 No action needed - plans are already set up!');
    } else {
      // Create default plans
      const defaultPlans = [
        {
          planType: 'monthly',
          description: 'Get unlimited access to all premium learning materials on a monthly basis. Perfect for students who want to try our platform or prefer monthly commitments.',
          price: 299
        },
        {
          planType: 'quarterly',
          description: 'Get the most out of your learning experience with our Quarterly plan, designed for great value with 3 months access and unlimited access to all features.',
          price: 799
        },
        {
          planType: 'yearly',
          description: 'Best value for long-term learners. Get unlimited access to all premium content for a full year with significant savings compared to monthly plans.',
          price: 2499
        }
      ];
      
      const createdPlans = await SubscriptionPlan.insertMany(defaultPlans);
      console.log('✅ Default subscription plans created successfully:');
      createdPlans.forEach(plan => {
        console.log(`   - ${plan.planType}: ₹${plan.price}`);
      });
      console.log('\n🎉 All subscription plans are now ready!');
    }
    
  } catch (error) {
    console.error('❌ Error creating subscription plans:', error.message);
    console.error('Full error:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  }
};

// Run the script
console.log('🚀 Starting subscription plans creation script...');
console.log('This will create three default subscription plans:');
console.log('- Monthly: ₹299');
console.log('- Quarterly: ₹799');
console.log('- Yearly: ₹2499');
console.log('----------------------------------------\n');

createDefaultPlans();
