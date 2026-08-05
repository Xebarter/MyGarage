@ECHO OFF
SETLOCAL
cd /d "%~dp0"

WHERE flutter >NUL 2>&1
IF ERRORLEVEL 1 (
  ECHO Flutter SDK not found on PATH.
  ECHO Install Flutter: https://docs.flutter.dev/get-started/install/windows
  EXIT /B 1
)

IF NOT EXIST ".env" (
  COPY /Y ".env.example" ".env" >NUL
  ECHO Created .env from .env.example — fill in Supabase and API values.
)

ECHO Generating / repairing platform folders...
flutter create . --project-name mygarage_services --org ug.mygarage --platforms=android,ios

ECHO Getting packages...
flutter pub get

ECHO Done. Edit .env then run: flutter run
ENDLOCAL
