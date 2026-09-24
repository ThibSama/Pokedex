import { createThemedStyles } from '@/theme/ThemeProvider';
import { TYPO } from '@/theme/typography';

export const useMessageStyles = createThemedStyles((c) => ({
  muted: { ...TYPO.body2, color: c.textMuted, textAlign: 'center' },
  error: { ...TYPO.subtitle1, color: c.accent, textAlign: 'center' },
  /** Couleur à fournir via `foregroundOn(accent)`. */
  onColor: { ...TYPO.body2, textAlign: 'center' },
}));
