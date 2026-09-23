import { Platform, type AccessibilityProps } from 'react-native';

/**
 * Accessibility props shared by the app's controls.
 *
 * react-native-web ignores the `accessibilityState` object — only the flat
 * `aria-*` props reach the DOM — and lets Space activate `role="button"` only.
 * These helpers therefore speak `role` / `aria-*`, which React Native maps to
 * the native accessibility state as well.
 */

/**
 * One option of a single-choice control: FR/EN, Dex/name sort, Normal/Shiny,
 * the type filter. On web a toggle button (`aria-pressed`), which keeps the
 * standard Enter/Space activation; on native a button in the `selected` state,
 * which VoiceOver and TalkBack announce. `aria-pressed` is web-only, hence the cast.
 */
export function choiceProps(selected: boolean): AccessibilityProps {
  return Platform.OS === 'web'
    ? ({ role: 'button', 'aria-pressed': selected } as AccessibilityProps)
    : { role: 'button', 'aria-selected': selected };
}

/**
 * Hides a decorative icon or glyph from screen readers. React Native maps it to
 * `accessibilityElementsHidden` on iOS and `no-hide-descendants` on Android.
 */
export const DECORATIVE: AccessibilityProps = { 'aria-hidden': true };

/**
 * One spoken element for a composite row, e.g. a base-stat row: a labelled
 * image on web (its painted children become presentational), a single
 * accessibility element on native.
 */
export function summaryProps(label: string): AccessibilityProps {
  return Platform.OS === 'web'
    ? { role: 'img', 'aria-label': label }
    : { accessible: true, accessibilityLabel: label };
}

/**
 * A section heading under the screen title. `aria-level` only exists on web
 * (it renders an `h2`); native screen readers have a single heading trait.
 */
export const SECTION_HEADING: AccessibilityProps =
  Platform.OS === 'web' ? ({ role: 'heading', 'aria-level': 2 } as AccessibilityProps) : { role: 'heading' };
