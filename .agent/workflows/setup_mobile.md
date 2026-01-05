---
description: Setup Capacitor for Android/iOS mobile deployment
---
# Mobile App Setup (Capacitor)

This workflow adds native mobile capabilities to the React application using Capacitor.

## Prerequisites
- **Android**: Android Studio installed and configured (SDK, Virtual Device).
- **iOS**: Mac with Xcode installed (Required for iOS build).

## Steps

1. Install Capacitor dependencies
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
```

2. Initialize Capacitor application
```bash
npx cap init "Radiology Training App" "com.radiology.training"
```
*(You can change the App Name and ID as needed)*

3. Build the web application
```bash
npm run build
```
*Capacitor wraps the compiled web assets (dist folder).*

4. Add Android Platform
```bash
npx cap add android
```
*(This creates the `android` folder which you can open in Android Studio).*

5. Sync Assets
```bash
npx cap sync
```

## How to Run (Android)
1. Open the `android` folder in Android Studio.
2. Wait for Gradle sync to finish.
3. Click "Run" (Green arrow) to launch on an emulator or connected device.
