# Repair Shop Dashboard

The Repair Shop Dashboard provides mechanics with a comprehensive management system for handling job requests, appointments, and services.

## Features

### Job Request Management
- Real-time service requests with notification system
- Accept or decline incoming job requests
- Track job status from pending to completed
- Send appointment reminders to customers

### Appointment Management
- View and manage all customer appointments
- Filter appointments by status (pending, scheduled, in progress, completed, cancelled, declined)
- Start work on scheduled appointments
- Complete jobs when finished
- Send appointment reminders

### Availability Status
- Toggle availability between "Available", "Busy", and "Offline"
- Status is reflected on the map for customer matching
- Real-time dispatching based on availability

### Service Management
- Create, edit, and delete services offered
- Categorize services (Engine Repair, Electrical Work, Diagnostics, etc.)
- Set pricing and estimated duration for each service
- Mark services as featured for highlighting

### Customer Management
- View customer details and appointment history
- Track customer visits and total appointments
- Search and filter customer database

## Usage

### Setting Availability
1. Use the availability toggle in the header to switch between "Available", "Busy", and "Offline" statuses
2. When "Available", your shop will appear on the map for customer matching
3. When "Busy", customers can see you're occupied but still book appointments
4. When "Offline", you won't appear in customer searches

### Managing Job Requests
1. Navigate to the "Job Requests" tab to see pending requests
2. Accept requests to schedule appointments
3. Decline requests that can't be fulfilled
4. Track the status of all jobs in the "All Appointments" tab

### Managing Services
1. Go to the "Services" tab to manage your service offerings
2. Add new services with name, description, price, and duration
3. Assign services to categories for better organization
4. Mark popular services as "Featured" for highlighting

## Technical Implementation

### Database Schema
- Added `availability_status` column to `repair_shops` table
- Created `service_categories` table for service categorization
- Created `services` table for individual service offerings

### API Functions
- `toggleAvailability()` - Switch between availability statuses
- `addService()` - Add new services to the database
- `updateService()` - Modify existing services
- `deleteService()` - Remove services from the database
- `fetchServices()` - Retrieve all services for the shop
- `fetchServiceCategories()` - Retrieve all service categories