import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;

console.log('Attempting to connect with URI:', uri);

mongoose.connect(uri)
.then(() => {
  console.log('Successfully connected to MongoDB!');
  process.exit(0);
})
.catch((err) => {
  console.error('Connection error details:');
  console.error('Name:', err.name);
  console.error('Message:', err.message);
  if (err.code) console.error('Code:', err.code);
  if (err.syscall) console.error('Syscall:', err.syscall);
  if (err.hostname) console.error('Hostname:', err.hostname);
  console.error('\nFull error:', err);
  process.exit(1);
}); 