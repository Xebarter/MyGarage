@echo off
REM Build release APK with a known-good JDK (avoids broken Android Studio1\jbr).
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
if not exist "%JAVA_HOME%\bin\java.exe" (
  echo ERROR: JDK not found at:
  echo   %JAVA_HOME%
  echo Install Temurin 17 or edit JAVA_HOME in this script and android\gradle.properties
  exit /b 1
)
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "%~dp0"

echo Using JAVA_HOME=%JAVA_HOME%
call flutter config --jdk-dir="%JAVA_HOME%"
call flutter build apk --release %*
exit /b %ERRORLEVEL%
