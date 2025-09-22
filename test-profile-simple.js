import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQwZWRjYjg5ZDU5YWY3ODZhODUzZTgiLCJpYXQiOjE3NTg1MjI4MzAsImV4cCI6MTc2MTExNDgzMH0.YPhhipCFX4Uo3OvCjwFDuj8NON3l2pR7zSo-WiYM29I';

async function testProfileUpload() {
  try {
    console.log('🚀 Testing Profile Upload API...\n');

    // Step 1: Test configuration
    console.log('1. Testing configuration...');
    const configResponse = await fetch(`${BASE_URL}/profile/test-config`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('✅ Configuration:', JSON.stringify(configData, null, 2));
    } else {
      console.log('❌ Configuration check failed');
      return;
    }

    // Step 2: Create a simple test image (1x1 pixel PNG)
    console.log('\n2. Creating test image...');
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // IHDR data
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // IDAT data
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
    ]);

    const testImagePath = 'test-image.png';
    fs.writeFileSync(testImagePath, testImageBuffer);
    console.log('✅ Test image created');

    // Step 3: Test profile picture upload
    console.log('\n3. Testing profile picture upload...');
    const formData = new FormData();
    formData.append('profilePicture', fs.createReadStream(testImagePath), {
      filename: 'test-image.png',
      contentType: 'image/png'
    });

    const uploadResponse = await fetch(`${BASE_URL}/profile/upload-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      },
      body: formData
    });

    const uploadData = await uploadResponse.json();
    
    if (uploadResponse.ok) {
      console.log('✅ Upload successful:', JSON.stringify(uploadData, null, 2));
    } else {
      console.log('❌ Upload failed:', JSON.stringify(uploadData, null, 2));
    }

    // Step 4: Get profile picture info
    console.log('\n4. Getting profile picture info...');
    const infoResponse = await fetch(`${BASE_URL}/profile/picture-info`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    if (infoResponse.ok) {
      const infoData = await infoResponse.json();
      console.log('✅ Profile picture info:', JSON.stringify(infoData, null, 2));
    } else {
      console.log('❌ Failed to get profile picture info');
    }

    // Step 5: Test update profile picture
    console.log('\n5. Testing profile picture update...');
    const updateFormData = new FormData();
    updateFormData.append('profilePicture', fs.createReadStream(testImagePath), {
      filename: 'test-image-updated.png',
      contentType: 'image/png'
    });

    const updateResponse = await fetch(`${BASE_URL}/profile/update-picture`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      },
      body: updateFormData
    });

    const updateData = await updateResponse.json();
    
    if (updateResponse.ok) {
      console.log('✅ Update successful:', JSON.stringify(updateData, null, 2));
    } else {
      console.log('❌ Update failed:', JSON.stringify(updateData, null, 2));
    }

    // Step 6: Test delete profile picture
    console.log('\n6. Testing profile picture deletion...');
    const deleteResponse = await fetch(`${BASE_URL}/profile/delete-picture`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    const deleteData = await deleteResponse.json();
    
    if (deleteResponse.ok) {
      console.log('✅ Delete successful:', JSON.stringify(deleteData, null, 2));
    } else {
      console.log('❌ Delete failed:', JSON.stringify(deleteData, null, 2));
    }

    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('\n🧹 Cleaned up test file');
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testProfileUpload();
