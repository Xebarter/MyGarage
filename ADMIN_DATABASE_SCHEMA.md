# Admin Database Schema for MyGarage

## Overview

This document explains the database schema designed for the admin functionality of MyGarage. It addresses common Row Level Security (RLS) issues and ownership problems that can occur when developing admin dashboards.

## Key Features

1. **Proper Ownership Tracking**: All tables now have `created_by` and `updated_by` fields to track who made changes.
2. **Admin Role Management**: Dedicated tables for managing admin users and their permissions.
3. **Audit Trail**: Comprehensive logging of admin actions for accountability.
4. **Reporting Views**: Simplified views for common admin reporting needs.
5. **Secure Access Control**: Proper RLS policies ensuring admins can perform their duties without ownership conflicts.

## Database Schema Structure

### Core Tables

#### `admins`
Stores information about admin users.

- `id` (uuid): Primary key, references `auth.users(id)`
- `email` (text): Unique email address
- `full_name` (text): Admin's full name
- `role` (text): Either 'admin' or 'super_admin'
- `created_at` (timestamp): Record creation timestamp
- `updated_at` (timestamp): Record last update timestamp

#### `admin_permissions`
Manages granular permissions for admin users.

- `id` (uuid): Primary key
- `admin_id` (uuid): Foreign key to `admins`
- `permission` (text): Specific permission identifier
- `granted_at` (timestamp): When permission was granted

#### `admin_audit_log`
Tracks all admin actions for auditing purposes.

- `id` (uuid): Primary key
- `admin_id` (uuid): Foreign key to `admins`
- `action` (text): Type of action (INSERT, UPDATE, DELETE, SELECT)
- `table_name` (text): Name of affected table
- `record_id` (uuid): ID of affected record
- `old_values` (jsonb): Values before modification
- `new_values` (jsonb): Values after modification
- `ip_address` (inet): IP address of request
- `user_agent` (text): Browser/user agent information
- `created_at` (timestamp): When action occurred

### Enhanced Existing Tables

All existing tables (`parts`, `categories`, `orders`, `repair_shops`, `appointments`) have been enhanced with:

- `created_by` (uuid): References the user who created the record
- `updated_by` (uuid): References the user who last updated the record

These fields are automatically populated using database triggers.

### Reporting Views

To simplify admin reporting, three views have been created:

#### `admin_sales_report`
Aggregated view of order information with item counts and processing admin.

#### `admin_inventory_report`
Detailed view of parts inventory with calculated stock status indicators.

#### `admin_appointment_report`
Comprehensive view of appointments with management information.

## Row Level Security (RLS) Implementation

The schema implements a robust RLS system that prevents the common "You must be the owner of the table in order to edit a column" errors by:

1. **Explicit Permissions**: Rather than relying on table ownership, permissions are explicitly granted through the `admins` table.

2. **Role-Based Access**: Different policies for regular admins vs super admins.

3. **Automatic Ownership Tracking**: Triggers automatically assign ownership to the current user.

4. **Flexible Policies**: Policies are designed to allow admins to work with all records, not just their own.

## How to Apply This Schema

1. Run the migration files in numerical order:
   ```
   20251029113000_create_admin_schema.sql
   20251029113500_create_admin_audit_log.sql
   20251029114000_enhance_tables_with_admin_access.sql
   20251029114500_create_admin_reporting_view.sql
   ```

2. Register your first super admin:
   ```sql
   INSERT INTO admins (id, email, full_name, role)
   VALUES ('[USER_AUTH_ID]', '[EMAIL]', '[FULL_NAME]', 'super_admin');
   ```

3. Ensure your application passes the authenticated user's ID to the database via Supabase's auth system.

## Troubleshooting Common Issues

### "You must be the owner of the table" Errors

This occurs when:
1. RLS policies are too restrictive
2. The user doesn't have proper admin permissions
3. Functions/triggers aren't properly setting ownership

Solution:
- Verify the user exists in the `admins` table
- Check that RLS policies are correctly defined
- Confirm triggers are populating ownership fields

### Permission Denied Errors

Ensure:
1. The user has an entry in the `admins` table
2. The user's role grants appropriate permissions
3. RLS policies are correctly configured for the operation

## Best Practices

1. **Always Use Authenticated Connections**: Make sure all admin operations happen through authenticated Supabase connections.

2. **Regular Audit Log Reviews**: Periodically review the `admin_audit_log` for suspicious activity.

3. **Principle of Least Privilege**: Assign only necessary permissions through the `admin_permissions` table.

4. **Data Integrity**: Leverage the automatic ownership tracking to maintain data integrity and accountability.

This schema provides a solid foundation for admin functionality while avoiding common pitfalls with RLS and ownership in PostgreSQL/Supabase environments.