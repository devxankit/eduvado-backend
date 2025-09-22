import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

const BASE_URL = 'http://localhost:5000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQwZWRjYjg5ZDU5YWY3ODZhODUzZTgiLCJpYXQiOjE3NTg1MjI4MzAsImV4cCI6MTc2MTExNDgzMH0.YPhhipCFX4Uo3OvCjwFDuj8NON3l2pR7zSo-WiYM29I';

async function testSimpleUpload() {
  try {
    console.log('🚀 Simple Upload Test with Server Logs...\n');

    // Create a very small test image
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // IHDR data
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // IDAT data
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
    ]);

    const testImagePath = 'simple-test.png';
    fs.writeFileSync(testImagePath, testImageBuffer);
    console.log('✅ Test image created');

    console.log('\n📤 Testing upload with timeout...');
    console.log('   This will show server logs in the server terminal');
    console.log('   Watch the server terminal for detailed logs...\n');

    // Test upload with a timeout
    try {
      const { stdout, stderr } = await execAsync(`curl -m 10 -X POST -H "Authorization: Bearer ${TOKEN}" -F "profilePicture=@${testImagePath}" "${BASE_URL}/profile/upload-picture"`);
      console.log('✅ Upload completed!');
      console.log('   Response:', stdout);
      if (stderr) {
        console.log('   Stderr:', stderr);
      }
    } catch (error) {
      if (error.code === 'TIMEOUT' || error.signal === 'SIGTERM') {
        console.log('⏰ Upload timed out after 10 seconds');
        console.log('   This indicates the server is hanging on the upload process');
      } else {
        console.log('❌ Upload failed:', error.message);
      }
    }

    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('\n🧹 Cleaned up test file');
    }

    console.log('\n💡 Check the server terminal for detailed logs showing where the upload process hangs.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testSimpleUpload();
