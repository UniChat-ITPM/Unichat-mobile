# UniChat Mobile

React Native mobile app built with Expo.

## Prerequisites

Install the following before running the project:

- Node.js (LTS recommended, Node 18+)
- npm (comes with Node.js)
- Expo Go app on your phone (optional, for device testing)
- Android Studio emulator and/or Xcode simulator (optional, for local emulators)

## Setup

1. Open a terminal in the project root.
2. Install dependencies:

```bash
npm install
```

## Run the project

Start the Expo development server:

```bash
npm run start
```

After the server starts:

- Press `a` in the terminal to open Android emulator
- Press `i` to open iOS simulator (macOS only)
- Press `w` to open web
- Or scan the QR code with Expo Go on your phone

## Useful scripts

```bash
npm run start    # Start Expo dev server
npm run android  # Open on Android
npm run ios      # Open on iOS (macOS only)
npm run web      # Open in browser
```

## Notes

- If Metro cache causes issues, restart with:

```bash
npx expo start -c
```

- downloda expo go application from appstore of playstore

- If dependencies change, run `npm install` again.
