import type { ReactNode } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

import { createThemedStyles } from '@/theme/ThemeProvider';
import { INK, SHADOW } from '@/theme/tokens';

// Le mobile fait référence : sur un navigateur large, l'app tient dans une colonne.
export const APP_FRAME_MAX_WIDTH = 480;

// Les styles RN n'ont pas de `:focus-visible`. Anneau bicolore (liseré blanc dans un
// contour sombre) lisible sur le rouge (3,2:1 / 5,1:1), le blanc, les fonds sombres
// et tous les accents. Les champs texte sont exclus : ils dessinent leur propre focus.
const FOCUS_RING_CSS = `[tabindex="0"]:focus-visible,a[href]:focus-visible{outline:3px solid ${INK.dark};outline-offset:2px;box-shadow:0 0 0 2px ${INK.light};}`;

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.setAttribute('data-app', 'focus-ring');
  style.textContent = FOCUS_RING_CSS;
  document.head.appendChild(style);
}

/** À utiliser à la place de `useWindowDimensions().width`, sinon les grilles débordent de la colonne web. */
export function useFrameWidth(): number {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' ? Math.min(width, APP_FRAME_MAX_WIDTH) : width;
}

// Cadre monté sans condition sur le web (`maxWidth` n'agit pas sous la limite) :
// pas de flash pleine largeur avant la première mesure.
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
