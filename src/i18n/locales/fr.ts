import type { PokemonType } from '@/constants/typeColors';

/**
 * French copy — the reference tree. `en.ts` is typed against this structure,
 * so a key added here and forgotten there fails the typecheck.
 *
 * Plural keys follow i18next's `_one` / `_other` suffixes (Intl.PluralRules):
 * in French, 0 and 1 are both `one`.
 */
const fr = {
  common: {
    retry: 'Réessayer',
    unknownError: 'Erreur inconnue',
    /** Joins two type labels in spoken labels: "Plante et Poison". */
    listSeparator: ' et ',
    readingCollection: 'Lecture de la collection…',
  },
  language: {
    label: 'Langue de l’application',
    /** Each language is named in its own language, whatever the UI language. */
    names: {
      fr: 'Français',
      en: 'English',
    },
  },
  shell: {
    back: 'Revenir à l’écran précédent',
  },
  pokemon: {
    cardLabel: '{{name}}, numéro {{number}}, {{types}}',
    shinyCardLabel: '{{name}} shiny, numéro {{number}}, {{types}}',
    typeList: 'type {{types}}',
    openHint: 'Ouvre la fiche détaillée du Pokémon',
    artwork: 'Illustration de {{name}}',
  },
  home: {
    title: 'Pokédex',
    subtitle: 'Johto & Kanto · {{count}} Pokémon',
    kickerFallback: 'Pokémon vedette',
    kickerFavorite: 'Votre vedette',
    loadingHero: 'Chargement du Pokémon…',
    heroError: 'Impossible de charger la vedette.',
    heroRetryLabel: 'Réessayer de charger le Pokémon vedette',
    viewEntry: 'Voir la fiche',
    pokedexCard: {
      title: 'Pokédex',
      subtitle: 'Rechercher, trier et filtrer',
      unit: 'Pokémon',
      label: 'Ouvrir le Pokédex',
      hint: 'Affiche la liste des Pokémon',
    },
    collectionCard: {
      title: 'Collection',
      subtitle: 'Vos Pokémon favoris',
      unit_one: 'favori',
      unit_other: 'favoris',
      label_one: 'Ouvrir la collection, {{count}} Pokémon favori',
      label_other: 'Ouvrir la collection, {{count}} Pokémon favoris',
      hint: 'Affiche vos Pokémon favoris',
    },
  },
  pokedex: {
    title: 'Pokédex',
    searchPlaceholder: 'Rechercher',
    searchLabel: 'Rechercher un Pokémon parmi ceux déjà chargés',
    searchHint: 'Filtre la liste par nom français, nom anglais ou numéro du Pokédex',
    sort: {
      dex: 'Trier par numéro du Pokédex',
      name: 'Trier par nom',
    },
    filter: {
      all: 'Tous',
      buttonAll: 'Filtrer par type, tous les types',
      buttonType: 'Filtrer par type, {{type}}',
      panelTitle: 'Type',
      close: 'Fermer le sélecteur de type',
      optionAll: 'Tous les types',
      optionType: 'Type {{type}}',
    },
    loading: 'Chargement des Pokémon…',
    loadError: 'Impossible de charger les Pokémon.',
    empty: 'Aucun Pokémon chargé ne correspond.',
    progress: '{{loaded}} / {{total}} Pokémon chargés',
    pageError: 'Échec du chargement.',
    end: 'Fin du Pokédex — {{count}} Pokémon chargés.',
  },
  collection: {
    title: 'Collection',
    count_one: '{{count}} favori',
    count_other: '{{count}} favoris',
    loading: 'Chargement de la collection…',
    error: 'Collection indisponible',
    emptyTitle: 'Collection vide',
    emptyBody: 'Ouvrez la fiche d’un Pokémon et touchez le cœur pour l’ajouter à votre collection.',
    openPokedex: 'Ouvrir le Pokédex',
  },
  detail: {
    fallbackTitle: 'Pokémon',
    invalidId: 'Identifiant invalide.',
    invalidIdBody: '« {{value}} » n’est pas un numéro du Pokédex national ({{min}}–{{max}}).',
    loading: 'Chargement de {{number}}…',
    loadError: 'Impossible de charger {{number}}.',
    noArtwork: 'Aucune image',
    artwork: '{{name}} ({{variant}})',
    variantGroup: 'Apparence',
    variant: {
      normal: 'Normal',
      shiny: 'Shiny',
    },
    /** French puts a space before the colon. */
    segmentOption: '{{group}} : {{option}}',
    favoriteAdd: 'Ajouter {{name}} à la collection',
    favoriteRemove: 'Retirer {{name}} de la collection',
    cryPlay: 'Écouter le cri de {{name}}',
    cryUnavailable: 'Cri de {{name}} indisponible',
    previous: 'Pokémon précédent, {{number}}',
    next: 'Pokémon suivant, {{number}}',
    about: 'À propos',
    weight: 'Poids',
    height: 'Taille',
    abilities: 'Talents',
    hiddenAbility: '{{name}} (caché)',
    noDescription: 'Aucune description disponible.',
    baseStats: 'Statistiques de base',
    kilograms: '{{value}} kg',
    metres: '{{value}} m',
  },
  /** Short label painted in the stat table, full name for screen readers. */
  stats: {
    hp: { short: 'PV', long: 'Points de vie' },
    attack: { short: 'ATQ', long: 'Attaque' },
    defense: { short: 'DÉF', long: 'Défense' },
    specialAttack: { short: 'A.SP', long: 'Attaque spéciale' },
    specialDefense: { short: 'D.SP', long: 'Défense spéciale' },
    speed: { short: 'VIT', long: 'Vitesse' },
    value: '{{stat}} {{value}}',
  },
  /** Official French type names, keyed by canonical PokéAPI slug. */
  types: {
    bug: 'Insecte',
    dark: 'Ténèbres',
    dragon: 'Dragon',
    electric: 'Électrik',
    fairy: 'Fée',
    fighting: 'Combat',
    fire: 'Feu',
    flying: 'Vol',
    ghost: 'Spectre',
    grass: 'Plante',
    ground: 'Sol',
    ice: 'Glace',
    normal: 'Normal',
    poison: 'Poison',
    psychic: 'Psy',
    rock: 'Roche',
    steel: 'Acier',
    water: 'Eau',
  } satisfies Record<PokemonType, string>,
} as const;

/** The key structure every locale must match, with any string as the value. */
type ResourceShape<T> = { [K in keyof T]: T[K] extends string ? string : ResourceShape<T[K]> };
export type LocaleResource = ResourceShape<typeof fr>;

export default fr;
