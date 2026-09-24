import { Platform, type AccessibilityProps } from 'react-native';

// react-native-web ignore `accessibilityState` (seuls les `aria-*` plats atteignent le
// DOM) : ces helpers passent par `role` / `aria-*`, que RN mappe aussi en natif.

// Web : `aria-pressed` garde l'activation Entrée/Espace ; natif : état `selected`,
// annoncé par VoiceOver et TalkBack. Cast car `aria-pressed` est web uniquement.
export function choiceProps(selected: boolean): AccessibilityProps {
  return Platform.OS === 'web'
    ? ({ role: 'button', 'aria-pressed': selected } as AccessibilityProps)
    : { role: 'button', 'aria-selected': selected };
}

// Web : `aria-pressed`, car react-native-web ne donne Espace qu'à role="button" ;
// natif : un switch `checked`.
export function toggleProps(on: boolean): AccessibilityProps {
  return Platform.OS === 'web'
    ? ({ role: 'button', 'aria-pressed': on } as AccessibilityProps)
    : { role: 'switch', 'aria-checked': on };
}

export const DECORATIVE: AccessibilityProps = { 'aria-hidden': true };

// Web : image étiquetée (ses enfants deviennent décoratifs) ; natif : un seul élément accessible.
export function summaryProps(label: string): AccessibilityProps {
  return Platform.OS === 'web'
    ? { role: 'img', 'aria-label': label }
    : { accessible: true, accessibilityLabel: label };
}

// `aria-level` n'existe que sur le web (rendu en `h2`) ; le natif n'a qu'un trait heading.
export const SECTION_HEADING: AccessibilityProps =
  Platform.OS === 'web' ? ({ role: 'heading', 'aria-level': 2 } as AccessibilityProps) : { role: 'heading' };
