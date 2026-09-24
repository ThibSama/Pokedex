import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { isPokemonType } from '@/constants/typeColors';
import { useAppLanguage } from '@/i18n';
import { LOCALE_TAGS, otherLanguage } from '@/i18n/languages';
import type { LanguageCode, PokemonSummary } from '@/types/pokemon';
import { formatDexNumber, humanizeSlug } from '@/utils/pokemonList';

/** Repli sur l'autre langue, pour les données que PokéAPI n'a pas partout (descriptions). */
export function pickLocalized<T>(values: Record<LanguageCode, T | null>, language: LanguageCode): T | null {
  return values[language] ?? values[otherLanguage(language)];
}

export function formatDecimal(value: number, language: LanguageCode): string {
  return new Intl.NumberFormat(LOCALE_TAGS[language], {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function usePokemonText() {
  const { t } = useTranslation();
  const language = useAppLanguage();

  return useMemo(() => {
    const typeLabel = (type: string) => (isPokemonType(type) ? t(`types.${type}`) : humanizeSlug(type));
    const typeList = (types: readonly string[]) =>
      t('pokemon.typeList', { types: types.map(typeLabel).join(t('common.listSeparator')) });

    return {
      language,
      name: (pokemon: Pick<PokemonSummary, 'names'>) => pokemon.names[language],
      typeLabel,
      cardLabel: (pokemon: PokemonSummary, shiny = false) =>
        t(shiny ? 'pokemon.shinyCardLabel' : 'pokemon.cardLabel', {
          name: pokemon.names[language],
          number: formatDexNumber(pokemon.id),
          types: typeList(pokemon.types),
        }),
    };
  }, [t, language]);
}
