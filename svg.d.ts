// svg.d.ts
// Lets TypeScript understand `import NinoHead from '../assets/mascot/nino-head.svg'`.
// Metro turns these into components via react-native-svg-transformer (metro.config.js).

declare module '*.svg' {
  import type React from 'react';
  import type { SvgProps } from 'react-native-svg';

  const content: React.FC<SvgProps>;
  export default content;
}
