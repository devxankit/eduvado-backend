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
    default: true, // Set to true for admin user
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'admin' // Set to admin
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true
});

// Hash password before saving (same logic as in the project)
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
    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('MongoDB Connection Error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    process.exit(1);
  }
};

// Function to create admin user
const createAdminUser = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'ram312908@gmail.com' });
    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log('✅ Admin user already exists with email: ram312908@gmail.com');
        console.log('User details:', {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          isVerified: existingUser.isVerified
        });
      } else {
        console.log('⚠️  User exists but is not admin. Updating role to admin...');
        existingUser.role = 'admin';
        existingUser.isVerified = true;
        await existingUser.save();
        console.log('✅ User role updated to admin successfully!');
      }
    } else {
      // Create new admin user
      const adminUser = new User({
        name: 'Admin User',
        email: 'ram312908@gmail.com',
        password: 'Ankit@1399',
        role: 'admin',
        isVerified: true
      });
      
      await adminUser.save();
      console.log('✅ Admin user created successfully!');
      console.log('User details:', {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        isVerified: adminUser.isVerified
      });
    }
    
    console.log('\n🎉 Script completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.error('Full error:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  }
};

// Run the script
console.log('🚀 Starting admin user creation script...');
console.log('Email: ram312908@gmail.com');
console.log('Password: Ankit@1399');
console.log('Role: admin');
console.log('----------------------------------------\n');

createAdminUser();
