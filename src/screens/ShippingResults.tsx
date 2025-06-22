// src/screens/ShippingResults.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Button,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RangeSlider from '../components/RangeSlider';
import { ShippingRate, DeviationRange } from '../types/types';

const ShippingResults = ({ route }: any) => {
  const { results, deviationRange: initialDeviationRange, costTolerance: initialCostTolerance } = route.params;

  const [filteredResults, setFilteredResults] = useState<ShippingRate[]>([]);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  
  const [globalDeviationRange, setGlobalDeviationRange] = useState<DeviationRange>(initialDeviationRange);
  const [costTolerance, setCostTolerance] = useState<number>(initialCostTolerance);
  
  const [modalDeviationRange, setModalDeviationRange] = useState<DeviationRange>(initialDeviationRange);
  const [modalCostTolerance, setModalCostTolerance] = useState<string>(initialCostTolerance.toString());

  useEffect(() => {
    const loadCarrierPreferences = async () => {
      try {
        const storedCarriers = await AsyncStorage.getItem('selectedCarriers');
        if (storedCarriers !== null) {
          setSelectedCarriers(JSON.parse(storedCarriers));
        } else if (results && results.length > 0) {
          // Corrigir: adicionar tipagem explícita
          const carriers = Array.from(
            new Set(
              results
                .map((item: ShippingRate) => item.company.name)
                .filter((name: any) => typeof name === 'string') // Correção aqui
            )
          ) as string[];
          setSelectedCarriers(carriers);
        }
      } catch (error) {
        console.error('Error loading selected carriers:', error);
      }
    };
    loadCarrierPreferences();
  }, [results]);

  useEffect(() => {
    applyFilters();
  }, [results, showUnavailable, selectedCarriers, globalDeviationRange, costTolerance]);

  const applyFilters = () => {
    let filtered = results;

    if (!showUnavailable) {
      filtered = filtered.filter((item: ShippingRate) => item.price && !item.error);
    }

    if (selectedCarriers.length > 0) {
      filtered = filtered.filter((item: ShippingRate) => 
        selectedCarriers.includes(item.company.name)
      );
    }

    filtered = filtered.filter((item: ShippingRate) => {
      return (
        item.deviation.length >= globalDeviationRange.length.min &&
        item.deviation.length <= globalDeviationRange.length.max &&
        item.deviation.width >= globalDeviationRange.width.min &&
        item.deviation.width <= globalDeviationRange.width.max &&
        item.deviation.height >= globalDeviationRange.height.min &&
        item.deviation.height <= globalDeviationRange.height.max
      );
    });

    const noDeviationResults = filtered.filter(
      (item: ShippingRate) =>
        item.deviation.length === 0 &&
        item.deviation.width === 0 &&
        item.deviation.height === 0
    );

    noDeviationResults.sort((a: ShippingRate, b: ShippingRate) => parseFloat(a.price) - parseFloat(b.price));

    const bestNoDeviationResult = noDeviationResults.length > 0 ? [noDeviationResults[0]] : [];

    filtered = filtered.filter(
      (item: ShippingRate) =>
        !(
          item.deviation.length === 0 &&
          item.deviation.width === 0 &&
          item.deviation.height === 0 &&
          item.company.name === bestNoDeviationResult[0]?.company.name &&
          item.name === bestNoDeviationResult[0]?.name
        )
    );

    filtered.sort((a: ShippingRate, b: ShippingRate) => {
      const priceA = parseFloat(a.price);
      const priceB = parseFloat(b.price);
      
      if (Math.abs(priceA - priceB) <= costTolerance) {
        return b.totalSize - a.totalSize;
      } else {
        return priceA - priceB;
      }
    });

    setFilteredResults([...bestNoDeviationResult, ...filtered]);
  };

  const getDeviationColor = (variation: number): string => {
    if (variation === 0) return '#808080';
    
    const ratio = variation / 5;
    const r = Math.round(128 - 128 * ratio);
    const g = Math.round(128 + 127 * ratio);
    const b = Math.round(128 - 128 * ratio);
    return `rgb(${r}, ${g}, ${b})`;
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
            {['C', 'L', 'A'].map((label, idx) => {
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
              const finalValue = originalValues[idx] + deviationValues[idx];
              return (
                <View key={`${item.id}-${idx}`} style={styles.deviationBoxContainer}>
                  <Text style={styles.deviationLabel}>{label}</Text>
                  <Text
                    style={[
                      styles.deviationBox,
                      { backgroundColor: getDeviationColor(deviationValues[idx]) },
                    ]}
                  >
                    {deviationValues[idx] >= 0
                      ? `+${deviationValues[idx]}`
                      : `${deviationValues[idx]}`}
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
    setModalDeviationRange(globalDeviationRange);
    setModalCostTolerance(costTolerance.toString());
    setIsFilterModalVisible(true);
  };

  const applyModalFilters = async () => {
    setGlobalDeviationRange(modalDeviationRange);
    setCostTolerance(parseFloat(modalCostTolerance) || 1);
    setIsFilterModalVisible(false);
    try {
      await AsyncStorage.setItem('selectedCarriers', JSON.stringify(selectedCarriers));
    } catch (error) {
      console.error('Error saving selected carriers:', error);
    }
  };

  const closeFilterModal = () => {
    setIsFilterModalVisible(false);
  };

  const updateModalDeviationRange = (dimension: keyof DeviationRange, value: 'min' | 'max', newValue: number) => {
    setModalDeviationRange(prev => ({
      ...prev,
      [dimension]: {
        ...prev[dimension],
        [value]: newValue
      }
    }));
  };

  // Extrair transportadoras de forma tipada
  const getCarriers = (): string[] => {
    return Array.from(
      new Set(
        results
          .map((item: ShippingRate) => item.company.name)
          .filter((name: any) => typeof name === 'string') // Correção aqui
      )
    ) as string[];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resultados de Frete</Text>
      <Text style={styles.toleranceText}>Tolerância: R$ {costTolerance.toFixed(2)}</Text>
      
      <TouchableOpacity style={styles.filterButton} onPress={openFilterModal}>
        <Text style={styles.filterButtonText}>Filtrar</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredResults}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        ListEmptyComponent={<Text>Nenhum resultado encontrado.</Text>}
      />

      <Modal visible={isFilterModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Filtros</Text>
          <ScrollView>
            <Text style={styles.filterLabel}>Mostrar Indisponíveis</Text>
            <Switch
              value={showUnavailable}
              onValueChange={(value) => setShowUnavailable(value)}
            />

            <Text style={styles.filterLabel}>Tolerância de Custo (R$)</Text>
            <TextInput
              style={styles.input}
              value={modalCostTolerance}
              onChangeText={setModalCostTolerance}
              keyboardType="numeric"
              placeholder="Ex: 1.00"
            />

            <Text style={styles.filterLabel}>Transportadoras</Text>
            {getCarriers().map((carrierName: string) => (
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
              ))
            }

            <Text style={styles.filterLabel}>Variação de Comprimento</Text>
            <RangeSlider
              values={[modalDeviationRange.length.min, modalDeviationRange.length.max]}
              min={0}
              max={5}
              onValuesChange={(values) => {
                updateModalDeviationRange('length', 'min', values[0]);
                updateModalDeviationRange('length', 'max', values[1]);
              }}
            />

            <Text style={styles.filterLabel}>Variação de Largura</Text>
            <RangeSlider
              values={[modalDeviationRange.width.min, modalDeviationRange.width.max]}
              min={0}
              max={5}
              onValuesChange={(values) => {
                updateModalDeviationRange('width', 'min', values[0]);
                updateModalDeviationRange('width', 'max', values[1]);
              }}
            />

            <Text style={styles.filterLabel}>Variação de Altura</Text>
            <RangeSlider
              values={[modalDeviationRange.height.min, modalDeviationRange.height.max]}
              min={0}
              max={5}
              onValuesChange={(values) => {
                updateModalDeviationRange('height', 'min', values[0]);
                updateModalDeviationRange('height', 'max', values[1]);
              }}
            />
          </ScrollView>
          <Button title="Aplicar Filtros" onPress={applyModalFilters} />
          <Button title="Cancelar" onPress={closeFilterModal} color="#888" />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  toleranceText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#555',
    textAlign: 'center',
  },
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
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
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