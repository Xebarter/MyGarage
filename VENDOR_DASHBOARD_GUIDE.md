# MyGarage Vendor Dashboard Guide

## Overview

The MyGarage Vendor Dashboard provides a comprehensive platform for vendors to manage their products, track orders, and monitor analytics. Vendors can access the portal at `/vendor-login` using simple login credentials.

## Features

### 1. Vendor Login Portal (`/vendor-login`)
- Simple vendor selection interface
- No authentication required (demo mode)
- Select your vendor account to access the dashboard
- Available vendors:
  - **FilterPro Inc** (Vendor ID: 1)
  - **BrakeMaster Corp** (Vendor ID: 2)

### 2. Dashboard Home (`/vendor`)
The main dashboard provides an overview of your business metrics:

#### Key Performance Indicators (KPIs)
- **Total Revenue**: Total earnings from all your products
- **Total Orders**: Number of orders containing your products
- **Total Products**: Count of active product listings
- **Average Order Value**: Average revenue per order

#### Analytics & Charts
- **Revenue Trend**: Line chart showing revenue over time
- **Order Status Distribution**: Pie chart showing order breakdown by status
  - Pending, Processing, Shipped, Delivered, Cancelled
- **Top Products**: List of your best-performing products with sales counts

### 3. Product Management (`/vendor/products`)
Upload and manage your product inventory:

#### Features
- **Add Products**: Click "Add Product" to upload new items
- **Edit Products**: Modify existing product details
- **Delete Products**: Remove products from your catalog
- **Product Information**:
  - Product name and description
  - Price and cost
  - Category and brand
  - Stock levels
  - SKU (Stock Keeping Unit)
  - Product image URL

#### Product Upload
Products uploaded via the vendor dashboard are automatically associated with your vendor ID and appear in:
- Your "My Products" page
- The main storefront (if in stock)
- Admin dashboard (with vendor attribution)

### 4. Order Management (`/vendor/orders`)
Track orders containing your products:

#### Order Information
- Order ID and creation date
- Order status (Pending, Processing, Shipped, Delivered, Cancelled)
- Customer information (name, email, address)
- Items ordered from your inventory
- Your portion of the order total (excluding items from other vendors)

#### Features
- Filter orders by date range
- View detailed order information
- Track shipment status
- Monitor customer satisfaction

### 5. Vendor Profile (`/vendor/profile`)
Manage your vendor account information:

#### Profile Fields
- Vendor name
- Contact email
- Phone number
- Business address
- Vendor rating (read-only)
- Total products count (read-only)
- Member since date (read-only)

#### Edit Profile
- Click "Edit Profile" to update your information
- Save changes to sync with the system
- Cancel to discard changes

## Accessing the Vendor Dashboard

### Step 1: Login
1. Navigate to `https://your-domain/vendor-login`
2. Select your vendor account from the list
3. You'll be logged in and redirected to your dashboard

### Step 2: Navigation
Use the sidebar to navigate between sections:
- **Dashboard**: View KPIs and analytics
- **My Products**: Manage your inventory
- **Orders**: Track customer orders
- **Profile**: Update vendor information
- **Logout**: Exit the vendor portal

## Best Practices

### Product Management
1. **Keep Inventory Updated**: Update stock levels regularly to avoid overselling
2. **Accurate Descriptions**: Provide clear, detailed product descriptions
3. **Competitive Pricing**: Monitor competitor pricing to stay competitive
4. **SKU Organization**: Use consistent SKU formatting for tracking

### Order Fulfillment
1. **Monitor Orders**: Check your orders daily for new purchases
2. **Update Status**: Manually update order statuses as items ship
3. **Customer Communication**: Respond to customer inquiries promptly
4. **Track Metrics**: Monitor your order statistics to identify trends

### Analytics
1. **Track Performance**: Review your revenue and sales trends
2. **Identify Top Products**: Focus on products that are selling well
3. **Monitor Status Distribution**: Understand your fulfillment pipeline

## Technical Details

### API Endpoints
The vendor dashboard uses the following API endpoints:

```
GET  /api/vendor/products?vendorId={id}     - List your products
POST /api/vendor/products                    - Create new product
GET  /api/vendor/orders?vendorId={id}       - List your orders
GET  /api/vendor/analytics?vendorId={id}    - Get analytics data
GET  /api/vendors/{id}                       - Get vendor profile
PUT  /api/vendors/{id}                       - Update vendor profile
```

### Data Storage
All vendor data is stored in the application database. Product information includes:
- Product details (name, description, price, etc.)
- Vendor association (vendorId)
- Stock information
- Creation timestamp
- Image reference

Orders are tracked with vendor attribution, allowing each vendor to see only:
- Their own products
- Sales revenue from their products
- Customer information for their orders

## Troubleshooting

### Cannot Login
- Verify you're using the correct vendor account
- Clear browser cache and cookies
- Try using a different browser

### Products Not Appearing
- Check that products have been created successfully
- Verify stock levels are greater than 0
- Ensure product information is complete

### Orders Not Showing
- Orders appear only after customers purchase your products
- Wait for orders to sync to your account
- Check that you're viewing the correct vendor account

### Analytics Not Loading
- Refresh the page to reload analytics data
- Check your internet connection
- Try clearing browser cache

## Support

For technical support or questions about the vendor dashboard:
1. Check this guide for common issues
2. Review the product information requirements
3. Contact the MyGarage support team

## Future Enhancements

The vendor dashboard is designed to scale with your business:
- Advanced inventory management
- Bulk product uploads
- Marketing and promotion tools
- Detailed financial reporting
- Automated order processing
- Multi-channel integration
