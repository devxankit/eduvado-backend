# Middleware Patterns and User ID Extraction

## Overview
This document outlines the consistent patterns for user ID extraction across different middleware types in the Eduvado backend.

## Middleware Types

### 1. `protect` Middleware (authMiddleware.js)
- **Purpose**: Authenticates user and loads full User document from database
- **Sets**: `req.user` = User document (MongoDB document)
- **User ID Access**: `req.user._id` (MongoDB ObjectId)
- **Used by**: Course routes, Content routes, Admin routes

### 2. `verifyToken` Middleware (auth.js)
- **Purpose**: Verifies JWT token and extracts payload
- **Sets**: `req.user` = JWT payload (decoded token)
- **User ID Access**: `req.user.userId` (string from JWT)
- **Used by**: Auth routes, Subscription routes

## Consistent Patterns

### Routes using `protect` middleware:
```javascript
// ✅ CORRECT
const userId = req.user._id;

// ❌ WRONG
const userId = req.user.userId; // This will be undefined
```

### Routes using `verifyToken` middleware:
```javascript
// ✅ CORRECT
const userId = req.user.userId;

// ❌ WRONG
const userId = req.user._id; // This will be undefined
```

## File-by-File Breakdown

### ✅ Correctly Implemented:
- **courseRoutes.js**: Uses `protect` → `req.user._id`
- **contentRoutes.js**: Uses `protect` → `req.user._id`
- **adminRoutes.js**: Uses `protect` → No direct user ID usage
- **authRoutes.js**: Uses `verifyToken` → `req.user.userId`
- **subscriptionRoutes.js**: Uses `verifyToken` → `req.user.userId`

### ✅ Fixed:
- **subscriptionMiddleware.js**: Uses `protect` → `req.user._id || req.user.userId` (fallback for compatibility)

## Database Field Mapping

### User Model:
- **Field**: `_id` (MongoDB ObjectId)
- **Access via protect**: `req.user._id`
- **Access via verifyToken**: `req.user.userId` (from JWT payload)

### UserSubscription Model:
- **Field**: `userId` (ObjectId reference to User)
- **Query**: `UserSubscription.findOne({ userId: userId })`

## Best Practices

1. **Always check which middleware is being used** before accessing user ID
2. **Use the correct field** based on middleware type
3. **Add fallback patterns** in shared middleware for compatibility
4. **Document middleware usage** in route files
5. **Test both middleware patterns** when making changes

## Testing

To test user ID extraction:
1. **For protect middleware**: Check that `req.user._id` exists and is an ObjectId
2. **For verifyToken middleware**: Check that `req.user.userId` exists and is a string
3. **For shared middleware**: Test both patterns with fallback logic

## Common Issues

1. **Using wrong field**: `req.user.userId` with protect middleware
2. **Using wrong field**: `req.user._id` with verifyToken middleware
3. **Not handling both patterns**: In shared middleware functions
4. **Inconsistent patterns**: Across similar route files

## Migration Notes

When updating middleware patterns:
1. Identify which middleware each route uses
2. Update user ID extraction accordingly
3. Test all affected endpoints
4. Update documentation
5. Consider backward compatibility
