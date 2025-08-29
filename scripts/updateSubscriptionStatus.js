import mongoose from 'mongoose';
import UserSubscription from '../models/UserSubscription.js';
import User from '../models/User.js';
import { isSubscriptionActive } from '../helpers/razorpayHelper.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

// Function to update subscription statuses
const updateSubscriptionStatuses = async () => {
  try {
    console.log('🔄 Starting subscription status update...');
    
    // Find all active subscriptions
    const activeSubscriptions = await UserSubscription.find({
      status: { $in: ['trial', 'active'] }
    });

    let updatedCount = 0;
    const now = new Date();

    for (const subscription of activeSubscriptions) {
      const isActive = isSubscriptionActive(subscription);
      
      if (!isActive) {
        // Update subscription status to expired
        subscription.status = 'expired';
        await subscription.save();
        
        // Update user subscription status
        await User.findByIdAndUpdate(subscription.userId, {
          hasActiveSubscription: false,
          isTrialActive: false
        });
        
        updatedCount++;
        console.log(`📅 Expired subscription for user: ${subscription.userId}`);
      }
    }

    console.log(`✅ Updated ${updatedCount} expired subscriptions`);
    
    // Get statistics
    const totalSubscriptions = await UserSubscription.countDocuments();
    const activeSubscriptionsCount = await UserSubscription.countDocuments({
      status: { $in: ['trial', 'active'] }
    });
    const expiredSubscriptionsCount = await UserSubscription.countDocuments({
      status: 'expired'
    });

    console.log('\n📊 Subscription Statistics:');
    console.log(`   Total Subscriptions: ${totalSubscriptions}`);
    console.log(`   Active Subscriptions: ${activeSubscriptionsCount}`);
    console.log(`   Expired Subscriptions: ${expiredSubscriptionsCount}`);

  } catch (error) {
    console.error('❌ Error updating subscription statuses:', error);
  }
};

// Function to send expiration notifications (placeholder)
const sendExpirationNotifications = async () => {
  try {
    console.log('📧 Checking for subscriptions expiring soon...');
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const expiringSubscriptions = await UserSubscription.find({
      status: { $in: ['trial', 'active'] },
      $or: [
        { trialEndDate: { $lte: threeDaysFromNow } },
        { endDate: { $lte: threeDaysFromNow } }
      ]
    }).populate('userId', 'name email');

    console.log(`📧 Found ${expiringSubscriptions.length} subscriptions expiring soon`);
    
    // Here you would implement email notification logic
    // For now, just log the information
    expiringSubscriptions.forEach(sub => {
      console.log(`   - User: ${sub.userId.email}, Expires: ${sub.trialEndDate || sub.endDate}`);
    });

  } catch (error) {
    console.error('❌ Error sending expiration notifications:', error);
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    
    // Update subscription statuses
    await updateSubscriptionStatuses();
    
    // Send expiration notifications
    await sendExpirationNotifications();
    
    console.log('\n🎉 Subscription status update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in main function:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
main();
