// ShippingResults.tsx

import React from 'react';
import { View, Text, FlatList, StyleSheet, Image } from 'react-native';
import { ShippingRate } from './types';

const ShippingResults = ({ route }: { route: any }) => {
  const { results }: { results: ShippingRate[] } = route.params;

  const renderItem = ({ item }: { item: ShippingRate }) => {
    const isUnavailable = !item.price || item.error;

    return (
      <View style={[styles.resultContainer, isUnavailable && styles.unavailableContainer]}>
        <View style={styles.carrierInfo}>
          {item.company.picture && (
            <Image
              source={{ uri: item.company.picture }}
              style={styles.carrierImage}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.carrierName, isUnavailable && styles.unavailableText]}>
            {item.company.name} - {item.name}
          </Text>
        </View>
        <Text style={[styles.priceText, isUnavailable && styles.unavailableText]}>
          {item.price ? `R$ ${item.price}` : `Indisponível`}
        </Text>
        <View style={styles.deviationContainer}>
          <Text style={styles.deviationBox}>{item.deviation.length >= 0 ? `+${item.deviation.length}` : `${item.deviation.length}`}</Text>
          <Text style={styles.deviationBox}>{item.deviation.width >= 0 ? `+${item.deviation.width}` : `${item.deviation.width}`}</Text>
          <Text style={styles.deviationBox}>{item.deviation.height >= 0 ? `+${item.deviation.height}` : `${item.deviation.height}`}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resultados de Frete</Text>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id + JSON.stringify(item.deviation)}
        renderItem={renderItem}
        ListEmptyComponent={<Text>Nenhum resultado encontrado.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  resultContainer: {
    flexDirection: 'row',
    padding: 10,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unavailableContainer: {
    opacity: 0.5,
  },
  carrierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  carrierImage: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  carrierName: {
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  priceText: {
    fontSize: 14,
    color: 'green',
    marginRight: 10,
  },
  unavailableText: {
    color: 'gray',
  },
  deviationContainer: {
    flexDirection: 'row',
  },
  deviationBox: {
    width: 30,
    height: 30,
    backgroundColor: '#e0e0e0',
    textAlign: 'center',
    lineHeight: 30,
    marginLeft: 5,
    borderRadius: 5,
    fontWeight: 'bold',
  },
});

export default ShippingResults;
