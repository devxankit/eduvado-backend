import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

async function createTestUser() {
  try {
    console.log('🚀 Creating test user...\n');

    // Register a test user
    const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      })
    });

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('✅ Test user created successfully:', registerData);
    } else {
      const errorData = await registerResponse.json();
      if (errorData.message && errorData.message.includes('already exists')) {
        console.log('✅ Test user already exists');
      } else {
        console.log('❌ Failed to create test user:', errorData);
        return;
      }
    }

    // Login to get token
    console.log('\n🔐 Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful');
      console.log('Token:', loginData.token);
      return loginData.token;
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ Login failed:', errorData);
      return null;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Run the function
createTestUser();
