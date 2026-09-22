import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AppShell } from '@/components/AppShell';
import { FavoritesProvider } from '@/favorites/FavoritesProvider';
import { POPPINS_FONTS } from '@/theme/typography';

// Keep the splash up while Poppins loads, so no screen paints in the system font first.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Non-fatal: the splash simply hides on its own schedule.
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts(POPPINS_FONTS);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        // Non-fatal: the splash is already gone.
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
