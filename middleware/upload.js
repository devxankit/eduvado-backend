import multer from 'multer';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit (reduced for better performance)
  },
  fileFilter: fileFilter
});

// Middleware for single profile picture upload
export const uploadProfilePicture = upload.single('profilePicture');

export default upload;
