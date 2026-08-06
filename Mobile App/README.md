# MyGarage buyer app (Flutter)

## Setup

```bash
cd "Mobile App"
# Copy and edit env:
cp .env.example .env
flutter pub get
flutter run
```

## Environment (`.env`)

| Variable | Description |
|----------|-------------|
| `API_URL` | Next.js API base — use `https://www.mygarage.ug` or `http://YOUR_LAN_IP:3000` |
| `SUPABASE_URL` | Same as web `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | Same as web anon key |
| `GOOGLE_MAPS_API_KEY` | Maps SDK key |
| `AUTH_DEEP_LINK_URI` | Default `mygarage://login-callback` |
| `AUTH_REDIRECT_URI` | HTTPS OAuth bridge (default `{API_URL}/auth/mobile-callback`) |

## Preview

| Mode | Command | API |
|------|---------|-----|
| **Flutter Web** (e.g. `http://localhost:55006`) | `flutter run -d chrome` | Set `API_URL=http://localhost:3000` and run Next on port 3000. Browser CORS blocks production unless the site middleware allows localhost. |
| Android / iOS | `flutter run` | Emulator: `http://10.0.2.2:3000`. Device: PC LAN IP. |
| Release APK | `flutter build apk --release` | Use `API_URL=https://www.mygarage.ug` then rebuild (`.env` is bundled). |
## Build APK

```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

Enable **Windows Developer Mode** if Flutter reports symlink errors for plugins.

## Features

- **Services** — category catalog, location, request, provider tracking (name + photo)
- **Shop** — product catalog + product detail
- **Cart / Checkout** — local cart + Paytota hosted payment
- **Garage** — vehicles list + add
- **Profile / Orders** — auth, orders list

## Notes

- Backend is the MyGarage Next.js API (no separate mobile backend).
- This folder is Flutter-only (the previous Expo/RN app was replaced).
- Provider app remains in `Services Mobile App/`.
