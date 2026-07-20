// __mocks__/svgMock.tsx
// Stands in for any .svg import under Jest (see moduleNameMapper in jest.config.js).
// Renders a View carrying the same props, so tests can assert size and a11y.

import React from 'react';
import { View } from 'react-native';

const SvgMock = (props: Record<string, unknown>) =>
  React.createElement(View, { testID: 'svg-mock', ...props });

export default SvgMock;
