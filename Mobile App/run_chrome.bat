@echo off
REM Serve CanvasKit from the Flutter SDK (no www.gstatic.com download).
REM Avoids white-screen failures after Wi-Fi blips (ERR_NETWORK_CHANGED).
cd /d "%~dp0"
flutter run -d chrome --no-web-resources-cdn %*
