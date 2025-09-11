# Cloudinary Setup for Profile Pictures

## Environment Variables Required

Add these environment variables to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## How to Get Cloudinary Credentials

1. Go to [Cloudinary.com](https://cloudinary.com) and create a free account
2. After logging in, go to your Dashboard
3. You'll find your credentials in the "Product Environment Credentials" section:
   - Cloud Name
   - API Key
   - API Secret

## API Endpoints

### Upload Profile Picture
- **POST** `/api/profile/upload-picture`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `multipart/form-data` with field name `profilePicture`
- **Response**: 
```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "profilePicture": {
    "publicId": "eduvado/profile-pictures/profile_userId_timestamp",
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/eduvado/profile-pictures/profile_userId_timestamp.jpg"
  }
}
```

### Update Profile Picture
- **PUT** `/api/profile/update-picture`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `multipart/form-data` with field name `profilePicture`
- **Response**: Same as upload

### Delete Profile Picture
- **DELETE** `/api/profile/delete-picture`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "success": true,
  "message": "Profile picture deleted successfully"
}
```

### Get Profile Picture Info
- **GET** `/api/profile/picture-info`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "success": true,
  "profilePicture": {
    "publicId": "eduvado/profile-pictures/profile_userId_timestamp",
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/eduvado/profile-pictures/profile_userId_timestamp.jpg"
  }
}
```

## File Upload Specifications

- **Maximum file size**: 5MB
- **Allowed formats**: JPG, JPEG, PNG, GIF, WEBP
- **Automatic transformations**: 
  - Resized to 500x500 pixels
  - Cropped to fill with face detection
  - Quality optimized automatically

## Error Handling

The API returns appropriate error messages for:
- File too large (>5MB)
- Invalid file format
- No file uploaded
- User not found
- Authentication errors
- Cloudinary upload errors

## Installation

Make sure to install the required dependencies:

```bash
npm install cloudinary multer-storage-cloudinary
```

The dependencies are already added to `package.json`.
