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

  // util para parse seguro de preço (aceita vírgula)
  const parsePriceSafe = (v: any): number => {
    if (v === null || v === undefined) return NaN;
    const s = String(v).replace(',', '.').replace(/[^\d.-]/g, '');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  };

  useEffect(() => {
    const loadCarrierPreferences = async () => {
      try {
        const storedCarriers = await AsyncStorage.getItem('selectedCarriers');
        if (storedCarriers !== null) {
          setSelectedCarriers(JSON.parse(storedCarriers));
        } else if (results && results.length > 0) {
          const carriers = Array.from(
            new Set(
              results
                .map((item: ShippingRate) => item.company.name)
                .filter((name: string) => typeof name === 'string')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, showUnavailable, selectedCarriers, globalDeviationRange, costTolerance]);

  const calculateDistribution = (deviations: number[]) => {
    const mean = deviations.reduce((sum, val) => sum + val, 0) / deviations.length;
    return deviations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  };

  const isNoDeviation = (item: ShippingRate) =>
    item.deviation.length === 0 && item.deviation.width === 0 && item.deviation.height === 0;

  const applyFilters = () => {
    const base = Array.isArray(results) ? results.slice() : [];

    // Filtrar por disponibilidade
    let filtered = base.filter((item) => {
      if (!showUnavailable) {
        const p = parsePriceSafe(item.price);
        if (!item.price || item.error || Number.isNaN(p)) return false;
      }
      return true;
    });

    // Filtrar por transportadoras (se houver preferências)
    if (selectedCarriers.length > 0) {
      filtered = filtered.filter((item) => selectedCarriers.includes(item.company.name));
    }

    // Filtrar por variação (deviation range)
    filtered = filtered.filter((item) => {
      return (
        item.deviation.length >= globalDeviationRange.length.min &&
        item.deviation.length <= globalDeviationRange.length.max &&
        item.deviation.width >= globalDeviationRange.width.min &&
        item.deviation.width <= globalDeviationRange.width.max &&
        item.deviation.height >= globalDeviationRange.height.min &&
        item.deviation.height <= globalDeviationRange.height.max
      );
    });

    // Ordenação com tolerância de custo e critérios de desempate
    filtered.sort((a: ShippingRate, b: ShippingRate) => {
      const priceA = parsePriceSafe(a.price);
      const priceB = parsePriceSafe(b.price);
      const pA = Number.isNaN(priceA) ? Infinity : priceA;
      const pB = Number.isNaN(priceB) ? Infinity : priceB;

      if (Math.abs(pA - pB) <= costTolerance) {
        if (b.totalSize !== a.totalSize) {
          return b.totalSize - a.totalSize; // prioriza caixas maiores
        } else {
          const distA = calculateDistribution([a.deviation.length, a.deviation.width, a.deviation.height]);
          const distB = calculateDistribution([b.deviation.length, b.deviation.width, b.deviation.height]);
          return distA - distB;
        }
      } else {
        return pA - pB;
      }
    });

    // Agora procurar o melhor entre os sem-variação DENTRO do conjunto filtrado
    const noDevInFiltered = filtered.filter((it) => isNoDeviation(it));
    if (noDevInFiltered.length > 0) {
      // Escolher o mais barato entre os sem-variação
      let cheapest = noDevInFiltered[0];
      let cheapestPrice = parsePriceSafe(cheapest.price);
      if (Number.isNaN(cheapestPrice)) cheapestPrice = Infinity;

      for (const it of noDevInFiltered) {
        const p = parsePriceSafe(it.price);
        if (!Number.isNaN(p) && p < cheapestPrice) {
          cheapest = it;
          cheapestPrice = p;
        }
      }

      // Mover o cheapest sem-variação para o topo, mantendo-o somente uma vez
      filtered = filtered.filter((it) => it !== cheapest);
      filtered.unshift(cheapest);
    }

    setFilteredResults(filtered);
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
    const isUnavailable = !item.price || item.error || Number.isNaN(parsePriceSafe(item.price));
    const thisIsNoDeviation = isNoDeviation(item);

    return (
      <View>
        {/* Mostrar rótulo "Melhor opção sem alterações..." apenas se for o primeiro item e for sem-variação */}
        {index === 0 && thisIsNoDeviation && (
          <Text style={styles.bestResultLabel}>Melhor opção sem alterações nas medidas:</Text>
        )}

        <View
          style={[
            styles.resultContainer,
            isUnavailable && styles.unavailableContainer,
            index === 0 && thisIsNoDeviation && styles.firstResultContainer,
          ]}
        >
          {/* Left: imagem + nome (nome abaixo da imagem) */}
          <View style={styles.leftContainer}>
            {item.company.picture ? (
              <Image source={{ uri: item.company.picture }} style={styles.carrierImage} resizeMode="contain" />
            ) : (
              <View style={styles.carrierPlaceholder}>
                <Text style={styles.placeholderText}>{item.company.name?.slice(0, 2)}</Text>
              </View>
            )}
            <Text numberOfLines={2} style={styles.serviceNameBelowImage}>{item.name}</Text>
          </View>

          {/* Middle: preço e infos compactas */}
          <View style={styles.middleContainer}>
            <Text style={[styles.priceText, isUnavailable && styles.unavailableText]}>
              {item.price && !Number.isNaN(parsePriceSafe(item.price)) ? `R$ ${item.price}` : 'Indisponível'}
            </Text>

            {!isUnavailable && (
              <View style={styles.infoColumn}>
                <Text style={styles.infoText}>
                  {item.deliveryTime != null ? `${item.deliveryTime} dias úteis` : 'Prazo: —'}
                </Text>
                <Text style={styles.infoText}>
                  Volume: {item.volumeGain != null ? `+${item.volumeGain.toFixed(2)}%` : '—'}
                </Text>
              </View>
            )}
          </View>

          {/* Right: caixas de variação, menores e números centralizados */}
          <View style={styles.deviationContainer}>
            {['C', 'L', 'A'].map((label, idx) => {
              const deviationValues = [item.deviation.length, item.deviation.width, item.deviation.height];
              const originalValues = [item.originalDimensions.length, item.originalDimensions.width, item.originalDimensions.height];
              const finalValue = originalValues[idx] + deviationValues[idx];
              return (
                <View key={`${item.id}-${idx}`} style={styles.deviationBoxContainer}>
                  <Text style={styles.deviationLabel}>{label}</Text>
                  <View style={[styles.deviationBox, { backgroundColor: getDeviationColor(deviationValues[idx]) }]}>
                    <Text style={styles.deviationBoxText}>
                      {deviationValues[idx] >= 0 ? `+${deviationValues[idx]}` : `${deviationValues[idx]}`}
                    </Text>
                  </View>
                  <Text style={styles.deviationValue}>{finalValue} cm</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Após o primeiro item (se ele for o sem-variação), exibir o cabeçalho "Resultados simulados" */}
        {index === 0 && thisIsNoDeviation && (
          <View style={styles.simulatedHeader}>
            <Text style={styles.simulatedHeaderText}>Resultados simulados</Text>
          </View>
        )}
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

  const getCarriers = (): string[] => {
    return Array.from(
      new Set(
        (results ?? [])
          .map((item: ShippingRate) => item.company.name)
          .filter((name: string) => typeof name === 'string')
      )
    ) as string[];
  };

  return (
    <View style={styles.container}>
      {/* Linha superior: Tolerância - esquerdo | Botão Filtrar - direito */}
      <View style={styles.topRow}>
        <Text style={styles.toleranceText}>Tolerância: R$ {costTolerance.toFixed(2)}</Text>
        <TouchableOpacity style={styles.filterButton} onPress={openFilterModal}>
          <Text style={styles.filterButtonText}>Filtrar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredResults}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ padding: 12 }}>Nenhum resultado encontrado.</Text>}
      />

      <Modal visible={isFilterModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Filtros</Text>
          <ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.filterLabel}>Mostrar Indisponíveis</Text>
              <Switch value={showUnavailable} onValueChange={(value) => setShowUnavailable(value)} />
            </View>

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
                      setSelectedCarriers(selectedCarriers.filter((name) => name !== carrierName));
                    }
                  }}
                />
                <Text style={styles.carrierFilterText}>{carrierName}</Text>
              </View>
            ))}

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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <Button title="Aplicar Filtros" onPress={applyModalFilters} />
            <Button title="Cancelar" onPress={closeFilterModal} color="#888" />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#fff' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  toleranceText: { fontSize: 14, color: '#555' },
  filterButton: { backgroundColor: '#007bff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  filterButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  resultContainer: {
    flexDirection: 'row',
    padding: 8, // mais fino
    marginVertical: 2,
    borderWidth: 1,
    borderColor: '#878686',
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  firstResultContainer: {
    backgroundColor: '#f0fbff',
    borderColor: '#bfe9ff',
  },
  unavailableContainer: { opacity: 0.6 },

  leftContainer: { width: 72, alignItems: 'center', justifyContent: 'flex-start', marginRight: 8 },
  carrierImage: { width: 40, height: 40, marginBottom: 6 },
  carrierPlaceholder: { width: 40, height: 40, borderRadius: 6, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  placeholderText: { color: '#666', fontSize: 12, fontWeight: '700' },
  serviceNameBelowImage: { fontSize: 12, color: '#333', textAlign: 'center', lineHeight: 14 },

  middleContainer: { flex: 1, paddingRight: 6 },
  priceText: { fontSize: 15, color: '#007a3d', fontWeight: '700', marginBottom: 4 },
  unavailableText: { color: 'gray' },
  infoColumn: { },
  infoText: { fontSize: 11, color: '#555' },

  deviationContainer: { flexDirection: 'row', alignItems: 'center' },
  deviationBoxContainer: { alignItems: 'center', marginHorizontal: 4 },
  deviationLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  deviationBox: {
    width: 36,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviationBoxText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  deviationValue: { fontSize: 11, marginTop: 4, color: '#444', textAlign: 'center' },

  modalContainer: { flex: 1, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  filterLabel: { fontSize: 14, marginVertical: 8 },
  input: { height: 40, borderColor: '#ccc', borderWidth: 1, borderRadius: 5, paddingHorizontal: 10, marginBottom: 10, backgroundColor: '#fff' },
  carrierFilterItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  carrierFilterText: { marginLeft: 10, fontSize: 14 },

  bestResultLabel: { fontSize: 14, fontWeight: '700', marginTop: 6, marginBottom: 6, color: '#333' },

  simulatedHeader: { paddingVertical: 6, paddingHorizontal: 8, backgroundColor: '#f7f7f7', borderRadius: 6, marginTop: 8, marginBottom: 6 },
  simulatedHeaderText: { fontWeight: '700', color: '#333', fontSize: 13 },
});

export default ShippingResults;
