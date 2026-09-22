import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

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
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Pokédex' }} />
        {/* Both screens paint their own Figma header area, back affordance included. */}
        <Stack.Screen name="pokedex" options={{ headerShown: false }} />
        <Stack.Screen name="collection" options={{ title: 'Collection' }} />
        <Stack.Screen name="pokemon/[id]" options={{ headerShown: false }} />
      </Stack>
    </FavoritesProvider>
  );
}
