# Pokédex

Application mobile Pokédex construite avec Expo et React Native. Elle couvre les **251 Pokémon de Kanto et Johto (n° 001 à 251)**, est pensée d'abord pour le téléphone et récupère ses données depuis [PokéAPI](https://pokeapi.co/). Elle tourne sur iOS, Android et le web (dans une colonne centrée de 480 px au maximum).

## Fonctionnalités

| Écran | Ce qu'il propose |
| --- | --- |
| **Accueil** | Un Pokémon mis en avant, tiré au hasard dans la Collection et affiché dans la variante enregistrée. Si la Collection est vide, le Pokémon est tiré au hasard parmi les 251. Deux raccourcis mènent au Pokédex et à la Collection, avec leurs compteurs. |
| **Pokédex** | Grille de 3 colonnes (moins sur un écran très étroit), recherche, tri par numéro ou par nom, filtre par type. |
| **Fiche Pokémon** | Illustration officielle, types, taille, poids, talents, description et les six statistiques de base avec des barres animées. Bascule Normal / Shiny, cri du Pokémon, ajout ou retrait des favoris. |
| **Collection** | Les favoris, dans l'ordre d'ajout, chacun affiché dans la variante (Normal ou Shiny) choisie au moment de l'ajout. |

Sur tous les écrans :

- **FR / EN** : l'interface et les données Pokémon (noms, talents, descriptions) sont traduites. Au premier lancement, l'app suit la langue de l'appareil si c'est le français ou l'anglais, sinon le français.
- **Thème clair / sombre** : se change depuis l'en-tête. Le thème clair est utilisé par défaut, l'app ne suit pas le thème du système.
- **Identité visuelle** : icône et écran de démarrage (splash) personnalisés, police Poppins.

### Recherche, filtre et réseau

- La recherche, le tri et le filtre par type ne portent **que sur les Pokémon déjà chargés en mémoire**. Taper une recherche ne déclenche **jamais** de requête à PokéAPI.
- La recherche compare le nom français, le nom anglais et le nom technique PokéAPI quelle que soit la langue de l'interface. Elle ignore les majuscules et les accents (« evoli » trouve Évoli) et accepte aussi un numéro (`25`, `#025`).
- Le Pokédex se remplit **progressivement en arrière-plan** : il charge des pages de 30 Pokémon, une seule à la fois, jusqu'au n° 251. Un Pokémon lointain devient donc trouvable après quelques secondes. Une barre en bas de la liste indique la progression. En cas d'erreur, le chargement s'arrête et un bouton « Réessayer » s'affiche.
- La fiche charge ses propres données (`/pokemon`, `/pokemon-species`, `/ability`). Les noms de talents sont gardés en cache pendant la session. Changer de langue ou de variante ne relance aucune requête.
- Les cris sont des fichiers MP3 de Pokémon Showdown. PokéAPI ne fournit que des fichiers OGG, qu'iOS ne sait pas lire. Le volume est volontairement bas.

## Stack technique

| Élément | Version (`package.json`) |
| --- | --- |
| Expo SDK | `~57.0.24` |
| Expo Router (routage par fichiers, routes typées) | `~57.0.22` |
| React / React Native | `19.2.3` / `0.86.3` |
| TypeScript | `~6.0.3` |
| React Native Reanimated | `4.5.1` |
| i18next / react-i18next | `^26.4.2` / `^17.0.15` |
| AsyncStorage | `2.2.0` |
| expo-audio · expo-image · expo-localization | `~57.0.5` · `~57.0.5` · `~57.0.2` |

Le React Compiler est activé dans `app.json`. Le lint utilise ESLint 9 avec `eslint-config-expo`.

## Architecture

```text
src/
├── app/                 Routes Expo Router (chaque fichier est un écran)
│   ├── _layout.tsx      Layout racine : providers, polices, langue et thème lus avant la fin du splash
│   ├── index.tsx        Accueil
│   ├── pokedex.tsx      Liste, recherche, tri, filtre, chargement progressif
│   ├── collection.tsx   Favoris
│   └── pokemon/[id].tsx Fiche détaillée
├── api/                 Client PokéAPI (normalisation des réponses, n° 1–251) et URL des cris
├── components/          Interface partagée : cadre, contrôles, cartes, barres de stats, badges de type
├── favorites/           Contexte React des favoris
├── storage/             Persistance des favoris (AsyncStorage)
├── i18n/                i18next, textes FR/EN, stockage de la langue
├── theme/               Palettes clair/sombre, ThemeProvider, calculs de contraste, typographie
├── types/               Types du domaine Pokémon
└── utils/               Recherche/tri/filtre, grille, helpers d'accessibilité
docs/ai-usage.jsonl      Journal des tâches réalisées avec l'aide de l'IA
```

Les données de PokéAPI sont transformées dans `src/api/pokeApi.ts` avant d'être utilisées, et elles ne sont jamais enregistrées sur l'appareil.

## Données enregistrées sur l'appareil

L'app enregistre seulement les choix de l'utilisateur, avec AsyncStorage :

| Clé | Contenu |
| --- | --- |
| `pokedex:favorites:v2` | Liste ordonnée de `{ id, variant }`. Les données de l'ancien format `v1` (liste d'identifiants) sont converties automatiquement. |
| `pokedex:language:v1` | `fr` ou `en` |
| `pokedex:theme:v1` | `light` ou `dark` |

Si une valeur manque ou est illisible, l'app revient au réglage par défaut au lieu de planter. La langue et le thème enregistrés sont appliqués avant la disparition du splash, donc le premier écran s'affiche directement dans le bon thème et la bonne langue.

## Accessibilité et qualité

- **Contraste** : `src/theme/contrast.ts` calcule les ratios WCAG 2.x. La couleur du texte et des icônes posés sur une couleur de type est choisie pour viser le niveau AA (4,5:1 pour le texte courant, 3:1 pour le grand texte et les éléments graphiques).
- **Sémantique** : rôles et états ARIA (`aria-pressed` sur le web, `selected` ou `checked` sur mobile), titres de section, icônes décoratives masquées aux lecteurs d'écran, une seule annonce vocale par ligne de statistique.
- **Navigation** : sur le web, un contour visible s'affiche autour de l'élément sélectionné au clavier. Sur mobile, les zones tactiles des petits boutons sont agrandies (`hitSlop`), la plupart jusqu'à 44 px.
- **Animations** : les barres de statistiques sont animées avec Reanimated. Le fondu du changement de thème est coupé quand l'option « Réduire les animations » du système est activée.

**Limites de la vérification** : le projet n'a pas de tests automatisés. La qualité est contrôlée avec ESLint et TypeScript. L'accessibilité a été travaillée pour viser le niveau WCAG AA, mais elle n'a fait l'objet d'aucun audit ni d'aucune certification.

## Installation et lancement

Prérequis : Node.js et npm. Pour tester sur téléphone : Expo Go ou un simulateur/émulateur.

```bash
npm install
npx expo start        # serveur de développement
npm run android       # ouvre directement sur Android
npm run ios           # ouvre directement sur iOS
npm run web           # ouvre directement dans le navigateur
```

## Vérifications

```bash
npm run lint          # ESLint (expo lint)
npx tsc --noEmit      # vérification des types
npx expo-doctor       # vérifie la configuration et les dépendances Expo
```

## Traçabilité de l'IA

Les tâches de développement réalisées avec un assistant IA sont consignées dans [`docs/ai-usage.jsonl`](docs/ai-usage.jsonl), une entrée JSON par ligne : prompt, résumé, décisions acceptées ou rejetées, fichiers modifiés. Tous les commits ne viennent pas de l'IA : certaines modifications ont été faites à la main et ne figurent pas dans ce journal.

## Périmètre et limites

- Seuls les Pokémon n° 001 à 251 sont couverts. Les formes alternatives et les générations suivantes ne le sont pas.
- Une connexion Internet est nécessaire : les données viennent de PokéAPI et les cris de Pokémon Showdown. Les données PokéAPI ne sont pas enregistrées sur l'appareil, donc la liste est rechargée à chaque lancement.
- Le projet n'a pas été publié sur les stores et n'a pas de déploiement en production.

## Licence

MIT, voir [`LICENSE`](LICENSE).
