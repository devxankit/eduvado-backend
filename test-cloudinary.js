import dotenv from 'dotenv';
import cloudinary from 'cloudinary';

dotenv.config();

async function testCloudinary() {
  try {
    console.log('🚀 Testing Cloudinary Configuration...\n');

    // Check environment variables
    console.log('1. Checking environment variables...');
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    console.log('   Cloud Name:', cloudName ? 'Set' : 'Missing');
    console.log('   API Key:', apiKey ? 'Set' : 'Missing');
    console.log('   API Secret:', apiSecret ? 'Set' : 'Missing');

    if (!cloudName || !apiKey || !apiSecret) {
      console.log('❌ Missing Cloudinary credentials in .env file');
      console.log('   Please add the following to your .env file:');
      console.log('   CLOUDINARY_CLOUD_NAME=your_cloud_name');
      console.log('   CLOUDINARY_API_KEY=your_api_key');
      console.log('   CLOUDINARY_API_SECRET=your_api_secret');
      return;
    }

    // Configure Cloudinary
    console.log('\n2. Configuring Cloudinary...');
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    // Test Cloudinary connection
    console.log('\n3. Testing Cloudinary connection...');
    try {
      const result = await cloudinary.api.ping();
      console.log('✅ Cloudinary connection successful');
      console.log('   Status:', result.status);
    } catch (error) {
      console.log('❌ Cloudinary connection failed:', error.message);
      return;
    }

    // Test upload a simple image
    console.log('\n4. Testing image upload...');
    try {
      // Create a simple 1x1 pixel PNG
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // IHDR data
        0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
        0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // IDAT data
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
      ]);

      const uploadResult = await cloudinary.uploader.upload(
        `data:image/png;base64,${testImageBuffer.toString('base64')}`,
        {
          folder: 'eduvado/test',
          public_id: `test_${Date.now()}`,
          resource_type: 'image'
        }
      );

      console.log('✅ Image upload successful');
      console.log('   Public ID:', uploadResult.public_id);
      console.log('   URL:', uploadResult.secure_url);

      // Test deletion
      console.log('\n5. Testing image deletion...');
      const deleteResult = await cloudinary.uploader.destroy(uploadResult.public_id);
      console.log('✅ Image deletion successful');
      console.log('   Result:', deleteResult.result);

    } catch (error) {
      console.log('❌ Image upload failed:', error.message);
      if (error.http_code) {
        console.log('   HTTP Code:', error.http_code);
      }
    }

    console.log('\n🎉 Cloudinary test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testCloudinary();
