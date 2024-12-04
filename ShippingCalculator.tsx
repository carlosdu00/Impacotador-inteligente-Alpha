// ShippingCalculator.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import * as Progress from 'react-native-progress';

import { fetchShippingRates } from './utils';
import firebase from './firebaseConfig';

const ShippingCalculator = ({ navigation }: { navigation: any }) => {
  // Definindo valores padrão
  const [originCep, setOriginCep] = useState('97050-600');
  const [destinationCep, setDestinationCep] = useState('01307-002');
  const [length, setLength] = useState('41');
  const [width, setWidth] = useState('28');
  const [height, setHeight] = useState('20');
  const [weight, setWeight] = useState('2');
  const [insuranceValue, setInsuranceValue] = useState('150');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  const handleCalculate = async () => {
    if (!originCep || !destinationCep || !length || !width || !height || !weight || !insuranceValue) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    setProgress(0);
    setProgressText('');

    try {
      const requestKey = `${originCep}-${destinationCep}-${length}-${width}-${height}-${weight}-${insuranceValue}`;
      const cachedResultRef = firebase.database().ref(`/cachedResults/${requestKey}`);
      const snapshot = await cachedResultRef.once('value');
      const data = snapshot.val();
      const oneDay = 24 * 60 * 60 * 1000;
      const now = Date.now();

      if (data && now - data.timestamp < oneDay) {
        // Dados do cache
        navigation.navigate('Results', { results: data.results, fromCache: true });
      } else {
        // Nova consulta à API
        const rates = await fetchShippingRates(
          originCep,
          destinationCep,
          length,
          width,
          height,
          weight,
          insuranceValue,
          (progressValue, completedRequests, totalRequests) => {
            setProgress(progressValue);
            setProgressText(`Processados: ${completedRequests}/${totalRequests}`);
          }
        );
        // Salvar resultados no cache
        await cachedResultRef.set({ results: rates, timestamp: now });
        navigation.navigate('Results', { results: rates, fromCache: false });
      }

      // Salvar a consulta no histórico (sem os resultados detalhados)
      const queryData = {
        originCep,
        destinationCep,
        dimensions: { length, width, height },
        weight,
        insuranceValue,
        timestamp: now,
      };

      const newReference = firebase.database().ref('/queries').push();
      await newReference.set(queryData);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível calcular os fretes');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (

    <View style={styles.container}>
      <Text style={styles.title}>Calculadora de Frete</Text>
      <Text style={styles.label}>CEP Origem:</Text>
      <TextInput
        style={styles.input}
        value={originCep}
        onChangeText={setOriginCep}
        keyboardType="numeric"
        placeholder="Digite o CEP de origem"
      />

      <Text style={styles.label}>CEP Destino:</Text>
      <TextInput
        style={styles.input}
        value={destinationCep}
        onChangeText={setDestinationCep}
        keyboardType="numeric"
        placeholder="Digite o CEP de destino"
      />

      <View style={styles.row}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Comprimento (cm):</Text>
          <TextInput
            style={styles.input}
            value={length}
            onChangeText={setLength}
            keyboardType="numeric"
            placeholder="Comprimento"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Largura (cm):</Text>
          <TextInput
            style={styles.input}
            value={width}
            onChangeText={setWidth}
            keyboardType="numeric"
            placeholder="Largura"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Altura (cm):</Text>
          <TextInput
            style={styles.input}
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            placeholder="Altura"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Peso (kg):</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="Peso"
          />
        </View>
      </View>

      <Text style={styles.label}>Valor Segurado (R$):</Text>
      <TextInput
        style={styles.input}
        value={insuranceValue}
        onChangeText={setInsuranceValue}
        keyboardType="numeric"
        placeholder="Valor Segurado"
      />

{loading && (
        <View style={styles.progressContainer}>
          <Progress.Bar progress={progress} width={null} />
          <Text style={styles.progressText}>{progressText}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title={loading ? 'Calculando...' : 'Calcular Frete'}
          onPress={handleCalculate}
          disabled={loading}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Ver Histórico" onPress={() => navigation.navigate('History')} />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Gerenciar API" onPress={() => navigation.navigate('ApiManager')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
  },
  label: {
    marginTop: 10,
    fontWeight: 'bold',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginTop: 5,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  inputContainer: {
    width: '48%', // Cada campo ocupa 48% da largura da tela
  },
  progressContainer: {
    marginTop: 20,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 5,
    color: '#333',
  },
  buttonContainer: {
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
});

export default ShippingCalculator;
