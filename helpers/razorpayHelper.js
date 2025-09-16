import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay with validation
let razorpay = null;

// Function to initialize Razorpay
const initializeRazorpay = () => {
  if (razorpay) return razorpay; // Already initialized
  
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn('Razorpay credentials not found in environment variables - running in test mode');
      return null;
    } else {
      razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      console.log('✅ Razorpay initialized successfully');
      return razorpay;
    }
  } catch (error) {
    console.warn('Failed to initialize Razorpay:', error.message);
    return null;
  }
};

// Initialize on module load
initializeRazorpay();

// Create Razorpay order
export const createOrder = async (amount, currency = 'INR', receipt = null) => {
  try {
    console.log('=== RAZORPAY ORDER CREATION DEBUG ===');
    console.log('Amount:', amount);
    console.log('Currency:', currency);
    console.log('Receipt:', receipt);
    
    const razorpayInstance = initializeRazorpay();
    if (!razorpayInstance) {
      console.error('Razorpay initialization failed - check credentials');
      return {
        success: false,
        error: 'Razorpay not initialized - check credentials'
      };
    }
    
    console.log('Razorpay instance initialized successfully');

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: currency,
      receipt: (receipt || `receipt_${Date.now()}`).substring(0, 40), // Razorpay receipt max 40 chars
    };

    const order = await razorpayInstance.orders.create(options);
    console.log('Razorpay order created successfully:', order.id);
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
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return {
        success: false,
        error: 'Razorpay key secret not configured'
      };
    }

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
    const razorpayInstance = initializeRazorpay();
    if (!razorpayInstance) {
      return {
        success: false,
        error: 'Razorpay not initialized - check credentials'
      };
    }

    const payment = await razorpayInstance.payments.fetch(paymentId);
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

// Check if subscription is expired (for cronjob)
export const isSubscriptionExpired = (subscription) => {
  const now = new Date();
  
  if (subscription.status === 'trial') {
    return now > new Date(subscription.trialEndDate);
  }
  
  return subscription.status === 'active' && now > new Date(subscription.endDate);
};

// Get subscription status for cronjob
export const getSubscriptionStatus = (subscription) => {
  const now = new Date();
  
  if (subscription.status === 'trial') {
    const trialEndDate = new Date(subscription.trialEndDate);
    if (now > trialEndDate) {
      return 'expired';
    }
    return 'trial';
  }
  
  if (subscription.status === 'active') {
    const endDate = new Date(subscription.endDate);
    if (now > endDate) {
      return 'expired';
    }
    return 'active';
  }
  
  return subscription.status;
};

// Validate payment amount
export const validatePaymentAmount = (amount, planType) => {
  const expectedAmounts = {
    monthly: 99,
    quarterly: 499,
    yearly: 899
  };
  
  return expectedAmounts[planType] === amount;
};

// Format amount for display
export const formatAmount = (amount) => {
  return `₹${amount}`;
};

// Get plan duration in days
export const getPlanDurationInDays = (planType) => {
  const durations = {
    monthly: 30,
    quarterly: 90,
    yearly: 360
  };
  
  return durations[planType] || 30;
};
