import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Pokédex' }} />
      <Stack.Screen name="pokedex" options={{ title: 'Pokédex' }} />
      <Stack.Screen name="collection" options={{ title: 'Collection' }} />
      <Stack.Screen name="pokemon/[id]" options={{ title: 'Pokémon' }} />
    </Stack>
  );
}
