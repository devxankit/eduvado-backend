import fetch from 'node-fetch';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import OTP from './models/OTP.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eduvado');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

async function createAndVerifyUser() {
  try {
    await connectDB();
    
    console.log('🚀 Creating and verifying test user...\n');

    const testEmail = 'test@example.com';
    const testPassword = 'password123';

    // Step 1: Register user
    console.log('1. Registering user...');
    const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: testEmail,
        password: testPassword
      })
    });

    if (!registerResponse.ok) {
      const errorData = await registerResponse.json();
      if (errorData.message && errorData.message.includes('already exists')) {
        console.log('✅ User already exists, proceeding to verification...');
      } else {
        console.log('❌ Registration failed:', errorData);
        return null;
      }
    } else {
      console.log('✅ User registered successfully');
    }

    // Step 2: Get OTP from database
    console.log('2. Getting OTP from database...');
    const otpRecord = await OTP.findOne({ 
      email: testEmail, 
      purpose: 'verification' 
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      console.log('❌ No OTP found in database');
      return null;
    }

    console.log('✅ OTP found:', otpRecord.otp);

    // Step 3: Verify email
    console.log('3. Verifying email...');
    const verifyResponse = await fetch(`${BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        otp: otpRecord.otp
      })
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      console.log('❌ Email verification failed:', errorData);
      return null;
    }

    console.log('✅ Email verified successfully');

    // Step 4: Login to get token
    console.log('4. Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.log('❌ Login failed:', errorData);
      return null;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('Token:', loginData.token);

    return loginData.token;

  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the function
createAndVerifyUser();
