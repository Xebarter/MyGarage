# Mechanics Functionality

This document describes the new mechanics functionality added to the MyGarage system.

## Overview

The mechanics functionality enhances the repair shop management capabilities by allowing repair shop owners to:
- Manage individual mechanics working in their shop
- Define working hours for each mechanic
- Assign mechanics to specific appointments
- Track mechanic specializations and certifications

## Database Schema

### New Tables

#### mechanics
Stores information about individual mechanics working in repair shops.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| repair_shop_id | UUID | Foreign key to repair_shops table |
| first_name | TEXT | Mechanic's first name |
| last_name | TEXT | Mechanic's last name |
| email | TEXT | Mechanic's email (unique) |
| phone | TEXT | Mechanic's phone number |
| bio | TEXT | Mechanic's biography |
| certifications | TEXT[] | Array of mechanic certifications |
| specializations | TEXT[] | Array of mechanic specializations |
| years_of_experience | INTEGER | Years of experience |
| hourly_rate | NUMERIC | Hourly rate for services |
| profile_image_url | TEXT | Mechanic's profile image URL |
| is_active | BOOLEAN | Whether mechanic is currently working |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### mechanic_working_hours
Stores working hours for each mechanic by day of the week.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| mechanic_id | UUID | Foreign key to mechanics table |
| day_of_week | INTEGER | Day of week (0-6, Sunday-Saturday) |
| start_time | TIME | Start time of shift |
| end_time | TIME | End time of shift |
| is_available | BOOLEAN | Whether mechanic is available on this day |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### mechanic_appointments
Links mechanics to appointments and tracks work status.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| mechanic_id | UUID | Foreign key to mechanics table |
| appointment_id | UUID | Foreign key to appointments table |
| service_id | UUID | Foreign key to services table |
| status | TEXT | Status of mechanic's work (scheduled, in_progress, completed, cancelled) |
| notes | TEXT | Notes from mechanic |
| start_time | TIMESTAMPTZ | Actual start time of work |
| end_time | TIMESTAMPTZ | Actual end time of work |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Updated Tables

#### appointments
Added a new column to track assigned mechanic:

| Column | Type | Description |
|--------|------|-------------|
| assigned_mechanic_id | UUID | Foreign key to mechanics table (nullable) |

## Features

### 1. Mechanic Management
- Repair shop owners can add, edit, and remove mechanics
- Detailed mechanic profiles with certifications and specializations
- Profile images for mechanics

### 2. Working Hours Management
- Configure working hours for each mechanic by day of the week
- Mark specific days as unavailable
- Set daily start and end times

### 3. Mechanic Assignment
- Assign specific mechanics to appointments
- View currently assigned mechanic for each appointment
- Track mechanic workload

### 4. Availability Checking
- Determine mechanic availability for specific dates
- Identify available mechanics for a given time slot

## API Functions

### Mechanics
- `getMechanicsByRepairShop(repairShopId)` - Fetch all mechanics for a repair shop
- `getMechanicById(mechanicId)` - Fetch a single mechanic by ID
- `createMechanic(mechanic)` - Create a new mechanic
- `updateMechanic(mechanicId, updates)` - Update a mechanic
- `deleteMechanic(mechanicId)` - Delete a mechanic

### Working Hours
- `getMechanicWorkingHours(mechanicId)` - Fetch working hours for a mechanic
- `upsertMechanicWorkingHours(workingHours)` - Update or create working hours

### Appointments
- `getMechanicAppointments(mechanicId)` - Fetch appointments assigned to a mechanic
- `assignMechanicToAppointment(appointmentId, mechanicId)` - Assign a mechanic to an appointment
- `createMechanicAppointment(mechanicAppointment)` - Create a mechanic appointment record
- `updateMechanicAppointment(mechanicAppointmentId, updates)` - Update a mechanic appointment record

### Availability
- `getAvailableMechanics(repairShopId, date)` - Get available mechanics for a given date

## Components

### MechanicManagement
A comprehensive component for managing mechanics within the repair shop dashboard:
- Add/edit/delete mechanics
- Configure working hours
- View mechanic details

### MechanicAssignment
A component for assigning mechanics to appointments:
- Select from available mechanics
- View currently assigned mechanic

## Views and Functions

### mechanic_profiles
A view that combines mechanic information with their associated repair shop details.

### get_mechanic_availability(mechanic_id, check_date)
A function that checks if a mechanic is available on a specific date.

### get_available_mechanics_for_shop(shop_id, check_date)
A function that returns all available mechanics for a repair shop on a specific date.