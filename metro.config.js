// metro.config.js
// Enables importing .svg files as React components via react-native-svg-transformer,
// so the Nino mascot art can be used as `import NinoHead from '../assets/mascot/nino-head.svg'`.
//
// Without this, Metro treats .svg as a static asset and the import returns a
// number (an asset ref), not a component.

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
