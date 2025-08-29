import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// User Schema (same as in the project)
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // Subscription related fields
  hasActiveSubscription: {
    type: Boolean,
    default: false
  },
  trialStartDate: {
    type: Date,
    default: null
  },
  trialEndDate: {
    type: Date,
    default: null
  },
  isTrialActive: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

// Database connection function
const connectDB = async () => {
  try {
    console.log('🔌 Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    process.exit(1);
  }
};

// Function to create test users
const createTestUsers = async () => {
  try {
    console.log('🚀 Starting test user creation script...\n');

    // Connect to database
    await connectDB();

    // Sample test users
    const testUsers = [
      {
        name: 'John Doe',
        email: 'john.doe@test.com',
        password: 'Test@123'
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@test.com',
        password: 'Test@123'
      },
      {
        name: 'Mike Johnson',
        email: 'mike.johnson@test.com',
        password: 'Test@123'
      },
      {
        name: 'Sarah Wilson',
        email: 'sarah.wilson@test.com',
        password: 'Test@123'
      },
      {
        name: 'David Brown',
        email: 'david.brown@test.com',
        password: 'Test@123'
      },
      {
        name: 'Emily Davis',
        email: 'emily.davis@test.com',
        password: 'Test@123'
      },
      {
        name: 'Robert Miller',
        email: 'robert.miller@test.com',
        password: 'Test@123'
      },
      {
        name: 'Lisa Garcia',
        email: 'lisa.garcia@test.com',
        password: 'Test@123'
      },
      {
        name: 'James Rodriguez',
        email: 'james.rodriguez@test.com',
        password: 'Test@123'
      },
      {
        name: 'Maria Martinez',
        email: 'maria.martinez@test.com',
        password: 'Test@123'
      }
    ];

    let createdCount = 0;
    let skippedCount = 0;

    console.log('👥 Creating test users...\n');

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        
        if (existingUser) {
          console.log(`   ⚠️  User ${userData.email} already exists, skipping...`);
          skippedCount++;
          continue;
        }

        // Create new user
        const user = new User({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          isVerified: true,
          role: 'user'
        });

        await user.save();
        console.log(`   ✅ Created user: ${userData.name} (${userData.email})`);
        createdCount++;

      } catch (error) {
        console.error(`   ❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    // Get total user count
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });

    console.log('\n📊 User Creation Summary:');
    console.log(`   Users Created: ${createdCount}`);
    console.log(`   Users Skipped: ${skippedCount}`);
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Verified Users: ${verifiedUsers}`);
    console.log(`   Admin Users: ${adminUsers}`);

    console.log('\n🔑 Test User Credentials:');
    console.log('   Email: [user-email]');
    console.log('   Password: Test@123');
    console.log('\n   Example:');
    console.log('   Email: john.doe@test.com');
    console.log('   Password: Test@123');

    console.log('\n✅ Test users are ready for subscription testing!');
    console.log('   You can now run "npm run create-test-subscriptions" to create subscriptions for these users.');

  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
    console.error('Full error:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
    process.exit(0);
  }
};

// Main execution
console.log('🎯 Eduvado Test User Generator');
console.log('==============================\n');

createTestUsers();
