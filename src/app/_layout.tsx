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

// Keep the splash up while Poppins loads and the stored language and theme are
// applied, so no screen paints in the system font, the wrong language or the
// wrong theme first.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Non-fatal: the splash simply hides on its own schedule.
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts(POPPINS_FONTS);
  // i18n already runs on the device language; this waits for a stored choice
  // to override it. Effects never run during web static rendering, so the
  // exported HTML is an empty shell too rather than a page in a fixed language.
  const [languageReady, setLanguageReady] = useState(false);
  // Null until the stored theme is read; a missing or unreadable one is Light.
  const [themeMode, setThemeMode] = useState<ThemeMode | null>(null);
  const ready = fontsLoaded && languageReady && themeMode !== null;

  useEffect(() => {
    hydrateLanguage()
      .catch(() => {
        // Keep the device language: a storage problem must never hold the splash.
      })
      .finally(() => setLanguageReady(true));
    // Never rejects: any storage problem already resolves to Light.
    loadThemeMode().then(setThemeMode);
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
    <ThemeProvider initialMode={themeMode}>
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
    </ThemeProvider>
  );
}
