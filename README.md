# MyGarage Web Application

A modern web application built with Vite, React, and TypeScript for managing garage services.

## Features

- Browse repair shops with integrated map functionality
- View product/service details
- Responsive design with Tailwind CSS
- Supabase integration for backend services
- Admin dashboard for managing products, categories, and orders

## Tech Stack

- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- [React](https://reactjs.org/) - A JavaScript library for building user interfaces
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript at Any Scale
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [Supabase](https://supabase.io/) - Open source Firebase alternative
- [Leaflet](https://leafletjs.com/) - JavaScript library for mobile-friendly interactive maps
- [React Router](https://reactrouter.com/) - Declarative routing for React

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm, yarn, or pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Accessing Admin Dashboard

```bash
npm run admin
```

This will start the development server and open the admin dashboard at [http://localhost:5173/admin](http://localhost:5173/admin).

Alternatively, you can manually navigate to the admin dashboard by visiting `/admin` in your browser.

### Building for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Admin Dashboard

The admin dashboard provides a comprehensive management interface for the application. It includes:

- Overview statistics showing products, orders, categories, and revenue
- Product management (view all products, stock levels, featured status)
- Category management
- Order management with status tracking
- Low stock alerts
- Recent orders display

The dashboard is accessible at `/admin` and requires no authentication.

## Deployment

### Deploy to Vercel

This project is configured for easy deployment to Vercel:

1. Push your code to a GitHub repository
2. Go to [Vercel](https://vercel.com/) and create a new project
3. Import your repository
4. Vercel will automatically detect the Vite project and configure the build settings
5. Click "Deploy"

That's it! Your site will be live shortly.

Alternatively, you can use the Vercel CLI:

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

### Environment Variables

For Supabase integration to work, you'll need to set the following environment variables in your Vercel project:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

These can be added in your Vercel project dashboard under Settings > Environment Variables.