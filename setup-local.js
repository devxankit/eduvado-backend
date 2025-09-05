#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Setting up Eduvado Backend for Local Development...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
} else {
  console.log('📝 Creating .env file...');
  
  const envContent = `# Database Configuration
MONGODB_URI=mongodb://localhost:27017/eduvado

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=eduvado-super-secret-jwt-key-${Date.now()}
JWT_EXPIRE=7d

# Admin Configuration
ADMIN_EMAIL=admin@eduvado.com
ADMIN_PASSWORD=admin123

# CORS Configuration
ADMIN_URL=http://localhost:3000

# Optional: Email Configuration (for production)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password

# Optional: Razorpay Configuration (for production)
# RAZORPAY_KEY_ID=your-razorpay-key-id
# RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Optional: Gemini AI Configuration (for production)
# GEMINI_API_KEY=your-gemini-api-key
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully');
}

console.log('\n📋 Next Steps:');
console.log('1. Make sure MongoDB is running locally or update MONGODB_URI in .env');
console.log('2. Run: npm install');
console.log('3. Run: npm run dev');
console.log('4. The backend will be available at http://localhost:5000');
console.log('\n🎉 Setup complete!');
