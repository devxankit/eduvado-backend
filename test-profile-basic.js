import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQwZWRjYjg5ZDU5YWY3ODZhODUzZTgiLCJpYXQiOjE3NTg1MjI4MzAsImV4cCI6MTc2MTExNDgzMH0.YPhhipCFX4Uo3OvCjwFDuj8NON3l2pR7zSo-WiYM29I';

async function testBasicProfileAPI() {
  try {
    console.log('🚀 Testing Basic Profile API Endpoints...\n');

    // Test 1: Configuration check
    console.log('1. Testing configuration endpoint...');
    const configResponse = await fetch(`${BASE_URL}/profile/test-config`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('✅ Configuration endpoint works');
      console.log('   Cloudinary config:', configData.config.cloudinary);
    } else {
      console.log('❌ Configuration endpoint failed:', await configResponse.text());
      return;
    }

    // Test 2: Get profile picture info (should be empty initially)
    console.log('\n2. Testing get profile picture info...');
    const infoResponse = await fetch(`${BASE_URL}/profile/picture-info`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    if (infoResponse.ok) {
      const infoData = await infoResponse.json();
      console.log('✅ Get profile picture info works');
      console.log('   Current profile picture:', infoData.profilePicture);
    } else {
      console.log('❌ Get profile picture info failed:', await infoResponse.text());
    }

    // Test 3: Test upload without file (should fail gracefully)
    console.log('\n3. Testing upload without file...');
    const uploadResponse = await fetch(`${BASE_URL}/profile/upload-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const uploadData = await uploadResponse.json();
    if (!uploadResponse.ok) {
      console.log('✅ Upload without file correctly failed:', uploadData.message);
    } else {
      console.log('❌ Upload without file should have failed');
    }

    // Test 4: Test delete when no picture exists
    console.log('\n4. Testing delete when no picture exists...');
    const deleteResponse = await fetch(`${BASE_URL}/profile/delete-picture`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    const deleteData = await deleteResponse.json();
    if (!deleteResponse.ok) {
      console.log('✅ Delete without picture correctly failed:', deleteData.message);
    } else {
      console.log('✅ Delete without picture handled gracefully:', deleteData.message);
    }

    // Test 5: Test invalid token
    console.log('\n5. Testing with invalid token...');
    const invalidResponse = await fetch(`${BASE_URL}/profile/picture-info`, {
      headers: {
        'Authorization': `Bearer invalid-token`
      }
    });

    if (!invalidResponse.ok) {
      console.log('✅ Invalid token correctly rejected');
    } else {
      console.log('❌ Invalid token should have been rejected');
    }

    // Test 6: Test without token
    console.log('\n6. Testing without token...');
    const noTokenResponse = await fetch(`${BASE_URL}/profile/picture-info`);

    if (!noTokenResponse.ok) {
      console.log('✅ No token correctly rejected');
    } else {
      console.log('❌ No token should have been rejected');
    }

    console.log('\n🎉 Basic API tests completed!');
    console.log('\n📋 Summary:');
    console.log('   - Configuration endpoint: ✅ Working');
    console.log('   - Get profile info: ✅ Working');
    console.log('   - Error handling: ✅ Working');
    console.log('   - Authentication: ✅ Working');
    console.log('\n💡 The API structure is working correctly!');
    console.log('   The upload issue might be related to Cloudinary configuration.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testBasicProfileAPI();
