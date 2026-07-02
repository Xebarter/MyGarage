# MyGarage Mobile App

React Native (Expo) buyer app for the MyGarage automotive marketplace. Browse spare parts, manage your cart, explore service categories, and sign in with the same Supabase account as the web storefront.

## Prerequisites

- Node.js 20+
- [Expo Go](https://expo.dev/go) on your phone, or Android Studio / Xcode for emulators
- The MyGarage Next.js app running locally (or deployed) for product APIs

## Setup

```bash
cd "Mobile App"
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Web app URL. Use `http://YOUR_LAN_IP:3000` on a physical device (not `localhost`). |
| `EXPO_PUBLIC_SUPABASE_URL` | Same as `NEXT_PUBLIC_SUPABASE_URL` in the web app |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same as `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the web app |

Install and start:

```bash
npm install
npm start
```

Then press `a` for Android emulator, `w` for web preview, or scan the QR code with Expo Go.

## Features

- **Home** — featured products and category discovery feed from `/api/landing/products`
- **Shop** — searchable product catalog with category filters
- **Services** — automotive service categories (roadside, repairs, maintenance, etc.)
- **Cart** — persistent cart with checkout handoff to the web storefront
- **Profile** — Supabase email/password auth and buyer profile sync

## Project structure

```
app/           Expo Router screens (tabs, product detail, auth)
components/    Reusable UI (ProductCard, SearchBar, …)
contexts/      Auth and cart state
lib/           API client, Supabase, formatting
data/          Service category catalog (mirrors web app)
types/         Shared TypeScript types
```

## Notes

- Checkout and full service booking open in the browser (Paytota mobile money and dispatch flows live on the web app today).
- Product images and data are loaded from the existing Next.js API routes — no duplicate backend.
