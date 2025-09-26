// src/screens/ShippingHistory.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import firebase from '../services/firebaseConfig';
import { DeviationRange } from '../types/types';
import { useNavigation } from '@react-navigation/native';

const ShippingHistory = () => {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const ref = firebase.database().ref('/queries').limitToLast(50);

    const onValueChange = ref.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const queriesArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        // Ordenar do mais recente para o mais antigo
        setQueries(queriesArray.reverse());
      } else {
        setQueries([]);
      }
      setLoading(false);
    });

    return () => {
      ref.off('value', onValueChange);
    };
  }, []);

  const formatDeviationRange = (range: DeviationRange) => {
    return `C: +${range.length.min}-${range.length.max}cm | L: +${range.width.min}-${range.width.max}cm | A: +${range.height.min}-${range.height.max}cm`;
  };

  const handleUseQuery = (item: any) => {
    // Montar objeto de prefill com o formato que o ShippingCalculator espera
    const prefill = {
      originCep: item.originCep ?? item.originCEP ?? '',
      destinationCep: item.destinationCep ?? item.destinationCEP ?? '',
      length: item.dimensions?.length ?? item.length ?? '',
      width: item.dimensions?.width ?? item.width ?? '',
      height: item.dimensions?.height ?? item.height ?? '',
      weight: item.weight ?? '',
      insuranceValue: item.insuranceValue ?? item.insurance_value ?? '',
      costTolerance: item.costTolerance ?? item.costTolerance ?? 1,
      deviationRange: item.deviationRange ?? {
        length: { min: 0, max: 0 },
        width: { min: 0, max: 0 },
        height: { min: 0, max: 0 },
      },
    };

    Alert.alert(
      'Usar consulta',
      'Deseja preencher a calculadora com os dados desta consulta do histórico?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Preencher',
          onPress: () => {
            // Navegar para a tela "Calculator" dentro do stack "Calculadora"
            // Isso abre o drawer item "Calculadora" e direciona para a screen "Calculator" com params
            navigation.navigate('Calculadora' as never, {
              screen: 'Calculator',
              params: { prefill },
            } as never);
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => handleUseQuery(item)} activeOpacity={0.7}>
      <View style={styles.itemContainer}>
        <Text style={styles.itemTitle}>Consulta em {new Date(item.timestamp).toLocaleString()}</Text>
        <Text style={styles.itemText}>Origem: {item.originCep}</Text>
        <Text style={styles.itemText}>Destino: {item.destinationCep}</Text>
        <Text style={styles.itemText}>
          Dimensões: {item.dimensions?.length ?? item.length} x {item.dimensions?.width ?? item.width} x {item.dimensions?.height ?? item.height} cm
        </Text>
        <Text style={styles.itemText}>Peso: {item.weight} kg</Text>
        <Text style={styles.itemText}>Valor Segurado: R$ {item.insuranceValue}</Text>
        <Text style={styles.itemText}>Variação: {formatDeviationRange(item.deviationRange)}</Text>
        <Text style={styles.itemText}>Tolerância: R$ {(item.costTolerance ?? item.costTolerance ?? 1).toFixed(2)}</Text>
        <Text style={styles.hintText}>Toque para carregar esses dados na calculadora</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <Text>Carregando...</Text>
      ) : (
        <FlatList
          data={queries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text>Nenhuma consulta encontrada.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f7f7f7' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' },
  itemContainer: {
    padding: 15,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  itemText: {
    fontSize: 14,
    color: '#555',
  },
  hintText: {
    marginTop: 8,
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});

export default ShippingHistory;
