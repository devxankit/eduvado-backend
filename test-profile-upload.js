import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

// Test image path (you can replace this with any image file)
const TEST_IMAGE_PATH = path.join(process.cwd(), 'test-image.jpg');

async function testProfileUpload() {
  try {
    console.log('🚀 Starting Profile Upload Test...\n');

    // Step 1: Login to get token
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', await loginResponse.text());
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful\n');

    // Step 2: Test configuration
    console.log('2. Testing configuration...');
    const configResponse = await fetch(`${BASE_URL}/profile/test-config`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('✅ Configuration check:', JSON.stringify(configData, null, 2));
    } else {
      console.log('⚠️ Configuration check failed:', await configResponse.text());
    }
    console.log('');

    // Step 3: Check if test image exists
    console.log('3. Checking test image...');
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.log('⚠️ Test image not found. Creating a simple test file...');
      // Create a simple test file (this won't be a real image, but will test the upload flow)
      fs.writeFileSync(TEST_IMAGE_PATH, 'This is a test file for upload testing');
    }
    console.log('✅ Test file ready\n');

    // Step 4: Test profile picture upload
    console.log('4. Testing profile picture upload...');
    const formData = new FormData();
    formData.append('profilePicture', fs.createReadStream(TEST_IMAGE_PATH));

    const uploadResponse = await fetch(`${BASE_URL}/profile/upload-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const uploadData = await uploadResponse.json();
    
    if (uploadResponse.ok) {
      console.log('✅ Upload successful:', JSON.stringify(uploadData, null, 2));
    } else {
      console.log('❌ Upload failed:', JSON.stringify(uploadData, null, 2));
    }
    console.log('');

    // Step 5: Get profile picture info
    console.log('5. Getting profile picture info...');
    const infoResponse = await fetch(`${BASE_URL}/profile/picture-info`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (infoResponse.ok) {
      const infoData = await infoResponse.json();
      console.log('✅ Profile picture info:', JSON.stringify(infoData, null, 2));
    } else {
      console.log('❌ Failed to get profile picture info:', await infoResponse.text());
    }

    // Cleanup
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      fs.unlinkSync(TEST_IMAGE_PATH);
      console.log('\n🧹 Cleaned up test file');
    }

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testProfileUpload();
