import { StyleSheet, Text, View } from 'react-native';

export default function CollectionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Collection</Text>
      <Text style={styles.placeholder}>Your collection coming soon.</Text>
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
});
