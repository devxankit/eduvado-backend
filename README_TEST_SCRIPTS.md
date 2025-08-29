# Eduvado Test Scripts Documentation

## Overview

This document explains how to use the test scripts to generate sample data for testing the Eduvado subscription system.

## Available Scripts

### 1. Create Test Users
**Command:** `npm run create-test-users`

Creates 10 test users with verified accounts for testing subscriptions.

**Test Users Created:**
- John Doe (john.doe@test.com)
- Jane Smith (jane.smith@test.com)
- Mike Johnson (mike.johnson@test.com)
- Sarah Wilson (sarah.wilson@test.com)
- David Brown (david.brown@test.com)
- Emily Davis (emily.davis@test.com)
- Robert Miller (robert.miller@test.com)
- Lisa Garcia (lisa.garcia@test.com)
- James Rodriguez (james.rodriguez@test.com)
- Maria Martinez (maria.martinez@test.com)

**Credentials:**
- Email: [user-email]
- Password: `Test@123`

### 2. Create Test Subscriptions
**Command:** `npm run create-test-subscriptions`

Creates test subscriptions for existing users with various scenarios:
- Trial subscriptions (3 days)
- Active subscriptions (recent)
- Expired subscriptions
- Different payment statuses (completed, pending, failed)

### 3. Create Complete Test Data
**Command:** `npm run create-test-data`

Creates sample courses AND test subscriptions in one command.

### 4. Create Subscription Plans
**Command:** `npm run create-plans`

Creates the three default subscription plans:
- Monthly: ₹299
- Quarterly: ₹799
- Yearly: ₹2499

### 5. Update Subscription Statuses
**Command:** `npm run update-subscriptions`

Updates subscription statuses and sends expiration notifications.

## Complete Setup Process

### Step 1: Create Subscription Plans
```bash
npm run create-plans
```

### Step 2: Create Test Users (if needed)
```bash
npm run create-test-users
```

### Step 3: Create Test Subscriptions
```bash
npm run create-test-subscriptions
```

### Alternative: Create Everything at Once
```bash
npm run create-test-data
```

## Test Scenarios Created

### Subscription Types
1. **Trial Subscriptions (5 users)**
   - Status: `trial`
   - Duration: 3 days
   - Payment Status: `pending`

2. **Active Subscriptions (3 users)**
   - Status: `active`
   - Started 1 day ago
   - Payment Status: `completed`

3. **Expired Subscriptions (2 users)**
   - Status: `expired`
   - Started 10 days ago
   - Payment Status: `pending`

### Payment Statuses
- **Completed Payments:** 2 subscriptions
- **Failed Payments:** 1 subscription
- **Pending Payments:** 1 subscription

### Plan Distribution
- Random distribution across Monthly, Quarterly, and Yearly plans
- Realistic pricing and durations

## Sample Courses Created

If using `--create-courses` flag, the following courses are created:

### JEE Courses
- **JEE Main Physics** - ₹1999 (6 months)
- **JEE Main Chemistry** - ₹1799 (5 months)
- **JEE Main Mathematics** - ₹1899 (6 months)

### NEET Courses
- **NEET Biology** - ₹1699 (4 months)
- **NEET Physics** - ₹1599 (4 months)
- **NEET Chemistry** - ₹1499 (4 months)

## Admin Dashboard Testing

After running the scripts, you can test the admin dashboard:

### 1. Login as Admin
- Email: `ram312908@gmail.com`
- Password: `Ankit@1399`

### 2. View Subscriptions
Navigate to the Subscriptions section to see:
- All user subscriptions
- Trial period management
- Payment statistics
- Subscription analytics

### 3. Test Features
- View subscription details
- Manage trial periods
- Check payment history
- Monitor subscription statuses

## Database Schema Verification

The scripts verify and create data according to these schemas:

### User Model
```javascript
{
  name: String,
  email: String,
  password: String,
  isVerified: Boolean,
  role: String,
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
  planType: String,
  startDate: Date,
  endDate: Date,
  status: String,
  amount: Number,
  paymentStatus: String,
  trialStartDate: Date,
  trialEndDate: Date,
  isTrialPeriod: Boolean
}
```

## Error Handling

The scripts include comprehensive error handling:

- **Database Connection:** Proper MongoDB connection with error logging
- **Duplicate Prevention:** Skips existing users/subscriptions
- **Validation:** Ensures all required fields are present
- **Graceful Exit:** Proper cleanup and connection closing

## Troubleshooting

### Common Issues

1. **No subscription plans found**
   ```bash
   npm run create-plans
   ```

2. **No users found**
   ```bash
   npm run create-test-users
   ```

3. **Database connection error**
   - Check `.env` file for `MONGODB_URI`
   - Ensure MongoDB is running

4. **Script fails to run**
   - Ensure all dependencies are installed: `npm install`
   - Check Node.js version compatibility

### Debug Commands

```bash
# Check subscription statuses
npm run update-subscriptions

# View database statistics
npm run create-test-subscriptions
```

## Security Notes

- Test users have simple passwords for testing only
- All test data is clearly marked
- Scripts can be safely run multiple times
- No production data is affected

## Next Steps

After running the test scripts:

1. **Test Admin Dashboard:** Login and verify subscription data
2. **Test User Flow:** Login as test users and check subscription status
3. **Test Payment Flow:** Use test Razorpay credentials
4. **Monitor Analytics:** Check subscription and payment statistics

## Support

For issues with test scripts:
1. Check the console output for error messages
2. Verify database connection
3. Ensure all prerequisites are met
4. Check the main subscription documentation
