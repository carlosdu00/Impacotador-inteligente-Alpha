import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { ShippingRate } from './types';
import { fetchShippingRates } from './utils';
import firebase from './firebaseConfig';

const ShippingCalculator = ({ navigation }: { navigation: any }) => {
  // Definindo valores padrão
  const [originCep, setOriginCep] = useState('97050-600');
  const [destinationCep, setDestinationCep] = useState('97050-600');
  const [length, setLength] = useState('10');
  const [width, setWidth] = useState('10');
  const [height, setHeight] = useState('10');
  const [weight, setWeight] = useState('2');
  const [insuranceValue, setInsuranceValue] = useState('150');
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    if (!originCep || !destinationCep || !length || !width || !height || !weight || !insuranceValue) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }
  
    setLoading(true);
    try {
      const rates = await fetchShippingRates(originCep, destinationCep, length, width, height, weight, insuranceValue);
  
      // Criar um objeto com os dados da consulta
      const queryData = {
        originCep,
        destinationCep,
        dimensions: { length, width, height },
        weight,
        insuranceValue,
        results: rates,
        timestamp: Date.now(),
      };
  
      // Salvar no Firebase Realtime Database
      const newReference = firebase.database().ref('/queries').push();
      await newReference.set(queryData);
  
      navigation.navigate('Results', { results: rates });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível calcular os fretes');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <View style={styles.container}>
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

      <Button title={loading ? "Calculando..." : "Calcular Frete"} onPress={handleCalculate} disabled={loading} />
      <Button title="Ver Histórico" onPress={() => navigation.navigate('History')} />
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
});

export default ShippingCalculator;
