import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function PokedexScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pokédex</Text>
      <Text style={styles.placeholder}>Pokémon list coming soon.</Text>
      {/* Temporary navigation action until the list exists. */}
      <Link href="/pokemon/197" style={styles.link}>
        Open #197 (temporary)
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  placeholder: {
    fontSize: 16,
    color: '#6b7280',
  },
  link: {
    fontSize: 18,
    color: '#1d4ed8',
    padding: 8,
  },
});
