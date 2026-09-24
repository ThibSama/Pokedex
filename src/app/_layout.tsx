import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { FavoritesProvider } from '@/favorites/FavoritesProvider';
import { hydrateLanguage } from '@/i18n';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { loadThemeMode } from '@/theme/themeStorage';
import type { ThemeMode } from '@/theme/tokens';
import { POPPINS_FONTS } from '@/theme/typography';

// Le splash reste affiché tant que Poppins, la langue et le thème stockés ne sont
// pas appliqués, pour éviter un premier rendu dans la mauvaise police/langue/thème.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Sans gravité : le splash se masquera de lui-même.
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts(POPPINS_FONTS);
  // i18n démarre sur la langue de l'appareil ; on attend un éventuel choix stocké.
  // Pas d'effets en rendu statique web : le HTML exporté reste une coquille vide.
  const [languageReady, setLanguageReady] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode | null>(null);
  const ready = fontsLoaded && languageReady && themeMode !== null;

  useEffect(() => {
    hydrateLanguage()
      .catch(() => {
        // On garde la langue de l'appareil : le stockage ne doit jamais bloquer le splash.
      })
      .finally(() => setLanguageReady(true));
    // Ne rejette jamais : toute erreur de stockage donne déjà Light.
    loadThemeMode().then(setThemeMode);
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {
        // Sans gravité : le splash a déjà disparu.
      });
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider initialMode={themeMode}>
      <FavoritesProvider>
        <AppShell>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="pokedex" />
            <Stack.Screen name="collection" />
            <Stack.Screen name="pokemon/[id]" />
          </Stack>
        </AppShell>
      </FavoritesProvider>
    </ThemeProvider>
  );
}
