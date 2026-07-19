// jest.setup.ts
// Native modules that have no JS implementation under Jest get mocked here,
// so hooks and components can be tested without a device.

// (@testing-library/react-native v13 registers its matchers automatically —
// no extend-expect import needed.)

// --- Reanimated -------------------------------------------------------------
// Ships its own Jest mock: animations resolve synchronously to their end value.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// --- Haptics ----------------------------------------------------------------
// Every call resolves; tests assert *that* feedback fired, not how it felt.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// --- Keep awake -------------------------------------------------------------
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
  useKeepAwake: jest.fn(),
}));

// --- Audio ------------------------------------------------------------------
// useAudioPlayer returns a stub player so sound wiring is assertable.
jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    remove: jest.fn(),
    volume: 1,
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

// --- Skia -------------------------------------------------------------------
// Canvas rendering is not asserted in unit tests; render it as a plain View.
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View } = require('react-native');
  const passthrough = (name: string) => {
    const C = ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: `skia-${name}` }, children);
    C.displayName = `Skia.${name}`;
    return C;
  };
  return {
    Canvas: passthrough('Canvas'),
    Group: passthrough('Group'),
    RoundedRect: passthrough('RoundedRect'),
    Rect: passthrough('Rect'),
    Path: passthrough('Path'),
    LinearGradient: passthrough('LinearGradient'),
    Shadow: passthrough('Shadow'),
    vec: (x: number, y: number) => ({ x, y }),
    Skia: {
      Path: {
        Make: () => ({ moveTo: jest.fn(), quadTo: jest.fn(), lineTo: jest.fn(), close: jest.fn() }),
      },
    },
  };
});

// --- Lottie -----------------------------------------------------------------
jest.mock('lottie-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const LottieView = React.forwardRef((props: object, ref: unknown) =>
    React.createElement(View, { ...props, testID: 'lottie', ref }),
  );
  LottieView.displayName = 'LottieView';
  return { __esModule: true, default: LottieView };
});

// --- expo-router ------------------------------------------------------------
// Navigation is asserted by inspecting these mocks, not by mounting a router.
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  Link: 'Link',
  Stack: Object.assign(({ children }: { children?: unknown }) => children, {
    Screen: () => null,
  }),
}));

// Silence the RN animation-frame warning noise that jest-expo emits.
jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('useNativeDriver') || msg.includes('Animated:')) return;
  console.info(...args);
});

beforeEach(() => {
  jest.clearAllMocks();
});
