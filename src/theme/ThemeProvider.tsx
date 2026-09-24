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

// Au changement de thème, un calque de l'ancienne couleur des surfaces part de
// `FADE_FROM` et s'efface. Le chrome rouge n'est pas touché ; Reduce Motion coupe net.
const FADE_MS = 200;
const FADE_FROM = 0.7;

interface ThemeContextValue {
  mode: ThemeMode;
  palette: Palette;
  setMode: (mode: ThemeMode) => void;
  /** Opacité du calque de fondu ; 0 au repos. */
  fade: SharedValue<number>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ initialMode, children }: { initialMode: ThemeMode; children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const fade = useSharedValue(0);
  const firstRender = useRef(true);
  // Sérialise les écritures : deux bascules rapides laissent bien la dernière stockée.
  const writeChain = useRef<Promise<void>>(Promise.resolve());

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    writeChain.current = writeChain.current.then(() =>
      saveThemeMode(next).catch(() => {
        // Sans gravité : le thème s'applique quand même pour la session.
      }),
    );
  }, []);

  // Effet de layout : le calque et la nouvelle palette arrivent à l'écran
  // dans la même frame.
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

// Styles créés d'avance pour les deux palettes : changer de thème n'est qu'une lecture.
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: (palette: Palette) => T) {
  const sheets: Record<ThemeMode, T> = {
    light: StyleSheet.create(factory(PALETTES.light)),
    dark: StyleSheet.create(factory(PALETTES.dark)),
  };
  return function useThemedStyles(): T {
    return sheets[useTheme().mode];
  };
}

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
