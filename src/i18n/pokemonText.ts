import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { isPokemonType } from '@/constants/typeColors';
import { useAppLanguage } from '@/i18n';
import { LOCALE_TAGS, otherLanguage } from '@/i18n/languages';
import type { LanguageCode, PokemonSummary } from '@/types/pokemon';
import { formatDexNumber, humanizeSlug } from '@/utils/pokemonList';

/**
 * The value for `language`, else the other supported language's, else null.
 * Used for data PokéAPI may lack in one language (flavor text).
 */
export function pickLocalized<T>(values: Record<LanguageCode, T | null>, language: LanguageCode): T | null {
  return values[language] ?? values[otherLanguage(language)];
}

/** One decimal, with the locale's separator: `27,0` in French, `27.0` in English. */
export function formatDecimal(value: number, language: LanguageCode): string {
  return new Intl.NumberFormat(LOCALE_TAGS[language], {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Display-side Pokémon text for the active language: names, type labels and the
 * spoken summary tiles and heroes share. Data stays canonical — `pokemon.types`
 * keeps its slugs — and only what is shown is translated here.
 */
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
      /** Screen-reader summary of a tile: name (and shiny), Dex number, types. */
      cardLabel: (pokemon: PokemonSummary, shiny = false) =>
        t(shiny ? 'pokemon.shinyCardLabel' : 'pokemon.cardLabel', {
          name: pokemon.names[language],
          number: formatDexNumber(pokemon.id),
          types: typeList(pokemon.types),
        }),
    };
  }, [t, language]);
}
