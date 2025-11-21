# MyGarage - Automotive Parts E-commerce Platform

MyGarage is a modern automotive parts e-commerce platform built with React, TypeScript, and Supabase. It allows customers to browse and purchase auto parts, find repair shops, and administrators to manage inventory and orders.

## Features

### Customer Features
- Browse automotive parts with detailed information
- Search and filter parts by category, brand, and compatibility
- Add parts to cart and checkout
- Locate nearby repair shops with integrated map
- **NEW: AI-powered part identification using image analysis**

### Admin Features
- Dashboard with sales analytics
- Manage products, categories, and inventory
- Process and manage orders
- View reports and revenue statistics

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **Backend**: Supabase (Database, Authentication, Storage)
- **Maps**: Leaflet
- **Icons**: Lucide React
- **AI Integration**: Google Gemini API for image analysis

## Getting Started

### Prerequisites

- Node.js 16+
- npm/yarn/pnpm
- Supabase account
- **Google Gemini API key**

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mygarage
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with your configuration:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

4. Start the development server:
```bash
npm run dev
```

### Environment Variables

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
- `VITE_GEMINI_API_KEY`: Your Google Gemini API key for image analysis

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run admin`: Open admin dashboard

## Deployment

The project is configured for deployment on Vercel. Make sure to set the environment variables in your Vercel project settings.

## New Feature: AI-Powered Part Identification

With the integration of Google's Gemini API, MyGarage now offers an innovative way to identify car parts through image analysis:

1. Navigate to the "Part Identifier" section
2. Upload a clear image of a car part
3. Our AI analyzes the image and provides:
   - Part name and brand
   - Detailed description of the part's function
   - Compatible vehicle models
   - Confidence level of the identification

This feature makes it easier for customers to find the exact parts they need, even if they don't know the technical names or part numbers.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.