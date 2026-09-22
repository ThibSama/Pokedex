import type { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { PALETTE } from '@/constants/typeColors';

/**
 * Widest the app is ever painted. Mobile stays the product authority, so on a
 * desktop browser the whole navigator is centered inside a phone/small-tablet
 * column instead of being stretched across 1440+ px of viewport.
 */
export const APP_FRAME_MAX_WIDTH = 480;

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
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={styles.backdrop}>
      <View style={styles.frame}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: PALETTE.light,
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: APP_FRAME_MAX_WIDTH,
    overflow: 'hidden',
    backgroundColor: PALETTE.background,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
});
