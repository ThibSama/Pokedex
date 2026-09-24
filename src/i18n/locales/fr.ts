import type { PokemonType } from "@/constants/typeColors";

// Arbre de référence : `en.ts` est typé dessus, une clé oubliée casse le typecheck.
// Pluriels i18next `_one` / `_other` : en français, 0 et 1 relèvent de `one`.
const fr = {
  common: {
    retry: "Réessayer",
    unknownError: "Erreur inconnue",
    listSeparator: " et ",
    readingCollection: "Lecture de la collection…",
  },
  language: {
    label: "Langue de l’application",
    // Chaque langue est nommée dans sa propre langue, quelle que soit celle de l'UI.
    names: {
      fr: "Français",
      en: "English",
    },
  },
  theme: {
    dark: "Mode sombre",
  },
  shell: {
    back: "Revenir à l’écran précédent",
  },
  pokemon: {
    cardLabel: "{{name}}, numéro {{number}}, {{types}}",
    shinyCardLabel: "{{name}} shiny, numéro {{number}}, {{types}}",
    typeList: "type {{types}}",
    openHint: "Ouvre la fiche détaillée du Pokémon",
  },
  home: {
    title: "Pokédex",
    subtitle: "Johto & Kanto · {{count}} Pokémon",
    loadingHero: "Chargement du Pokémon…",
    heroError: "Impossible de charger le Pokémon.",
    heroRetryLabel: "Réessayer de charger le Pokémon",
    viewEntry: "Voir la fiche",
    pokedexCard: {
      title: "Pokédex",
      subtitle: "Rechercher, trier et filtrer",
      unit: "Pokémon",
      label: "Ouvrir le Pokédex",
      hint: "Affiche la liste des Pokémon",
    },
    collectionCard: {
      title: "Collection",
      subtitle: "Vos Pokémon favoris",
      unit_one: "favori",
      unit_other: "favoris",
      label_one: "Ouvrir la collection, {{count}} Pokémon favori",
      label_other: "Ouvrir la collection, {{count}} Pokémon favoris",
      hint: "Affiche vos Pokémon favoris",
    },
  },
  pokedex: {
    title: "Pokédex",
    searchPlaceholder: "Rechercher",
    searchLabel: "Rechercher un Pokémon parmi ceux déjà chargés",
    searchHint:
      "Filtre la liste par nom français, nom anglais ou numéro du Pokédex",
    sort: {
      label: "Ordre de tri",
      dex: "Trier par numéro du Pokédex",
      name: "Trier par nom",
    },
    filter: {
      all: "Tous",
      buttonAll: "Filtrer par type, tous les types",
      buttonType: "Filtrer par type, {{type}}",
      dialogLabel: "Filtrer par type",
      panelTitle: "Type",
      close: "Fermer le sélecteur de type",
      optionAll: "Tous les types",
      optionType: "Type {{type}}",
    },
    loading: "Chargement des Pokémon…",
    loadError: "Impossible de charger les Pokémon.",
    empty: "Aucun Pokémon chargé ne correspond.",
    progress: "{{loaded}} / {{total}} Pokémon chargés",
    progressLabel: "Chargement du Pokédex",
    pageError: "Échec du chargement.",
    end: "Fin du Pokédex — {{count}} Pokémon chargés.",
  },
  collection: {
    title: "Collection",
    count_one: "{{count}} favori",
    count_other: "{{count}} favoris",
    loading: "Chargement de la collection…",
    error: "Collection indisponible",
    emptyTitle: "Collection vide",
    emptyBody:
      "Ouvrez la fiche d’un Pokémon et touchez le cœur pour l’ajouter à votre collection.",
    openPokedex: "Ouvrir le Pokédex",
  },
  detail: {
    fallbackTitle: "Pokémon",
    invalidId: "Identifiant invalide.",
    invalidIdBody:
      "« {{value}} » n’est pas un numéro du Pokédex national ({{min}}–{{max}}).",
    loading: "Chargement de {{number}}…",
    loadError: "Impossible de charger {{number}}.",
    noArtwork: "Aucune image",
    artwork: "{{name}} ({{variant}})",
    variantGroup: "Apparence",
    variant: {
      normal: "Normal",
      shiny: "Shiny",
    },
    // Espace avant les deux-points en français.
    segmentOption: "{{group}} : {{option}}",
    favoriteAdd: "Ajouter {{name}} à la collection",
    favoriteRemove: "Retirer {{name}} de la collection",
    cryPlay: "Écouter le cri de {{name}}",
    cryUnavailable: "Cri de {{name}} indisponible",
    previous: "Pokémon précédent, {{number}}",
    next: "Pokémon suivant, {{number}}",
    about: "À propos",
    weight: "Poids",
    height: "Taille",
    abilities: "Talents",
    hiddenAbility: "{{name}} (caché)",
    noDescription: "Aucune description disponible.",
    baseStats: "Statistiques de base",
    kilograms: "{{value}} kg",
    metres: "{{value}} m",
  },
  stats: {
    hp: { short: "PV", long: "Points de vie" },
    attack: { short: "ATQ", long: "Attaque" },
    defense: { short: "DÉF", long: "Défense" },
    specialAttack: { short: "A.SP", long: "Attaque spéciale" },
    specialDefense: { short: "D.SP", long: "Défense spéciale" },
    speed: { short: "VIT", long: "Vitesse" },
    value: "{{stat}}, {{value}}",
  },
  types: {
    bug: "Insecte",
    dark: "Ténèbres",
    dragon: "Dragon",
    electric: "Électrik",
    fairy: "Fée",
    fighting: "Combat",
    fire: "Feu",
    flying: "Vol",
    ghost: "Spectre",
    grass: "Plante",
    ground: "Sol",
    ice: "Glace",
    normal: "Normal",
    poison: "Poison",
    psychic: "Psy",
    rock: "Roche",
    steel: "Acier",
    water: "Eau",
  } satisfies Record<PokemonType, string>,
} as const;

type ResourceShape<T> = {
  [K in keyof T]: T[K] extends string ? string : ResourceShape<T[K]>;
};
export type LocaleResource = ResourceShape<typeof fr>;

export default fr;
