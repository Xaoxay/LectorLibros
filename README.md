# Kindle Clone - Expo (single-file demo)

This repository is a compact starter for a Kindle-style reader app using **Expo** and **Firebase**.
It contains a single `App.js` with screens for Auth, Library, Upload, Search and Reader (PDF/EPUB).

## Setup

1. Install dependencies:
```bash
npm install
npx expo install react-native-gesture-handler react-native-reanimated react-native-webview expo-document-picker react-native-safe-area-context
npm install firebase react-native-pdf epubjs @react-navigation/native @react-navigation/native-stack
```

2. Replace `firebaseConfig` in `App.js` with your Firebase project's config.

3. Add `react-native-reanimated/plugin` to `babel.config.js` (already included).

4. Start Metro:
```bash
expo start -c
```

## Notes

- `react-native-pdf` may require ejecting / prebuild in Expo Managed workflow. Use WebView fallback if you do not want to eject.
- This single-file project is for prototyping and learning; for production split files into modules.
- Secure your Firestore and Storage rules before releasing.