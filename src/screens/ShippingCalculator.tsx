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
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RangeSlider from '../components/RangeSlider';
import { fetchShippingRates } from '../utils/utils';
import { useNavigation } from '@react-navigation/native';
import firebase from '../services/firebaseConfig';
import { DeviationRange, ShippingRate } from '../types/types';

const screenWidth = Dimensions.get('window').width;

type NavigationProps = {
  navigate: (screen: string, params: any) => void;
};

const ShippingCalculator = () => {
  const [originCep, setOriginCep] = useState('');
  const [destinationCep, setDestinationCep] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [insuranceValue, setInsuranceValue] = useState('');
  const [costTolerance, setCostTolerance] = useState('1');
  const [deviationRange, setDeviationRange] = useState<DeviationRange>({
    length: { min: 0, max: 5 },
    width: { min: 0, max: 5 },
    height: { min: 0, max: 5 },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedRequests, setCompletedRequests] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  
  const navigation = useNavigation<NavigationProps>();

  useEffect(() => {
    const loadLastInputs = async () => {
      try {
        const savedInputs = await AsyncStorage.getItem('lastInputs');
        if (savedInputs) {
          const { 
            originCep: savedOrigin, 
            destinationCep: savedDest, 
            length: savedLen, 
            width: savedWidth, 
            height: savedHeight, 
            weight: savedWeight, 
            insuranceValue: savedIns,
            costTolerance: savedTol,
            deviationRange: savedRange
          } = JSON.parse(savedInputs);
          
          setOriginCep(savedOrigin || '');
          setDestinationCep(savedDest || '');
          setLength(savedLen || '');
          setWidth(savedWidth || '');
          setHeight(savedHeight || '');
          setWeight(savedWeight || '');
          setInsuranceValue(savedIns || '');
          setCostTolerance(savedTol || '1');
          setDeviationRange(savedRange || {
            length: { min: 0, max: 5 },
            width: { min: 0, max: 5 },
            height: { min: 0, max: 5 },
          });
        }
      } catch (error) {
        console.error('Erro ao carregar últimos inputs:', error);
      }
    };
    loadLastInputs();
  }, []);

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
      deviationRange
    };
    await AsyncStorage.setItem('lastInputs', JSON.stringify(inputsToSave));

    setIsLoading(true);
    setProgress(0);
    setCompletedRequests(0);
    setTotalRequests(0);

    try {
      const results = await fetchShippingRates(
        originCep,
        destinationCep,
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
        }
      );

      const timestamp = new Date().toISOString();
      const queryRef = firebase.database().ref('queries').push();
      await queryRef.set({
        originCep,
        destinationCep,
        dimensions: { length, width, height },
        weight,
        insuranceValue,
        timestamp,
        deviationRange,
        costTolerance: parseFloat(costTolerance),
      });

      navigation.navigate('Results', {
        results,
        deviationRange,
        costTolerance: parseFloat(costTolerance),
      });
    } catch (error) {
      console.error('Erro ao calcular fretes:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao calcular os fretes. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateDeviationRange = (dimension: keyof DeviationRange, value: 'min' | 'max', newValue: number) => {
    setDeviationRange(prev => ({
      ...prev,
      [dimension]: {
        ...prev[dimension],
        [value]: newValue
      }
    }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* CEPs lado a lado */}
      <View style={styles.row}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>CEP de Origem</Text>
          <View style={styles.inputWithUnit}>
            <TextInput
              style={styles.input}
              value={originCep}
              onChangeText={setOriginCep}
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
              onChangeText={setDestinationCep}
              placeholder="00000000"
              keyboardType="numeric"
              maxLength={8}
            />
          </View>
        </View>
      </View>

      {/* Dimensões lado a lado */}
      <View style={styles.dimensionsRow}>
      <View style={styles.dimensionGroup}>
        <Text style={styles.label}>Comprimento</Text>
        <View style={styles.inputWithUnit}>
          <TextInput
            style={styles.input}
            value={length}
            onChangeText={setLength}
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
            onChangeText={setWidth}
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
            onChangeText={setHeight}
            placeholder="Ex: 10"
            keyboardType="numeric"
          />
          <Text style={styles.unit}>cm</Text>
        </View>
      </View>
    </View>

      {/* Peso e valor segurado lado a lado */}
      <View style={styles.row}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Peso</Text>
          <View style={styles.inputWithUnit}>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
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
              onChangeText={setInsuranceValue}
              placeholder="Ex: 50"
              keyboardType="numeric"
            />
            <Text style={styles.unit}>R$</Text>
          </View>
        </View>
      </View>

      {/* Tolerância de custo */}
      <Text style={styles.label}>Tolerância de Custo</Text>
      <View style={styles.inputWithUnit}>
        <TextInput
          style={styles.input}
          value={costTolerance}
          onChangeText={setCostTolerance}
          placeholder="Ex: 1.00"
          keyboardType="numeric"
        />
        <Text style={styles.unit}>R$</Text>
      </View>

      {/* RangeSliders com menos espaçamento */}
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
    </ScrollView>
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
    width: (screenWidth - 50) / 2, // 50 = padding * 2 + margin
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
    width: '31%',  // 32% para caber 3 com espaçamento
  },
});

export default ShippingCalculator;