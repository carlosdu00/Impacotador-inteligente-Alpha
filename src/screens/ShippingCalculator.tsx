// src/screens/ShippingCalculator.tsx

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
  Modal,
  FlatList,
  Switch,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RangeSlider from '../components/RangeSlider';
import { fetchShippingRates, computeBaldeacaoComparisons, ensureOperationalCostsInDb } from '../utils/utils';
import { useNavigation, useRoute } from '@react-navigation/native';
import firebase from '../services/firebaseConfig';
import { DeviationRange } from '../types/types';

const screenWidth = Dimensions.get('window').width;

type NavigationProps = {
  navigate: (screen: string, params?: any) => void;
};

type Personalization = {
  operationalCosts?: Record<string, number>;
  baldeacoes?: string[];
  packagingProtectionCm?: { standard?: number; sensitive?: number };
};

const defaultDeviationRange: DeviationRange = {
  length: { min: 0, max: 5 },
  width: { min: 0, max: 5 },
  height: { min: 0, max: 5 },
};

const ShippingCalculator = () => {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<any>();

  const [originCep, setOriginCep] = useState('');
  const [destinationCep, setDestinationCep] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [insuranceValue, setInsuranceValue] = useState('');
  const [costTolerance, setCostTolerance] = useState('1');
  const [deviationRange, setDeviationRange] = useState<DeviationRange>(defaultDeviationRange);

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedRequests, setCompletedRequests] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);

  const [personalization, setPersonalization] = useState<Personalization>({});
  const [sensitiveProduct, setSensitiveProduct] = useState(false);

  const [baldeacaoModalVisible, setBaldeacaoModalVisible] = useState(false);
  const [baldeacaoResults, setBaldeacaoResults] = useState<any[]>([]);
  const [baldeacaoLoading, setBaldeacaoLoading] = useState(false);

  useEffect(() => {
    const loadLastInputs = async () => {
      try {
        const savedInputs = await AsyncStorage.getItem('lastInputs');
        if (savedInputs && !route.params?.prefill) {
          const parsed = JSON.parse(savedInputs);
          setOriginCep(parsed.originCep ?? '');
          setDestinationCep(parsed.destinationCep ?? '');
          setLength(parsed.length ?? '');
          setWidth(parsed.width ?? '');
          setHeight(parsed.height ?? '');
          setWeight(parsed.weight ?? '');
          setInsuranceValue(parsed.insuranceValue ?? '');
          setCostTolerance(parsed.costTolerance ?? '1');
          setDeviationRange(parsed.deviationRange ?? defaultDeviationRange);
          setSensitiveProduct(parsed.sensitiveProduct ?? false);
        }
      } catch (error) {
        console.error('Erro ao carregar últimos inputs:', error);
      }
    };
    loadLastInputs();
  }, [route.params?.prefill]);

  useEffect(() => {
    const loadPersonalization = async () => {
      try {
        const stored = await AsyncStorage.getItem('personalization');
        if (stored) {
          setPersonalization(JSON.parse(stored));
        } else {
          // se não tiver local, tentar garantir via DB
          const ops = await ensureOperationalCostsInDb();
          // preparar estrutura de personalization local
          const pack = { standard: 0, sensitive: 0 };
          const p = { operationalCosts: {} as Record<string, number>, baldeacoes: [], packagingProtectionCm: pack };
          // converter ops para apenas operationalCosts: carrier -> operationalCost (ops[carrier].operationalCost)
          if (ops && Object.keys(ops).length > 0) {
            const map: Record<string, number> = {};
            for (const k of Object.keys(ops)) {
              map[k] = ops[k].operationalCost ?? 0;
            }
            p.operationalCosts = map;
          }
          setPersonalization(p);
          await AsyncStorage.setItem('personalization', JSON.stringify(p));
        }
      } catch (err) {
        console.error('Erro ao carregar personalização:', err);
      }
    };
    loadPersonalization();
  }, []);

  // Se veio prefill na rota (por exemplo vindo do histórico), aplicar nos estados
  useEffect(() => {
    const prefill = route.params?.prefill;
    if (prefill) {
      setOriginCep(prefill.originCep ?? '');
      setDestinationCep(prefill.destinationCep ?? '');
      setLength(String(prefill.length ?? ''));
      setWidth(String(prefill.width ?? ''));
      setHeight(String(prefill.height ?? ''));
      setWeight(String(prefill.weight ?? ''));
      setInsuranceValue(String(prefill.insuranceValue ?? ''));
      setCostTolerance(String(prefill.costTolerance ?? '1'));

      const safeRange = prefill.deviationRange ?? deviationRange;
      setDeviationRange({
        length: { min: Math.max(0, safeRange.length.min ?? 0), max: Math.max(0, safeRange.length.max ?? 0) },
        width: { min: Math.max(0, safeRange.width.min ?? 0), max: Math.max(0, safeRange.width.max ?? 0) },
        height: { min: Math.max(0, safeRange.height.min ?? 0), max: Math.max(0, safeRange.height.max ?? 0) },
      });

      setSensitiveProduct(Boolean(prefill.sensitiveProduct));
    }
  }, [route.params?.prefill]);

  const handleCalculate = async () => {
    if (!originCep || !destinationCep || !length || !width || !height || !weight || !insuranceValue) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    if (originCep.length !== 8 || destinationCep.length !== 8) {
      Alert.alert('Erro', 'Os CEPs devem ter 8 dígitos.');
      return;
    }

    const inputsToSave = {
      originCep,
      destinationCep,
      length,
      width,
      height,
      weight,
      insuranceValue,
      costTolerance,
      deviationRange,
      sensitiveProduct
    };
    await AsyncStorage.setItem('lastInputs', JSON.stringify(inputsToSave));

    // garantir que exista operationalCosts em personalization (se não, cria via DB)
    let currentPersonalization = personalization;
    if (!personalization?.operationalCosts || Object.keys(personalization.operationalCosts).length === 0) {
      try {
        const opsObj = await ensureOperationalCostsInDb();
        const opsMap: Record<string, number> = {};
        for (const k of Object.keys(opsObj)) opsMap[k] = opsObj[k].operationalCost ?? 0;
        currentPersonalization = { ...(personalization ?? {}), operationalCosts: opsMap };
        setPersonalization(currentPersonalization);
        await AsyncStorage.setItem('personalization', JSON.stringify(currentPersonalization));
      } catch (err) {
        console.error('Erro ao garantir operationalCosts:', err);
      }
    }

    const baldeacoes = currentPersonalization?.baldeacoes ?? [];
    if (baldeacoes.length > 0) {
      Alert.alert(
        'Baldeação encontrada',
        'Existem CEPs de baldeação cadastrados. Deseja verificar se alguma rota via baldeação pode ser mais barata?',
        [
          { text: 'Não', onPress: () => proceedCalculate(undefined, currentPersonalization) },
          { text: 'Sim', onPress: () => checkBaldeacoesAndShow(baldeacoes) },
        ],
        { cancelable: true }
      );
    } else {
      proceedCalculate(undefined, currentPersonalization);
    }
  };

  const proceedCalculate = async (useBaldeacaoCep?: string, currentPersonalization?: Personalization) => {
    setIsLoading(true);
    setProgress(0);
    setCompletedRequests(0);
    setTotalRequests(0);

    const finalDestination = useBaldeacaoCep ?? destinationCep;
    try {
      const packagingProtectionCm = sensitiveProduct
        ? (currentPersonalization?.packagingProtectionCm?.sensitive ?? personalization?.packagingProtectionCm?.sensitive ?? 0)
        : (currentPersonalization?.packagingProtectionCm?.standard ?? personalization?.packagingProtectionCm?.standard ?? 0);

      const results = await fetchShippingRates(
        originCep,
        finalDestination,
        length,
        width,
        height,
        weight,
        insuranceValue,
        deviationRange,
        parseFloat(costTolerance),
        (progress, completed, total) => {
          setProgress(progress);
          setCompletedRequests(completed);
          setTotalRequests(total);
        },
        currentPersonalization?.operationalCosts ?? personalization?.operationalCosts,
        packagingProtectionCm
      );

      const timestamp = new Date().toISOString();
      const queryRef = firebase.database().ref('queries').push();
      await queryRef.set({
        originCep,
        destinationCep: finalDestination,
        dimensions: { length, width, height },
        weight,
        insuranceValue,
        timestamp,
        deviationRange,
        costTolerance: parseFloat(costTolerance),
        sensitiveProduct,
      });

      navigation.navigate('Results', {
        results,
        deviationRange,
        costTolerance: parseFloat(costTolerance),
      } as never);
    } catch (error) {
      console.error('Erro ao calcular fretes:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao calcular os fretes. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkBaldeacoesAndShow = async (baldeacoes: string[]) => {
    setBaldeacaoLoading(true);
    setBaldeacaoModalVisible(true);
    try {
      const packagingProtectionCm = sensitiveProduct
        ? (personalization?.packagingProtectionCm?.sensitive ?? 0)
        : (personalization?.packagingProtectionCm?.standard ?? 0);

      const results = await computeBaldeacaoComparisons(
        originCep,
        destinationCep,
        Number(length),
        Number(width),
        Number(height),
        Number(weight),
        Number(insuranceValue),
        baldeacoes,
        packagingProtectionCm
      );

      setBaldeacaoResults(results);
    } catch (error) {
      console.error('Erro ao verificar baldeações:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao verificar baldeações.');
    } finally {
      setBaldeacaoLoading(false);
    }
  };

  const selectBaldeacaoAndSimulate = async (cep: string) => {
    setBaldeacaoModalVisible(false);
    setIsLoading(true);
    try {
      const packagingProtectionCm = sensitiveProduct
        ? (personalization?.packagingProtectionCm?.sensitive ?? 0)
        : (personalization?.packagingProtectionCm?.standard ?? 0);

      const results = await fetchShippingRates(
        originCep,
        cep,
        length,
        width,
        height,
        weight,
        insuranceValue,
        deviationRange,
        parseFloat(costTolerance),
        (progress, completed, total) => {
          setProgress(progress);
          setCompletedRequests(completed);
          setTotalRequests(total);
        },
        personalization?.operationalCosts,
        packagingProtectionCm
      );

      const timestamp = new Date().toISOString();
      const queryRef = firebase.database().ref('queries').push();
      await queryRef.set({
        originCep,
        destinationCep: cep,
        dimensions: { length, width, height },
        weight,
        insuranceValue,
        timestamp,
        deviationRange,
        costTolerance: parseFloat(costTolerance),
        sensitiveProduct,
        note: `Simulação por baldeação (${cep})`,
      });

      navigation.navigate('Results', {
        results,
        deviationRange,
        costTolerance: parseFloat(costTolerance),
      } as never);
    } catch (error) {
      console.error('Erro ao simular baldeação:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao simular a baldeação selecionada.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateDeviationRange = (dimension: keyof DeviationRange, value: 'min' | 'max', newValue: number) => {
    setDeviationRange(prev => ({
      ...prev,
      [dimension]: {
        ...prev[dimension],
        [value]: Math.max(0, newValue)
      }
    }));
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        {/* UI igual à versão anterior (inputs, sliders etc.) */}
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CEP de Origem</Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={styles.input}
                value={originCep}
                onChangeText={(t) => setOriginCep(t.replace(/\D/g, ''))}
                placeholder="00000000"
                keyboardType="numeric"
                maxLength={8}
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CEP de Destino</Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={styles.input}
                value={destinationCep}
                onChangeText={(t) => setDestinationCep(t.replace(/\D/g, ''))}
                placeholder="00000000"
                keyboardType="numeric"
                maxLength={8}
              />
            </View>
          </View>
        </View>

        <View style={styles.dimensionsRow}>
        <View style={styles.dimensionGroup}>
          <Text style={styles.label}>Comprimento</Text>
          <View style={styles.inputWithUnit}>
            <TextInput
              style={styles.input}
              value={length}
              onChangeText={(t) => setLength(t.replace(',', '.'))}
              placeholder="Ex: 20"
              keyboardType="numeric"
            />
            <Text style={styles.unit}>cm</Text>
          </View>
        </View>
        
        <View style={styles.dimensionGroup}>
          <Text style={styles.label}>Largura</Text>
          <View style={styles.inputWithUnit}>
            <TextInput
              style={styles.input}
              value={width}
              onChangeText={(t) => setWidth(t.replace(',', '.'))}
              placeholder="Ex: 15"
              keyboardType="numeric"
            />
            <Text style={styles.unit}>cm</Text>
          </View>
        </View>
        
        <View style={styles.dimensionGroup}>
          <Text style={styles.label}>Altura</Text>
          <View style={styles.inputWithUnit}>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={(t) => setHeight(t.replace(',', '.'))}
              placeholder="Ex: 10"
              keyboardType="numeric"
            />
            <Text style={styles.unit}>cm</Text>
          </View>
        </View>
      </View>

        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Peso</Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={(t) => setWeight(t.replace(',', '.'))}
                placeholder="Ex: 0.5"
                keyboardType="numeric"
              />
              <Text style={styles.unit}>kg</Text>
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Valor Segurado</Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={styles.input}
                value={insuranceValue}
                onChangeText={(t) => setInsuranceValue(t.replace(',', '.'))}
                placeholder="Ex: 50"
                keyboardType="numeric"
              />
              <Text style={styles.unit}>R$</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
          <Text style={{ flex: 1 }}>Produto sensível (aplica proteção em cm)</Text>
          <Switch value={sensitiveProduct} onValueChange={setSensitiveProduct} />
        </View>

        <Text style={styles.label}>Tolerância de Custo</Text>
        <View style={styles.inputWithUnit}>
          <TextInput
            style={styles.input}
            value={costTolerance}
            onChangeText={(t) => setCostTolerance(t.replace(',', '.'))}
            placeholder="Ex: 1.00"
            keyboardType="numeric"
          />
          <Text style={styles.unit}>R$</Text>
        </View>

        <View style={styles.sliderGroup}>
          <Text style={styles.sectionTitle}>Variação de Comprimento</Text>
          <RangeSlider
            values={[deviationRange.length.min, deviationRange.length.max]}
            min={0}
            max={5}
            onValuesChange={(values) => {
              updateDeviationRange('length', 'min', values[0]);
              updateDeviationRange('length', 'max', values[1]);
            }}
          />
        </View>

        <View style={styles.sliderGroup}>
          <Text style={styles.sectionTitle}>Variação de Largura</Text>
          <RangeSlider
            values={[deviationRange.width.min, deviationRange.width.max]}
            min={0}
            max={5}
            onValuesChange={(values) => {
              updateDeviationRange('width', 'min', values[0]);
              updateDeviationRange('width', 'max', values[1]);
            }}
          />
        </View>

        <View style={styles.sliderGroup}>
          <Text style={styles.sectionTitle}>Variação de Altura</Text>
          <RangeSlider
            values={[deviationRange.height.min, deviationRange.height.max]}
            min={0}
            max={5}
            onValuesChange={(values) => {
              updateDeviationRange('height', 'min', values[0]);
              updateDeviationRange('height', 'max', values[1]);
            }}
          />
        </View>

        {isLoading ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text>Progresso: {Math.round(progress * 100)}%</Text>
            <Text>
              {completedRequests} de {totalRequests} requisições
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleCalculate}>
            <Text style={styles.buttonText}>Calcular Frete</Text>
          </TouchableOpacity>
        )}

        <Modal visible={baldeacaoModalVisible} animationType="slide" onRequestClose={() => setBaldeacaoModalVisible(false)}>
          <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Baldeações</Text>
            {baldeacaoLoading ? (
              <View style={{ alignItems: 'center', marginTop: 30 }}>
                <ActivityIndicator size="large" />
                <Text>Verificando rotas...</Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={baldeacaoResults}
                  keyExtractor={(item) => item.baldeacaoCep}
                  renderItem={({ item }) => (
                    <View style={styles.baldeacaoItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: 'bold' }}>{item.baldeacaoCep}</Text>
                        <Text>Preço combinado: {item.totalPrice !== null ? `R$ ${item.totalPrice.toFixed(2)}` : 'Indisponível'}</Text>
                        <Text>Melhor que direto: {item.isBetterThanDirect ? 'Sim' : 'Não'}</Text>
                      </View>
                      <View style={{ justifyContent: 'center' }}>
                        {item.isBetterThanDirect && <Text style={{ color: 'green', fontWeight: 'bold' }}>✔ Mais barato</Text>}
                        <TouchableOpacity style={styles.simulateButton} onPress={() => selectBaldeacaoAndSimulate(item.baldeacaoCep)}>
                          <Text style={{ color: '#fff' }}>Simular</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={<Text>Nenhuma baldeação encontrada.</Text>}
                />
                <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={() => setBaldeacaoModalVisible(false)}>
                  <Text style={styles.buttonText}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f7f7f7',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  inputGroup: {
    width: (screenWidth - 50) / 2,
    marginBottom: 1,
  },
  sliderGroup: {
    marginBottom: 1,
  },
  label: {
    fontSize: 14,
    marginBottom: 1,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    flex: 1,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  unit: {
    paddingHorizontal: 10,
    color: '#555',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 1,
  },
  dimensionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  dimensionGroup: {
    width: '31%',
  },
  baldeacaoItem: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginVertical: 6,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  simulateButton: {
    backgroundColor: '#28a745',
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
    alignItems: 'center',
  }
});

export default ShippingCalculator;
