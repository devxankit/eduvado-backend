# Subscription Management Setup

This document explains how to set up and use the subscription management system for Eduvado.

## Overview

The subscription management system consists of two main components:

### 1. Subscription Plans (Admin Managed)
- **Monthly**: ₹299/month
- **Quarterly**: ₹799/quarter  
- **Yearly**: ₹2499/year

### 2. User Subscriptions (User Data)
- Stores actual user subscription data
- Tracks subscription status, dates, and payment info
- Links users to subscription plans

## Setup Instructions

### 1. Create Default Subscription Plans

Run the following command to create the three default subscription plans:

```bash
npm run create-plans
```

This will create three subscription plans with default descriptions and prices.

### 2. API Endpoints

The following endpoints are available for subscription management:

#### GET `/api/admin/subscriptions`
- **Description**: Get all subscription plans
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`

#### POST `/api/admin/subscriptions`
- **Description**: Create a new subscription plan
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "planType": "monthly|quarterly|yearly",
    "description": "Plan description",
    "price": 299
  }
  ```

#### PUT `/api/admin/subscriptions/:id`
- **Description**: Update an existing subscription plan
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Same as POST

#### DELETE `/api/admin/subscriptions/:id`
- **Description**: Delete a subscription plan
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`

### 3. Database Schemas

#### Subscription Plans (Admin Managed)
```javascript
{
  planType: String,        // "monthly", "quarterly", "yearly"
  description: String,     // Plan description
  price: Number,          // Price in rupees
  isActive: Boolean,      // Plan status
  createdAt: Date,        // Creation timestamp
  updatedAt: Date         // Last update timestamp
}
```

#### User Subscriptions (User Data)
```javascript
{
  userId: ObjectId,       // Reference to User
  planId: ObjectId,       // Reference to SubscriptionPlan
  planType: String,       // "monthly", "quarterly", "yearly"
  startDate: Date,        // Subscription start date
  endDate: Date,          // Subscription end date
  status: String,         // "active", "expired", "cancelled"
  amount: Number,         // Amount paid
  paymentStatus: String,  // "pending", "completed", "failed"
  autoRenew: Boolean,     // Auto-renewal setting
  createdAt: Date,        // Creation timestamp
  updatedAt: Date         // Last update timestamp
}
```

### 4. Validation Rules

- `planType` must be one of: "monthly", "quarterly", "yearly"
- `planType` must be unique across all subscriptions
- `description` and `price` are required
- `price` must be a positive number

### 5. Admin Panel Usage

1. Navigate to the Subscriptions section in the admin panel
2. Use the form to add new subscription plans
3. Edit existing plans by clicking the "Edit" button
4. Delete plans using the "Delete" button
5. All changes are immediately reflected in the system

### 6. User Subscription Management

- User subscriptions are stored separately from subscription plans
- Each user subscription references a subscription plan
- Track subscription status, payment, and renewal dates
- Support for auto-renewal and subscription management

## Notes

- Only three subscription plans can exist at a time (one for each type)
- Plan types cannot be duplicated
- Deleting a plan will remove it completely from the system
- The system automatically validates plan type uniqueness

## Troubleshooting

If you encounter issues:

1. Check that MongoDB is running
2. Verify admin authentication token is valid
3. Ensure plan type values are exactly: "monthly", "quarterly", "yearly"
4. Check server logs for detailed error messages
