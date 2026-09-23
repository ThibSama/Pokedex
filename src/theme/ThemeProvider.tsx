import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { saveThemeMode } from '@/theme/themeStorage';
import { PALETTES, type Palette, type ThemeMode } from '@/theme/tokens';
import { DECORATIVE } from '@/utils/a11y';

/**
 * The theme switch is a short crossfade of the content sheets: right after the
 * new palette is committed, a layer in the previous sheet color sits over each
 * sheet at `FADE_FROM` and fades out. The red chrome is the same in both themes,
 * so it is left alone and nothing on screen flashes or moves. Reduce Motion
 * turns it into a plain cut.
 */
const FADE_MS = 200;
const FADE_FROM = 0.7;

interface ThemeContextValue {
  mode: ThemeMode;
  palette: Palette;
  setMode: (mode: ThemeMode) => void;
  /** 0 at rest; the sheet crossfade layer's opacity while a switch settles. */
  fade: SharedValue<number>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Holds the active theme and mirrors every change to AsyncStorage. The root
 * layout reads the stored mode before the splash hides and passes it in, so a
 * saved Dark choice is the first thing painted.
 */
export function ThemeProvider({ initialMode, children }: { initialMode: ThemeMode; children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const fade = useSharedValue(0);
  const firstRender = useRef(true);
  // Serializes writes, so two quick switches always leave the last one stored.
  const writeChain = useRef<Promise<void>>(Promise.resolve());

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    writeChain.current = writeChain.current.then(() =>
      saveThemeMode(next).catch(() => {
        // Non-fatal: the theme still applies for this session.
      }),
    );
  }, []);

  // A layout effect runs before the new palette is painted, so the crossfade
  // layer and the new colors reach the screen together.
  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timing = { easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System };
    fade.set(withSequence(withTiming(FADE_FROM, { ...timing, duration: 0 }), withTiming(0, { ...timing, duration: FADE_MS })));
  }, [mode, fade]);

  const value = useMemo(() => ({ mode, palette: PALETTES[mode], setMode, fade }), [mode, setMode, fade]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return context;
}

/**
 * `StyleSheet.create` for both palettes up front: a component calls the returned
 * hook and gets the sheet for the active theme, so a switch is a lookup rather
 * than a restyle, and the styles stay declared next to the component as before.
 */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: (palette: Palette) => T) {
  const sheets: Record<ThemeMode, T> = {
    light: StyleSheet.create(factory(PALETTES.light)),
    dark: StyleSheet.create(factory(PALETTES.dark)),
  };
  return function useThemedStyles(): T {
    return sheets[useTheme().mode];
  };
}

/**
 * The crossfade layer, painted as the last child of a content sheet. It never
 * takes touches or focus, and it is invisible at rest.
 */
export function ThemeFade({ borderRadius }: { borderRadius: number }) {
  const { mode, fade } = useTheme();
  const previous = PALETTES[mode === 'dark' ? 'light' : 'dark'].surface;
  const style = useAnimatedStyle(() => ({ opacity: fade.get() }));
  return (
    <Animated.View
      pointerEvents="none"
      {...DECORATIVE}
      style={[StyleSheet.absoluteFill, { borderRadius, backgroundColor: previous }, style]}
    />
  );
}
