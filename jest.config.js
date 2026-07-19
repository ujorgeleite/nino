// jest.config.js
// jest-expo preset: understands the Expo SDK 57 module graph and RN transforms.

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // RN and Expo ship untranspiled ESM; everything else stays untransformed.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@shopify/react-native-skia|lottie-react-native|react-native-reanimated|react-native-worklets|react-native-gesture-handler)',
  ],
  collectCoverageFrom: [
    'hooks/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
};
