import cron from 'node-cron';
import UserSubscription from '../models/UserSubscription.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import { getSubscriptionStatus, isSubscriptionExpired } from '../helpers/razorpayHelper.js';

class SubscriptionCronService {
  constructor() {
    this.isRunning = false;
  }

  // Start the cronjob service
  start() {
    if (this.isRunning) {
      console.log('Subscription cron service is already running');
      return;
    }

    console.log('Starting subscription cron service...');
    
    // Run every hour to check for expired subscriptions
    cron.schedule('0 * * * *', async () => {
      console.log('Running subscription status check...');
      await this.updateExpiredSubscriptions();
    });

    // Run every day at midnight to clean up old data
    cron.schedule('0 0 * * *', async () => {
      console.log('Running daily cleanup...');
      await this.cleanupOldData();
    });

    this.isRunning = true;
    console.log('Subscription cron service started successfully');
  }

  // Stop the cronjob service
  stop() {
    if (!this.isRunning) {
      console.log('Subscription cron service is not running');
      return;
    }

    cron.destroy();
    this.isRunning = false;
    console.log('Subscription cron service stopped');
  }

  // Update expired subscriptions
  async updateExpiredSubscriptions() {
    try {
      console.log('=== UPDATING EXPIRED SUBSCRIPTIONS ===');
      
      // Find all subscriptions that might be expired
      const subscriptions = await UserSubscription.find({
        status: { $in: ['trial', 'active'] }
      });

      console.log(`Found ${subscriptions.length} active/trial subscriptions to check`);

      let updatedCount = 0;
      let userUpdates = [];

      for (const subscription of subscriptions) {
        const currentStatus = getSubscriptionStatus(subscription);
        
        if (currentStatus !== subscription.status) {
          console.log(`Updating subscription ${subscription._id} from ${subscription.status} to ${currentStatus}`);
          
          // Update subscription status
          subscription.status = currentStatus;
          
          // If trial expired, set payment status to pending
          if (currentStatus === 'expired' && subscription.isTrialPeriod) {
            subscription.paymentStatus = 'pending';
          }
          
          await subscription.save();
          updatedCount++;

          // Track user updates
          const userId = subscription.userId.toString();
          if (!userUpdates.includes(userId)) {
            userUpdates.push(userId);
          }
        }
      }

      // Update user subscription flags
      for (const userId of userUpdates) {
        await this.updateUserSubscriptionFlags(userId);
      }

      console.log(`Updated ${updatedCount} subscriptions and ${userUpdates.length} users`);
      
    } catch (error) {
      console.error('Error updating expired subscriptions:', error);
    }
  }

  // Update user subscription flags based on their subscriptions
  async updateUserSubscriptionFlags(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Get all user subscriptions
      const subscriptions = await UserSubscription.find({ userId });
      
      // Check if user has any active subscription
      const hasActiveSubscription = subscriptions.some(sub => 
        sub.status === 'active' || (sub.status === 'trial' && !isSubscriptionExpired(sub))
      );

      // Check if user has any trial subscription
      const hasTrialSubscription = subscriptions.some(sub => 
        sub.status === 'trial' && !isSubscriptionExpired(sub)
      );

      // Check if user has used trial
      const hasUsedTrial = subscriptions.some(sub => sub.isTrialPeriod);

      // Update user flags
      await User.findByIdAndUpdate(userId, {
        hasActiveSubscription,
        isTrialActive: hasTrialSubscription,
        hasUsedTrial
      });

      console.log(`Updated user ${userId} flags: active=${hasActiveSubscription}, trial=${hasTrialSubscription}, usedTrial=${hasUsedTrial}`);
      
    } catch (error) {
      console.error(`Error updating user ${userId} flags:`, error);
    }
  }

  // Clean up old data
  async cleanupOldData() {
    try {
      console.log('=== CLEANING UP OLD DATA ===');
      
      // Delete old expired subscriptions (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const deletedSubscriptions = await UserSubscription.deleteMany({
        status: 'expired',
        updatedAt: { $lt: thirtyDaysAgo }
      });

      // Delete old failed payments (older than 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const deletedPayments = await Payment.deleteMany({
        status: 'failed',
        createdAt: { $lt: sevenDaysAgo }
      });

      console.log(`Cleaned up ${deletedSubscriptions.deletedCount} old subscriptions and ${deletedPayments.deletedCount} failed payments`);
      
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  // Manual trigger for testing
  async triggerUpdate() {
    console.log('Manually triggering subscription update...');
    await this.updateExpiredSubscriptions();
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }
}

// Create singleton instance
const subscriptionCronService = new SubscriptionCronService();

export default subscriptionCronService;
