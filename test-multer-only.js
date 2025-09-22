import multer from 'multer';
import express from 'express';
import fs from 'fs';

// Create a simple multer configuration for testing
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `test-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter processing:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    if (file.mimetype.startsWith('image/')) {
      console.log('File type accepted:', file.mimetype);
      cb(null, true);
    } else {
      console.log('File type rejected:', file.mimetype);
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Create test server
const app = express();
const PORT = 5001;

// Create uploads directory
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

app.use(express.json());

// Test endpoint
app.post('/test-upload', upload.single('profilePicture'), (req, res) => {
  console.log('Upload received:', req.file);
  res.json({
    success: true,
    message: 'Upload successful',
    file: req.file
  });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Test with: curl -X POST -F "profilePicture=@test.png" http://localhost:5001/test-upload');
});
