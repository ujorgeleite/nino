// jest.config.js
// jest-expo preset: understands the Expo SDK 57 module graph and RN transforms.

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Composes jest-expo's resolver with react-native-worklets' .native filter.
  resolver: '<rootDir>/jest.resolver.js',
  // RN and Expo ship untranspiled ESM; everything else stays untransformed.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@shopify/react-native-skia|lottie-react-native|react-native-reanimated|react-native-worklets|react-native-gesture-handler)',
  ],
  // Metro's SVG transformer does not run under Jest, so .svg imports would
  // resolve to a path string and fail to render. Map them to a stub component.
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/__mocks__/svgMock.tsx',
  },
  collectCoverageFrom: [
    'hooks/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
  ],
  // e2e/ belongs to Playwright, which has its own runner — Jest picking those
  // files up makes both suites fail confusingly.
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/e2e/', '/dist/'],
};
