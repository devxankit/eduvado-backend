import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

const BASE_URL = 'http://localhost:5000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQwZWRjYjg5ZDU5YWY3ODZhODUzZTgiLCJpYXQiOjE3NTg1MjI4MzAsImV4cCI6MTc2MTExNDgzMH0.YPhhipCFX4Uo3OvCjwFDuj8NON3l2pR7zSo-WiYM29I';

// Create a simple test image
function createTestImage() {
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // IHDR data
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // IDAT data
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
  ]);
}

async function testWithCurl() {
  try {
    console.log('🚀 Testing Profile Upload API with curl...\n');

    // Create test image
    const testImageBuffer = createTestImage();
    const testImagePath = 'test-curl.png';
    fs.writeFileSync(testImagePath, testImageBuffer);
    console.log('✅ Test image created');

    // Test 1: Configuration check
    console.log('\n1. Testing configuration endpoint...');
    try {
      const { stdout: configOutput } = await execAsync(`curl -s -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/profile/test-config"`);
      console.log('✅ Configuration endpoint working');
      console.log('   Response:', configOutput);
    } catch (error) {
      console.log('❌ Configuration endpoint failed:', error.message);
    }

    // Test 2: Get profile info
    console.log('\n2. Testing get profile info...');
    try {
      const { stdout: infoOutput } = await execAsync(`curl -s -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/profile/picture-info"`);
      console.log('✅ Get profile info working');
      console.log('   Response:', infoOutput);
    } catch (error) {
      console.log('❌ Get profile info failed:', error.message);
    }

    // Test 3: Upload profile picture
    console.log('\n3. Testing profile picture upload...');
    try {
      const { stdout: uploadOutput } = await execAsync(`curl -s -X POST -H "Authorization: Bearer ${TOKEN}" -F "profilePicture=@${testImagePath}" "${BASE_URL}/profile/upload-picture"`);
      console.log('✅ Upload successful!');
      console.log('   Response:', uploadOutput);
    } catch (error) {
      console.log('❌ Upload failed:', error.message);
    }

    // Test 4: Verify upload
    console.log('\n4. Verifying upload...');
    try {
      const { stdout: verifyOutput } = await execAsync(`curl -s -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/profile/picture-info"`);
      console.log('✅ Upload verification successful');
      console.log('   Response:', verifyOutput);
    } catch (error) {
      console.log('❌ Upload verification failed:', error.message);
    }

    // Test 5: Update profile picture
    console.log('\n5. Testing profile picture update...');
    try {
      const { stdout: updateOutput } = await execAsync(`curl -s -X PUT -H "Authorization: Bearer ${TOKEN}" -F "profilePicture=@${testImagePath}" "${BASE_URL}/profile/update-picture"`);
      console.log('✅ Update successful!');
      console.log('   Response:', updateOutput);
    } catch (error) {
      console.log('❌ Update failed:', error.message);
    }

    // Test 6: Delete profile picture
    console.log('\n6. Testing profile picture deletion...');
    try {
      const { stdout: deleteOutput } = await execAsync(`curl -s -X DELETE -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/profile/delete-picture"`);
      console.log('✅ Delete successful!');
      console.log('   Response:', deleteOutput);
    } catch (error) {
      console.log('❌ Delete failed:', error.message);
    }

    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('\n🧹 Cleaned up test file');
    }

    console.log('\n🎉 curl-based test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testWithCurl();
