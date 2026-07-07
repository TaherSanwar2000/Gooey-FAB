/* eslint-env jest */
require('react-native-gesture-handler/jestSetup');

require('react-native-reanimated').setUpTests();

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// No real network in tests: the config hook falls back to its baked-in
// default config when fetch rejects and the socket never connects.
global.fetch = jest.fn(() => Promise.reject(new Error('network disabled in tests')));
global.WebSocket = class {
  onopen = null;
  onmessage = null;
  onclose = null;
  onerror = null;
  send() {}
  close() {}
};
