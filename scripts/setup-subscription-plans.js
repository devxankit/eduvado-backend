import mongoose from 'mongoose';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createSubscriptionPlans = async () => {
  try {
    console.log('🔄 Creating subscription plans...');
    
    // Check if plans already exist
    const existingPlans = await SubscriptionPlan.find();
    if (existingPlans.length > 0) {
      console.log('📋 Subscription plans already exist:');
      existingPlans.forEach(plan => {
        console.log(`   - ${plan.planType}: ₹${plan.price} (${plan.isActive ? 'Active' : 'Inactive'})`);
      });
      return;
    }

    // Create default subscription plans
    const plans = [
      {
        planType: 'monthly',
        description: 'Monthly subscription with full access to all courses',
        price: 299,
        isActive: true
      },
      {
        planType: 'quarterly',
        description: 'Quarterly subscription with full access to all courses',
        price: 799,
        isActive: true
      },
      {
        planType: 'yearly',
        description: 'Yearly subscription with full access to all courses',
        price: 2499,
        isActive: true
      }
    ];

    for (const planData of plans) {
      const plan = new SubscriptionPlan(planData);
      await plan.save();
      console.log(`✅ Created ${planData.planType} plan: ₹${planData.price}`);
    }

    console.log('🎉 All subscription plans created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating subscription plans:', error);
  }
};

const main = async () => {
  await connectDB();
  await createSubscriptionPlans();
  await mongoose.disconnect();
  console.log('✅ Setup completed');
};

main();
