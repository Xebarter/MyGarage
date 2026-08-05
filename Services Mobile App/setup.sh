#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v flutter >/dev/null 2>&1; then
  echo "Flutter SDK not found on PATH."
  echo "Install Flutter: https://docs.flutter.dev/get-started/install"
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example — fill in Supabase and API values."
fi

echo "Generating / repairing platform folders..."
flutter create . --project-name mygarage_services --org ug.mygarage --platforms=android,ios

echo "Getting packages..."
flutter pub get

echo "Done. Edit .env then run: flutter run"
