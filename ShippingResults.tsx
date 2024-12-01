import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { ShippingRate } from './types';

const ShippingResults = ({ route }: { route: any }) => {
  const { results }: { results: ShippingRate[] } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resultados de Frete</Text>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.resultContainer}>
            <Text>{item.company.name} - {item.name}</Text>
            <Text>{item.price ? `Preço: R$ ${item.price}` : `Erro: ${item.error}`}</Text>
            <Text style={styles.variation}>Variação: {item.variation}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  resultContainer: { padding: 10, marginVertical: 5, borderWidth: 1, borderColor: '#ccc' },
  variation: { color: 'blue' },
});

export default ShippingResults;
