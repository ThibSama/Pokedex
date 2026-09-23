import { createThemedStyles } from '@/theme/ThemeProvider';
import { TYPO } from '@/theme/typography';

/**
 * Message text for a screen's loading, empty and error states. They used to be
 * redeclared per route, which is how three screens grew three slightly
 * different "something failed" styles.
 */
export const useMessageStyles = createThemedStyles((c) => ({
  /** Neutral explanation under a state's title. */
  muted: { ...TYPO.body2, color: c.textMuted, textAlign: 'center' },
  /** The failure itself: red, because red is the app's signal color. */
  error: { ...TYPO.subtitle1, color: c.accent, textAlign: 'center' },
  /** Explanation painted on a type accent; the color comes from `foregroundOn(accent)`. */
  onColor: { ...TYPO.body2, textAlign: 'center' },
}));
