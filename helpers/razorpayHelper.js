import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
export const createOrder = async (amount, currency = 'INR', receipt = null) => {
  try {
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    return {
      success: true,
      order: order
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Verify payment signature
export const verifyPayment = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  try {
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpaySignature;
    
    return {
      success: true,
      isAuthentic: isAuthentic
    };
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get payment details from Razorpay
export const getPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return {
      success: true,
      payment: payment
    };
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Calculate subscription end date based on plan type
export const calculateSubscriptionEndDate = (planType, startDate = new Date()) => {
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

// Calculate trial end date (3 days from start)
export const calculateTrialEndDate = (startDate = new Date()) => {
  const start = new Date(startDate);
  return new Date(start.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days
};

// Check if subscription is active (including trial)
export const isSubscriptionActive = (subscription) => {
  const now = new Date();
  
  console.log('=== isSubscriptionActive DEBUG ===');
  console.log('Current time:', now.toISOString());
  console.log('Subscription status:', subscription.status);
  console.log('Trial end date (raw):', subscription.trialEndDate);
  console.log('End date (raw):', subscription.endDate);
  
  if (subscription.status === 'trial') {
    // Ensure trialEndDate is a Date object for proper comparison
    const trialEndDate = new Date(subscription.trialEndDate);
    console.log('Trial end date (parsed):', trialEndDate.toISOString());
    console.log('Now <= trialEndDate:', now <= trialEndDate);
    console.log('Time difference (ms):', trialEndDate - now);
    return now <= trialEndDate;
  }
  
  // Ensure endDate is a Date object for proper comparison
  const endDate = new Date(subscription.endDate);
  console.log('End date (parsed):', endDate.toISOString());
  console.log('Now <= endDate:', now <= endDate);
  console.log('Time difference (ms):', endDate - now);
  return subscription.status === 'active' && now <= endDate;
};

// Get remaining days for subscription
export const getRemainingDays = (subscription) => {
  const now = new Date();
  
  if (subscription.status === 'trial') {
    // Ensure trialEndDate is a Date object for proper comparison
    const trialEndDate = new Date(subscription.trialEndDate);
    const remaining = trialEndDate - now;
    return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
  }
  
  // Ensure endDate is a Date object for proper comparison
  const endDate = new Date(subscription.endDate);
  const remaining = endDate - now;
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
};
