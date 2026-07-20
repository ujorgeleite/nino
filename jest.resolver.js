// jest.resolver.js
// Reanimated v4 runs on react-native-worklets, whose `.native.ts` files require
// the real native module and throw under Jest. react-native-worklets ships a
// resolver that strips the `.native` extensions so the plain (JS) variants win.
//
// jest-expo already installs its own resolver, so we cannot just point Jest at
// the worklets one — we compose: apply the worklets extension filter, then hand
// off to the React Native resolver that jest-expo would have used.

const defaultResolver = require('@react-native/jest-preset/jest/resolver');

module.exports = (request, options) => {
  if (
    options.basedir.includes('react-native-worklets') ||
    request.includes('react-native-worklets')
  ) {
    options = {
      ...options,
      extensions: options.extensions?.filter((ext) => !ext.includes('native')),
    };
  }

  return defaultResolver(request, options);
};
