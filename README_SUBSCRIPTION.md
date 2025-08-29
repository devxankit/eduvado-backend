# Eduvado Subscription System Documentation

## Overview

The Eduvado subscription system provides a comprehensive solution for managing user subscriptions with a 3-day free trial period and Razorpay payment integration.

## Features

### 🔥 Core Features
- **3-Day Free Trial**: Users get 3 days of free access when they subscribe
- **Three Plan Types**: Monthly (30 days), Quarterly (90 days), Yearly (360 days)
- **Razorpay Integration**: Secure payment processing
- **Manual Renewal**: No auto-renewal, users must manually renew
- **Course Access Control**: Subscription required for course enrollment
- **Admin Management**: Complete admin panel for subscription management

### 📊 Admin Features
- View all user subscriptions
- Payment history and statistics
- Trial period management
- Subscription analytics
- Revenue tracking

## Database Schema

### User Model Updates
```javascript
{
  // ... existing fields
  hasActiveSubscription: Boolean,
  trialStartDate: Date,
  trialEndDate: Date,
  isTrialActive: Boolean
}
```

### UserSubscription Model
```javascript
{
  userId: ObjectId,
  planId: ObjectId,
  planType: String, // 'monthly', 'quarterly', 'yearly'
  startDate: Date,
  endDate: Date,
  status: String, // 'trial', 'active', 'expired', 'cancelled'
  amount: Number,
  paymentStatus: String, // 'pending', 'completed', 'failed'
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  isTrialPeriod: Boolean,
  trialStartDate: Date,
  trialEndDate: Date
}
```

### Payment Model
```javascript
{
  userId: ObjectId,
  subscriptionId: ObjectId,
  planId: ObjectId,
  planType: String,
  amount: Number,
  currency: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  status: String, // 'created', 'authorized', 'captured', 'failed', 'refunded'
  method: String,
  bank: String,
  wallet: String,
  vpa: String
}
```

## API Endpoints

### User Subscription Routes

#### GET `/api/subscriptions/plans`
Get available subscription plans
```json
{
  "success": true,
  "plans": [
    {
      "_id": "...",
      "planType": "monthly",
      "description": "...",
      "price": 299,
      "isActive": true
    }
  ]
}
```

#### GET `/api/subscriptions/my-subscription`
Get user's current subscription status
```json
{
  "success": true,
  "hasSubscription": true,
  "subscription": {
    "id": "...",
    "status": "trial",
    "planType": "monthly",
    "isActive": true,
    "remainingDays": 2,
    "trialEndDate": "2024-01-15T10:00:00.000Z"
  }
}
```

#### POST `/api/subscriptions/create`
Create a new subscription (starts trial period)
```json
{
  "planType": "monthly"
}
```

#### POST `/api/subscriptions/create-order`
Create Razorpay payment order
```json
{
  "subscriptionId": "..."
}
```

#### POST `/api/subscriptions/verify-payment`
Verify payment and activate subscription
```json
{
  "subscriptionId": "...",
  "razorpayOrderId": "...",
  "razorpayPaymentId": "...",
  "razorpaySignature": "..."
}
```

#### POST `/api/subscriptions/cancel`
Cancel subscription
```json
{
  "subscriptionId": "..."
}
```

#### GET `/api/subscriptions/payments`
Get user's payment history

### Admin Routes

#### GET `/api/admin/user-subscriptions`
Get all user subscriptions

#### GET `/api/admin/user-subscriptions/:userId`
Get specific user's subscription details

#### GET `/api/admin/payments`
Get all payment records

#### GET `/api/admin/payment-stats`
Get payment statistics and revenue data

#### GET `/api/admin/subscription-analytics`
Get subscription analytics

#### PUT `/api/admin/manage-trial/:userId`
Manage user's trial period
```json
{
  "action": "extend", // or "end"
  "days": 3
}
```

## Business Logic Flow

### 1. User Subscription Process
1. User registers → No subscription required initially
2. User tries to enroll in course → Redirected to subscription page
3. User selects plan → Trial subscription created (3 days free)
4. After 3 days → Access blocked, payment required
5. User pays → Subscription activated for full period

### 2. Trial Period Logic
- **Duration**: 3 days from subscription creation
- **Access**: Full course access during trial
- **Payment**: Required after trial expires
- **Extension**: Admin can extend trial period

### 3. Subscription Periods
- **Monthly**: 30 days after trial
- **Quarterly**: 90 days after trial
- **Yearly**: 360 days after trial

### 4. Payment Flow
1. Create Razorpay order
2. User completes payment
3. Verify payment signature
4. Activate subscription
5. Update payment records

## Environment Variables

Add these to your `.env` file:
```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Subscription Plans
```bash
npm run create-plans
```

### 3. Set up Razorpay
1. Create Razorpay account
2. Get API keys from dashboard
3. Add keys to environment variables

### 4. Run Subscription Status Updates
Set up a cron job to run:
```bash
npm run update-subscriptions
```

## Middleware

### Subscription Middleware
- `checkSubscriptionAccess`: Verify user has active subscription
- `checkEnrollmentAccess`: Verify user can enroll in courses
- `getSubscriptionStatus`: Get subscription status for info

## Course Access Control

### Public Access
- View course listings
- View course details

### Subscription Required
- Enroll in courses
- Access course content
- Download materials

## Error Handling

### Common Error Responses
```json
{
  "success": false,
  "message": "No active subscription found. Please subscribe to access courses.",
  "requiresSubscription": true
}
```

```json
{
  "success": false,
  "message": "Your subscription has expired. Please renew to continue accessing courses.",
  "subscriptionExpired": true
}
```

## Security Features

- Payment signature verification
- JWT token authentication
- Admin role verification
- Subscription status validation

## Monitoring and Maintenance

### Automated Tasks
- Daily subscription status updates
- Expiration notifications
- Payment verification

### Admin Monitoring
- Subscription analytics
- Payment statistics
- User trial management

## Troubleshooting

### Common Issues
1. **Payment Verification Failed**: Check Razorpay credentials
2. **Subscription Not Active**: Run status update script
3. **Trial Not Working**: Verify trial period calculation

### Debug Commands
```bash
# Check subscription statuses
npm run update-subscriptions

# View logs
tail -f logs/subscription.log
```

## Support

For technical support or questions about the subscription system, please refer to the API documentation or contact the development team.
