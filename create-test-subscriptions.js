import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import User from './models/User.js';
import SubscriptionPlan from './models/SubscriptionPlan.js';
import UserSubscription from './models/UserSubscription.js';
import Course from './models/Course.js';

// Local helper functions (in case Razorpay is not configured)
const calculateSubscriptionEndDate = (planType, startDate = new Date()) => {
  const start = new Date(startDate);
  
  switch (planType) {
    case 'monthly':
      return new Date(start.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
    case 'quarterly':
      return new Date(start.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days
    case 'yearly':
      return new Date(start.getTime() + (360 * 24 * 60 * 60 * 1000)); // 360 days
    default:
      throw new Error('Invalid plan type');
  }
};

const calculateTrialEndDate = (startDate = new Date()) => {
  const start = new Date(startDate);
  return new Date(start.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days
};

// Database connection function
const connectDB = async () => {
  try {
    console.log('🔌 Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    process.exit(1);
  }
};

// Function to create test subscriptions
const createTestSubscriptions = async () => {
  try {
    console.log('🚀 Starting test subscription creation script...\n');

    // Connect to database
    await connectDB();

    // Get all subscription plans
    const plans = await SubscriptionPlan.find({ isActive: true });
    if (plans.length === 0) {
      console.log('❌ No subscription plans found. Please run "npm run create-plans" first.');
      return;
    }

    console.log('📋 Available subscription plans:');
    plans.forEach(plan => {
      console.log(`   - ${plan.planType}: ₹${plan.price}`);
    });

    // Get all regular users (non-admin)
    const users = await User.find({ role: 'user', isVerified: true });
    if (users.length === 0) {
      console.log('❌ No verified users found in database.');
      return;
    }

    console.log(`\n👥 Found ${users.length} verified users in database.`);

    // Get all courses
    const courses = await Course.find({ isActive: true });
    if (courses.length === 0) {
      console.log('❌ No active courses found in database.');
    } else {
      console.log(`📚 Found ${courses.length} active courses in database.`);
    }

    // Create test subscriptions for different scenarios
    const testScenarios = [
      {
        name: 'Trial Subscriptions (3 days)',
        count: Math.min(5, users.length),
        status: 'trial',
        daysOffset: 0
      },
      {
        name: 'Active Subscriptions (recent)',
        count: Math.min(3, users.length - 5),
        status: 'active',
        daysOffset: -1 // Started 1 day ago
      },
      {
        name: 'Expired Subscriptions',
        count: Math.min(2, users.length - 8),
        status: 'expired',
        daysOffset: -10 // Started 10 days ago
      }
    ];

    let createdCount = 0;
    let userIndex = 0;

    for (const scenario of testScenarios) {
      if (userIndex >= users.length) break;

      console.log(`\n📝 Creating ${scenario.name}...`);
      
      for (let i = 0; i < scenario.count && userIndex < users.length; i++) {
        const user = users[userIndex];
        
        // Skip if user already has a subscription
        const existingSubscription = await UserSubscription.findOne({
          userId: user._id,
          status: { $in: ['trial', 'active'] }
        });

        if (existingSubscription) {
          console.log(`   ⚠️  User ${user.email} already has an active subscription, skipping...`);
          userIndex++;
          continue;
        }

        // Select a random plan
        const plan = plans[Math.floor(Math.random() * plans.length)];
        
        // Calculate dates based on scenario
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + scenario.daysOffset);
        
        const trialStartDate = startDate;
        const trialEndDate = calculateTrialEndDate(trialStartDate);
        const subscriptionEndDate = calculateSubscriptionEndDate(plan.planType, trialEndDate);

        // Determine final status based on dates
        let finalStatus = scenario.status;
        const now = new Date();
        
        if (scenario.status === 'trial' && now > trialEndDate) {
          finalStatus = 'expired';
        } else if (scenario.status === 'active' && now > subscriptionEndDate) {
          finalStatus = 'expired';
        }

        // Create subscription
        const subscription = new UserSubscription({
          userId: user._id,
          planId: plan._id,
          planType: plan.planType,
          startDate: startDate,
          endDate: subscriptionEndDate,
          status: finalStatus,
          amount: plan.price,
          paymentStatus: finalStatus === 'active' ? 'completed' : 'pending',
          trialStartDate: trialStartDate,
          trialEndDate: trialEndDate,
          isTrialPeriod: finalStatus === 'trial'
        });

        await subscription.save();

        // Update user subscription status
        await User.findByIdAndUpdate(user._id, {
          hasActiveSubscription: finalStatus === 'trial' || finalStatus === 'active',
          trialStartDate: trialStartDate,
          trialEndDate: trialEndDate,
          isTrialActive: finalStatus === 'trial'
        });

        console.log(`   ✅ Created ${finalStatus} subscription for ${user.email} (${plan.planType})`);
        createdCount++;
        userIndex++;
      }
    }

    // Create some subscriptions with different payment statuses
    console.log('\n💰 Creating subscriptions with different payment statuses...');
    
    const paymentScenarios = [
      { paymentStatus: 'completed', count: 2 },
      { paymentStatus: 'failed', count: 1 },
      { paymentStatus: 'pending', count: 1 }
    ];

    for (const scenario of paymentScenarios) {
      for (let i = 0; i < scenario.count && userIndex < users.length; i++) {
        const user = users[userIndex];
        
        // Skip if user already has a subscription
        const existingSubscription = await UserSubscription.findOne({
          userId: user._id
        });

        if (existingSubscription) {
          userIndex++;
          continue;
        }

        const plan = plans[Math.floor(Math.random() * plans.length)];
        const startDate = new Date();
        const trialStartDate = startDate;
        const trialEndDate = calculateTrialEndDate(trialStartDate);
        const subscriptionEndDate = calculateSubscriptionEndDate(plan.planType, trialEndDate);

        const subscription = new UserSubscription({
          userId: user._id,
          planId: plan._id,
          planType: plan.planType,
          startDate: startDate,
          endDate: subscriptionEndDate,
          status: 'trial',
          amount: plan.price,
          paymentStatus: scenario.paymentStatus,
          trialStartDate: trialStartDate,
          trialEndDate: trialEndDate,
          isTrialPeriod: true
        });

        await subscription.save();

        await User.findByIdAndUpdate(user._id, {
          hasActiveSubscription: true,
          trialStartDate: trialStartDate,
          trialEndDate: trialEndDate,
          isTrialActive: true
        });

        console.log(`   ✅ Created subscription with ${scenario.paymentStatus} payment for ${user.email}`);
        createdCount++;
        userIndex++;
      }
    }

    // Generate statistics
    console.log('\n📊 Generating subscription statistics...');
    
    const totalSubscriptions = await UserSubscription.countDocuments();
    const trialSubscriptions = await UserSubscription.countDocuments({ status: 'trial' });
    const activeSubscriptions = await UserSubscription.countDocuments({ status: 'active' });
    const expiredSubscriptions = await UserSubscription.countDocuments({ status: 'expired' });
    const cancelledSubscriptions = await UserSubscription.countDocuments({ status: 'cancelled' });

    const completedPayments = await UserSubscription.countDocuments({ paymentStatus: 'completed' });
    const pendingPayments = await UserSubscription.countDocuments({ paymentStatus: 'pending' });
    const failedPayments = await UserSubscription.countDocuments({ paymentStatus: 'failed' });

    console.log('\n📈 Subscription Statistics:');
    console.log(`   Total Subscriptions: ${totalSubscriptions}`);
    console.log(`   Trial Subscriptions: ${trialSubscriptions}`);
    console.log(`   Active Subscriptions: ${activeSubscriptions}`);
    console.log(`   Expired Subscriptions: ${expiredSubscriptions}`);
    console.log(`   Cancelled Subscriptions: ${cancelledSubscriptions}`);

    console.log('\n💳 Payment Statistics:');
    console.log(`   Completed Payments: ${completedPayments}`);
    console.log(`   Pending Payments: ${pendingPayments}`);
    console.log(`   Failed Payments: ${failedPayments}`);

    // Plan distribution
    const planDistribution = await UserSubscription.aggregate([
      {
        $group: {
          _id: '$planType',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n📋 Plan Distribution:');
    planDistribution.forEach(plan => {
      console.log(`   ${plan._id}: ${plan.count} subscriptions`);
    });

    console.log(`\n🎉 Successfully created ${createdCount} test subscriptions!`);
    console.log('\n✅ Test data is now ready for admin dashboard testing.');
    console.log('   You can now view these subscriptions in the admin panel.');

  } catch (error) {
    console.error('❌ Error creating test subscriptions:', error.message);
    console.error('Full error:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
    process.exit(0);
  }
};

// Function to create sample courses if none exist
const createSampleCourses = async () => {
  try {
    const existingCourses = await Course.countDocuments();
    
    if (existingCourses === 0) {
      console.log('📚 Creating sample courses...');
      
      const sampleCourses = [
        {
          title: 'JEE Main Physics',
          description: 'Complete JEE Main Physics preparation course covering all topics from mechanics to modern physics.',
          category: 'JEE',
          price: 1999,
          duration: '6 months',
          image: 'https://via.placeholder.com/300x200?text=JEE+Physics'
        },
        {
          title: 'JEE Main Chemistry',
          description: 'Comprehensive JEE Main Chemistry course with organic, inorganic, and physical chemistry.',
          category: 'JEE',
          price: 1799,
          duration: '5 months',
          image: 'https://via.placeholder.com/300x200?text=JEE+Chemistry'
        },
        {
          title: 'JEE Main Mathematics',
          description: 'Advanced JEE Main Mathematics course covering algebra, calculus, and geometry.',
          category: 'JEE',
          price: 1899,
          duration: '6 months',
          image: 'https://via.placeholder.com/300x200?text=JEE+Math'
        },
        {
          title: 'NEET Biology',
          description: 'Complete NEET Biology preparation with botany and zoology coverage.',
          category: 'NEET',
          price: 1699,
          duration: '4 months',
          image: 'https://via.placeholder.com/300x200?text=NEET+Biology'
        },
        {
          title: 'NEET Physics',
          description: 'NEET Physics course designed for medical entrance examination.',
          category: 'NEET',
          price: 1599,
          duration: '4 months',
          image: 'https://via.placeholder.com/300x200?text=NEET+Physics'
        },
        {
          title: 'NEET Chemistry',
          description: 'NEET Chemistry course covering all required topics for medical entrance.',
          category: 'NEET',
          price: 1499,
          duration: '4 months',
          image: 'https://via.placeholder.com/300x200?text=NEET+Chemistry'
        }
      ];

      await Course.insertMany(sampleCourses);
      console.log('✅ Created 6 sample courses');
    } else {
      console.log(`📚 Found ${existingCourses} existing courses`);
    }
  } catch (error) {
    console.error('❌ Error creating sample courses:', error.message);
  }
};

// Main execution
console.log('🎯 Eduvado Test Subscription Generator');
console.log('=====================================\n');

// Check if we should create sample courses
const args = process.argv.slice(2);
const createCourses = args.includes('--create-courses');

if (createCourses) {
  createSampleCourses().then(() => {
    createTestSubscriptions();
  });
} else {
  createTestSubscriptions();
}
