// ShippingResults.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  TextInput,
  Button,
} from 'react-native';
import { ShippingRate } from './types';

const ShippingResults = ({ route }: { route: any }) => {
  const { results, fromCache }: { results: ShippingRate[]; fromCache: boolean } = route.params;
  const [filteredResults, setFilteredResults] = useState<ShippingRate[]>([]);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [maxDeviation, setMaxDeviation] = useState(3);
  const [minDeviation, setMinDeviation] = useState(-3);

  useEffect(() => {
    if (fromCache) {
      Alert.alert('Aviso', 'Os dados foram carregados do cache.');
    }
    applyFilters();
  }, [results, showUnavailable, selectedCarriers, minDeviation, maxDeviation]);

  const applyFilters = () => {
    let filtered = results;

    // Filtrar por disponibilidade
    if (!showUnavailable) {
      filtered = filtered.filter((item) => item.price && !item.error);
    }

    // Filtrar por transportadoras
    if (selectedCarriers.length > 0) {
      filtered = filtered.filter((item) => selectedCarriers.includes(item.company.name));
    }

    // Filtrar por variação
    filtered = filtered.filter((item) => {
      const deviations = [item.deviation.length, item.deviation.width, item.deviation.height];
      return deviations.every((dev) => dev >= minDeviation && dev <= maxDeviation);
    });

    // Separar o resultado sem desvios (0,0,0)
    const noDeviationResults = filtered.filter(
      (item) =>
        item.deviation.length === 0 && item.deviation.width === 0 && item.deviation.height === 0
    );

    // Ordenar os resultados sem desvio pelo menor preço
    noDeviationResults.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

    const bestNoDeviationResult = noDeviationResults.length > 0 ? [noDeviationResults[0]] : [];

    // Remover o melhor resultado sem desvio da lista geral
    filtered = filtered.filter(
      (item) =>
        !(
          item.deviation.length === 0 &&
          item.deviation.width === 0 &&
          item.deviation.height === 0 &&
          item.company.name === bestNoDeviationResult[0]?.company.name &&
          item.name === bestNoDeviationResult[0]?.name
        )
    );

    // Continuar com a ordenação atual para os demais resultados
    filtered.sort((a, b) => {
      const priceA = parseFloat(a.price);
      const priceB = parseFloat(b.price);
      if (priceA !== priceB) {
        return priceA - priceB;
      } else {
        return b.totalSize - a.totalSize;
      }
    });

    // Combinar o melhor resultado sem desvio com os demais
    setFilteredResults([...bestNoDeviationResult, ...filtered]);
  };

  const getDeviationColor = (value: number) => {
    // Mapear -3 a +3 para uma escala de vermelho a verde
    const colors = ['#ff0000', '#ff6666', '#ffcccc', '#cccccc', '#ccffcc', '#66ff66', '#00ff00'];
    return colors[value + 3];
  };

  const renderItem = ({ item, index }: { item: ShippingRate; index: number }) => {
    const isUnavailable = !item.price || item.error;

    return (
      <View>
        {index === 0 && (
          <Text style={styles.bestResultLabel}>
            Melhor opção sem alterações nas medidas:
          </Text>
        )}
        <View
          style={[
            styles.resultContainer,
            isUnavailable && styles.unavailableContainer,
            index === 0 && styles.firstResultContainer,
          ]}
        >
          <View style={styles.leftContainer}>
            {item.company.picture && (
              <Image
                source={{ uri: item.company.picture }}
                style={styles.carrierImage}
                resizeMode="contain"
              />
            )}
          </View>
          <View style={styles.middleContainer}>
            <Text style={[styles.serviceName, isUnavailable && styles.unavailableText]}>
              {item.name}
            </Text>
            <Text style={[styles.priceText, isUnavailable && styles.unavailableText]}>
              {item.price ? `R$ ${item.price}` : `Indisponível`}
            </Text>
          </View>
          <View style={styles.deviationContainer}>
            {['C', 'L', 'A'].map((label, index) => {
              const deviationValues = [
                item.deviation.length,
                item.deviation.width,
                item.deviation.height,
              ];
              const originalValues = [
                item.originalDimensions.length,
                item.originalDimensions.width,
                item.originalDimensions.height,
              ];
              const finalValue = originalValues[index] + deviationValues[index];
              return (
                <View key={index} style={styles.deviationBoxContainer}>
                  <Text style={styles.deviationLabel}>{label}</Text>
                  <Text
                    style={[
                      styles.deviationBox,
                      { backgroundColor: getDeviationColor(deviationValues[index]) },
                    ]}
                  >
                    {deviationValues[index] >= 0
                      ? `+${deviationValues[index]}`
                      : `${deviationValues[index]}`}
                  </Text>
                  <Text style={styles.deviationValue}>{finalValue} cm</Text>
                </View>
              );
            })}
          </View>
        </View>
        {index === 0 && <View style={styles.separator} />}
      </View>
    );
  };

  const openFilterModal = () => {
    setIsFilterModalVisible(true);
  };

  const closeFilterModal = () => {
    setIsFilterModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resultados de Frete</Text>
      <TouchableOpacity style={styles.filterButton} onPress={openFilterModal}>
        <Text style={styles.filterButtonText}>Filtrar</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredResults}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        ListEmptyComponent={<Text>Nenhum resultado encontrado.</Text>}
      />

      {/* Modal de Filtros */}
      <Modal visible={isFilterModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Filtros</Text>
          <ScrollView>
            <Text style={styles.filterLabel}>Mostrar Indisponíveis</Text>
            <Switch
              value={showUnavailable}
              onValueChange={(value) => setShowUnavailable(value)}
            />

            <Text style={styles.filterLabel}>Variação Máxima</Text>
            <TextInput
              style={styles.filterInput}
              keyboardType="numeric"
              value={maxDeviation.toString()}
              onChangeText={(text) => setMaxDeviation(parseInt(text) || 0)}
            />

            <Text style={styles.filterLabel}>Variação Mínima</Text>
            <TextInput
              style={styles.filterInput}
              keyboardType="numeric"
              value={minDeviation.toString()}
              onChangeText={(text) => setMinDeviation(parseInt(text) || 0)}
            />

            {/* Filtros de Transportadoras */}
            <Text style={styles.filterLabel}>Transportadoras</Text>
            {Array.from(new Set(results.map((item) => item.company.name))).map(
              (carrierName) => (
                <View key={carrierName} style={styles.carrierFilterItem}>
                  <Switch
                    value={selectedCarriers.includes(carrierName)}
                    onValueChange={(value) => {
                      if (value) {
                        setSelectedCarriers([...selectedCarriers, carrierName]);
                      } else {
                        setSelectedCarriers(
                          selectedCarriers.filter((name) => name !== carrierName)
                        );
                      }
                    }}
                  />
                  <Text style={styles.carrierFilterText}>{carrierName}</Text>
                </View>
              )
            )}
          </ScrollView>
          <Button title="Aplicar Filtros" onPress={closeFilterModal} />
        </View>
      </Modal>
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
  },
  firstResultContainer: {
    backgroundColor: '#e6f7ff',
    borderColor: '#1890ff',
  },
  unavailableContainer: {
    opacity: 0.5,
  },
  leftContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  carrierImage: {
    width: 50,
    height: 50,
  },
  middleContainer: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  priceText: {
    fontSize: 14,
    color: 'green',
    fontWeight: 'bold',
  },
  unavailableText: {
    color: 'gray',
  },
  deviationContainer: {
    flexDirection: 'row',
  },
  deviationBoxContainer: {
    alignItems: 'center',
    marginHorizontal: 5,
  },
  deviationLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  deviationBox: {
    width: 40,
    height: 30,
    textAlign: 'center',
    lineHeight: 30,
    borderRadius: 5,
    fontWeight: 'bold',
    color: '#fff',
  },
  deviationValue: {
    fontSize: 12,
    marginTop: 2,
  },
  filterButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    marginVertical: 10,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
  },
  carrierFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  carrierFilterText: {
    marginLeft: 10,
    fontSize: 16,
  },
  bestResultLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: '#333',
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 10,
  },
});

export default ShippingResults;
