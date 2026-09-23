import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { FavoritesProvider } from '@/favorites/FavoritesProvider';
import { hydrateLanguage } from '@/i18n';
import { POPPINS_FONTS } from '@/theme/typography';

// Keep the splash up while Poppins loads and the stored language is applied, so
// no screen paints in the system font or in the wrong language first.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Non-fatal: the splash simply hides on its own schedule.
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts(POPPINS_FONTS);
  // i18n already runs on the device language; this waits for a stored choice
  // to override it. Effects never run during web static rendering, so the
  // exported HTML is an empty shell too rather than a page in a fixed language.
  const [languageReady, setLanguageReady] = useState(false);
  const ready = fontsLoaded && languageReady;

  useEffect(() => {
    hydrateLanguage()
      .catch(() => {
        // Keep the device language: a storage problem must never hold the splash.
      })
      .finally(() => setLanguageReady(true));
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {
        // Non-fatal: the splash is already gone.
      });
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <FavoritesProvider>
      {/* One width cap for every route: on a wide browser the whole navigator
          is centered in a phone-sized column; on native it is a no-op. */}
      <AppShell>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Every screen paints its own Figma header area, back affordance included. */}
          <Stack.Screen name="index" />
          <Stack.Screen name="pokedex" />
          <Stack.Screen name="collection" />
          <Stack.Screen name="pokemon/[id]" />
        </Stack>
      </AppShell>
    </FavoritesProvider>
  );
}
