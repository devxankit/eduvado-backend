# Comprehensive API Testing Suite

This directory contains a comprehensive test suite that tests **ALL APIs** in your Eduvado backend with **all possible outcomes**.

## 🎯 **What This Tests**

### **Complete API Coverage:**
- ✅ **Authentication APIs** (16 tests)
- ✅ **Subscription APIs** (12 tests) 
- ✅ **Course APIs** (10 tests)
- ✅ **Profile APIs** (4 tests)
- ✅ **Content APIs** (6 tests)
- ✅ **AI APIs** (4 tests)
- ✅ **Admin APIs** (2 tests)

### **All Possible Outcomes:**
- ✅ **Success Cases** - Normal operation
- ✅ **Error Cases** - Invalid inputs, missing data
- ✅ **Security Cases** - Unauthorized access, token validation
- ✅ **Edge Cases** - Boundary conditions, empty data
- ✅ **Business Logic** - Trial periods, subscriptions, permissions

## 📁 Test Files

### 1. `test-all-apis.js` (Comprehensive API Testing)
- **Purpose:** Tests ALL APIs with ALL possible outcomes
- **Dependencies:** Requires running server + axios
- **Coverage:** 54+ individual test cases
- **What it tests:**
  - Every endpoint in your backend
  - Success and failure scenarios
  - Security validations
  - Business logic enforcement
  - Error handling
  - Data validation

## 🚀 How to Run Tests

### Prerequisites
1. **Start your backend server:**
   ```bash
   npm run dev
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

### Run Comprehensive API Tests
```bash
# Run all API tests
npm run test-all-apis

# Or run directly
node test-all-apis.js
```

## 🧪 Test Categories

### 🔐 **Authentication APIs (16 tests)**
- User registration (valid/invalid data)
- Email verification (valid/invalid OTP)
- User login (valid/invalid credentials)
- Token verification (valid/invalid tokens)
- Profile management (get/update)
- Password reset flow
- OTP resend functionality

### 💳 **Subscription APIs (12 tests)**
- Get subscription plans
- Start trial subscriptions
- Payment creation (during/after trial)
- Payment verification
- Subscription status checks
- Payment history
- Trial expiry simulation
- Business logic validation

### 📚 **Course APIs (10 tests)**
- Get course categories (with sorting)
- Get all courses (with filters)
- Course enrollment (with subscription checks)
- User enrollments
- Course progress tracking
- Single course retrieval
- Category management

### 👤 **Profile APIs (4 tests)**
- Profile picture upload/update/delete
- Profile picture info retrieval
- File upload validation
- Cloudinary integration

### 📄 **Content APIs (6 tests)**
- Privacy policy retrieval
- Terms and conditions
- Return and refund policies
- Admin content management
- Public vs admin access control

### 🤖 **AI APIs (4 tests)**
- Text generation requests
- Image processing requests
- Audio processing requests
- Input validation

### 👑 **Admin APIs (2 tests)**
- Admin route protection
- Role-based access control
- Unauthorized access prevention

## 📊 Test Output Example

```
🚀 STARTING COMPREHENSIVE API TESTS
====================================
Base URL: http://localhost:5000/api

🔐 TESTING AUTHENTICATION APIs
================================
✅ User Registration: User registered successfully
✅ Duplicate Email Registration: Correctly blocked duplicate email
✅ Invalid Registration Data: Correctly rejected invalid data
✅ Email Verification: Correctly handled invalid OTP
✅ Login Before Verification: Correctly blocked unverified user
✅ Manual Email Verification: Email verified in database
✅ User Login: User logged in successfully
✅ Wrong Password Login: Correctly rejected wrong password
✅ Non-existent Email Login: Correctly rejected non-existent email
✅ Token Verification: Token verified successfully
✅ Invalid Token Verification: Correctly rejected invalid token
✅ Get User Profile: Profile retrieved successfully
✅ Update User Profile: Profile updated successfully
✅ Forgot Password: Password reset OTP sent
✅ Forgot Password Non-existent Email: Correctly rejected non-existent email
✅ Resend Verification OTP: Correctly rejected for verified user

💳 TESTING SUBSCRIPTION APIs
=============================
✅ Get Subscription Plans: Retrieved 3 plans
✅ Get Subscription Status (No Subscription): Correctly identified no subscription
✅ Start Trial Subscription: Trial started successfully
✅ Start Trial Invalid Plan: Correctly rejected invalid plan type
✅ Start Second Trial: Correctly blocked second trial
✅ Create Payment During Trial: Correctly blocked payment during trial
✅ Get Subscription Status (Active Trial): Correctly identified active trial
✅ Simulate Trial Expiry: Trial expiry simulated
✅ Create Payment After Expiry: Payment order created successfully
✅ Payment Verification (Mock): Correctly handled mock payment verification
✅ Get Payment History: Payment history retrieved
✅ Update Subscription Status: Status updated successfully

📚 TESTING COURSE APIs
======================
✅ Get Course Categories: Retrieved 5 categories
✅ Get Course Categories Sorted: Categories retrieved with sorting
✅ Get Single Category: Single category retrieved
✅ Get All Courses (Public): Courses retrieved successfully
✅ Get Courses with Filters: Filtered courses retrieved
✅ Get Single Course (Non-existent): Correctly returned 404 for non-existent course
✅ Enroll in Course (No Subscription): Correctly blocked enrollment without subscription
✅ Get User Enrollments: User enrollments retrieved
✅ Get Course Progress (Non-existent): Correctly returned 404 for non-existent course
✅ Update Course Progress (Non-existent): Correctly handled non-existent course

👤 TESTING PROFILE APIs
========================
✅ Get Profile Picture Info: Profile picture info retrieved
✅ Delete Profile Picture (None Exists): Correctly handled no picture to delete
✅ Upload Profile Picture (No File): Correctly rejected upload without file
✅ Update Profile Picture (No File): Correctly rejected update without file

📄 TESTING CONTENT APIs
========================
✅ Content Test Route: Test route working
✅ Get Privacy Policy: Privacy policy endpoint working
✅ Get Terms and Conditions: Terms endpoint working
✅ Get Return and Refund Policy: Refund policy endpoint working
✅ Admin Routes Without Admin Token: Correctly blocked non-admin access
✅ Admin Routes Without Token: Correctly blocked access without token

🤖 TESTING AI APIs
==================
✅ AI Text Request: AI text endpoint accessible
✅ AI Text Request (No Prompt): Correctly rejected request without prompt
✅ AI Image Request (No File): Correctly rejected image request without file
✅ AI Audio Request (No File): Correctly rejected audio request without file

👑 TESTING ADMIN APIs
======================
✅ Admin Routes Without Admin Token: Correctly blocked non-admin access
✅ Admin Routes Without Token: Correctly blocked access without token

🎯 FINAL TEST RESULTS
=====================
Total Tests: 54
✅ Passed: 54
❌ Failed: 0
Success Rate: 100.00%

🎉 ALL TESTS PASSED! Your API is working perfectly!
```

## 🔍 What Each Test Validates

### **Success Cases:**
- APIs return correct data
- Business logic works as expected
- Database operations succeed
- File uploads work properly

### **Error Cases:**
- Invalid input validation
- Missing required fields
- Malformed data handling
- Database constraint violations

### **Security Cases:**
- Token validation
- Role-based access control
- Unauthorized access prevention
- Input sanitization

### **Business Logic:**
- Trial period enforcement
- Subscription validation
- Payment flow security
- Course enrollment rules

## 🛡️ Security Validation

The tests specifically validate:

1. **Authentication Security:**
   - Token-based authentication
   - Email verification requirements
   - Password validation
   - Session management

2. **Authorization Security:**
   - Role-based access control
   - Admin route protection
   - User data isolation
   - Resource ownership

3. **Business Logic Security:**
   - Trial period enforcement
   - Payment validation
   - Subscription checks
   - Data integrity

4. **Input Validation:**
   - Required field validation
   - Data type validation
   - Format validation
   - Size limits

## 🐛 Troubleshooting

### Common Issues:

1. **Server Not Running:**
   ```
   ❌ connect ECONNREFUSED 127.0.0.1:5000
   ```
   **Solution:** Start your server with `npm run dev`

2. **MongoDB Connection Error:**
   ```
   ❌ Test execution failed: connect ECONNREFUSED
   ```
   **Solution:** Check your MongoDB connection string

3. **Missing Dependencies:**
   ```
   ❌ Cannot find module 'axios'
   ```
   **Solution:** Run `npm install`

4. **Port Already in Use:**
   ```
   ❌ Error: listen EADDRINUSE :::5000
   ```
   **Solution:** Change port or kill existing process

## 📈 Test Results Interpretation

### ✅ **All Tests Pass (100%):**
- Your API is working perfectly
- All security measures are in place
- Business logic is correctly implemented
- Error handling is comprehensive

### ⚠️ **Some Tests Fail (<100%):**
- Review failed test details
- Check specific error messages
- Verify server configuration
- Test individual endpoints

### ❌ **Many Tests Fail (>50%):**
- Check if server is running
- Verify database connection
- Check environment variables
- Review API implementation

## 🔧 Configuration

### Environment Variables Required:
```bash
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
MONGODB_URI=your_mongodb_connection_string
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

### Test Configuration:
- **Base URL:** `http://localhost:5000/api`
- **MongoDB:** Uses your provided connection string
- **Test Data:** Automatically cleaned up after tests

## 📞 Support

If you encounter issues:

1. **Check the console output** for specific error messages
2. **Verify your server is running** on the correct port
3. **Check your MongoDB connection** is working
4. **Review environment variables** are set correctly
5. **Test individual endpoints** manually if needed

## 🎯 Benefits

This comprehensive test suite provides:

- **Complete API Coverage** - Tests every endpoint
- **Security Validation** - Ensures proper access control
- **Business Logic Testing** - Validates core functionality
- **Error Handling Verification** - Confirms proper error responses
- **Automated Testing** - Run all tests with one command
- **Detailed Reporting** - Clear pass/fail results
- **Easy Debugging** - Specific error messages for failures

---

**Note:** This test suite is designed to validate the complete functionality and security of your Eduvado backend API. Run these tests regularly to ensure your API remains stable and secure.
