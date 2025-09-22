import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQwZWRjYjg5ZDU5YWY3ODZhODUzZTgiLCJpYXQiOjE3NTg1MjI4MzAsImV4cCI6MTc2MTExNDgzMH0.YPhhipCFX4Uo3OvCjwFDuj8NON3l2pR7zSo-WiYM29I';

async function testProfileUploadFinal() {
  try {
    console.log('🚀 Final Profile Upload Test...\n');

    // Create a simple test image
    console.log('1. Creating test image...');
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // IHDR data
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // IDAT data
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
    ]);

    const testImagePath = 'test-final.png';
    fs.writeFileSync(testImagePath, testImageBuffer);
    console.log('✅ Test image created');

    // Test upload using fetch with FormData
    console.log('\n2. Testing profile picture upload...');
    
    const formData = new FormData();
    formData.append('profilePicture', fs.createReadStream(testImagePath), {
      filename: 'test-final.png',
      contentType: 'image/png'
    });

    console.log('   Sending upload request...');
    const uploadResponse = await fetch(`${BASE_URL}/profile/upload-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      },
      body: formData
    });

    console.log('   Upload response status:', uploadResponse.status);
    const uploadData = await uploadResponse.json();
    
    if (uploadResponse.ok) {
      console.log('✅ Upload successful!');
      console.log('   Response:', JSON.stringify(uploadData, null, 2));
      
      // Test get profile info
      console.log('\n3. Testing get profile picture info...');
      const infoResponse = await fetch(`${BASE_URL}/profile/picture-info`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        }
      });

      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        console.log('✅ Get profile info successful');
        console.log('   Profile picture:', JSON.stringify(infoData.profilePicture, null, 2));
      }

      // Test update profile picture
      console.log('\n4. Testing profile picture update...');
      const updateFormData = new FormData();
      updateFormData.append('profilePicture', fs.createReadStream(testImagePath), {
        filename: 'test-updated.png',
        contentType: 'image/png'
      });

      const updateResponse = await fetch(`${BASE_URL}/profile/update-picture`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        },
        body: updateFormData
      });

      if (updateResponse.ok) {
        const updateData = await updateResponse.json();
        console.log('✅ Update successful');
        console.log('   Response:', JSON.stringify(updateData, null, 2));
      } else {
        const updateError = await updateResponse.json();
        console.log('❌ Update failed:', updateError);
      }

      // Test delete profile picture
      console.log('\n5. Testing profile picture deletion...');
      const deleteResponse = await fetch(`${BASE_URL}/profile/delete-picture`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        }
      });

      if (deleteResponse.ok) {
        const deleteData = await deleteResponse.json();
        console.log('✅ Delete successful');
        console.log('   Response:', JSON.stringify(deleteData, null, 2));
      } else {
        const deleteError = await deleteResponse.json();
        console.log('❌ Delete failed:', deleteError);
      }

    } else {
      console.log('❌ Upload failed');
      console.log('   Status:', uploadResponse.status);
      console.log('   Response:', JSON.stringify(uploadData, null, 2));
    }

    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('\n🧹 Cleaned up test file');
    }

    console.log('\n🎉 Final test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Run the test
testProfileUploadFinal();
