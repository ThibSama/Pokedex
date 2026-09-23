import type { ReactNode } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

import { createThemedStyles } from '@/theme/ThemeProvider';
import { INK, SHADOW } from '@/theme/tokens';

/**
 * Widest the app is ever painted. Mobile stays the product authority, so on a
 * desktop browser the whole navigator is centered inside a phone/small-tablet
 * column instead of being stretched across 1440+ px of viewport.
 */
export const APP_FRAME_MAX_WIDTH = 480;

/**
 * One keyboard focus ring for every control on web. React Native styles have no
 * `:focus-visible`, and the browser default is a thin ring that is hard to see
 * on the red chrome. Two tones — a white halo inside a dark outline — read on
 * red (dark 3.2:1, white 5.1:1), on white, on the Dark sheets and on every type
 * accent, so the ring is the same in both themes. Only
 * keyboard focus matches, so taps and clicks draw nothing. Text inputs are
 * left alone: the search field paints its own focused border.
 */
const FOCUS_RING_CSS = `[tabindex="0"]:focus-visible,a[href]:focus-visible{outline:3px solid ${INK.dark};outline-offset:2px;box-shadow:0 0 0 2px ${INK.light};}`;

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.setAttribute('data-app', 'focus-ring');
  style.textContent = FOCUS_RING_CSS;
  document.head.appendChild(style);
}

/**
 * Width every screen should lay out against.
 *
 * Screens that size their own grid must ask for this rather than
 * `useWindowDimensions().width`, or the web frame and the grid disagree and
 * tiles overflow the column.
 */
export function useFrameWidth(): number {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' ? Math.min(width, APP_FRAME_MAX_WIDTH) : width;
}

/**
 * Wraps the whole navigator once, in the root layout, so Home, Pokédex,
 * Collection and the detail screen share one width cap instead of each route
 * inventing its own. On native it renders its children untouched.
 *
 * The frame is mounted unconditionally on web — `maxWidth` simply does nothing
 * below the cap — so a narrow browser is byte-identical to today and a wide one
 * does not flash the full-width layout before a measurement arrives.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const styles = useStyles();
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={styles.backdrop}>
      <View style={styles.frame}>{children}</View>
    </View>
  );
}

const useStyles = createThemedStyles((c) => ({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: c.backdrop,
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: APP_FRAME_MAX_WIDTH,
    overflow: 'hidden',
    backgroundColor: c.frame,
    ...SHADOW.frame,
  },
}));
