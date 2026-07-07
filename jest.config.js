module.exports = {
  preset: '@react-native/jest-preset',
  resolver: 'react-native-worklets/jest/resolver.js',
  setupFiles: [
    '@shopify/react-native-skia/jestSetup.js',
    '<rootDir>/jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|react-native-gesture-handler|react-native-reanimated|react-native-worklets|react-native-safe-area-context|@shopify/react-native-skia)/)',
  ],
  modulePathIgnorePatterns: ['<rootDir>/server/'],
};
