// ShippingHistory.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import firebase from './firebaseConfig';

const ShippingHistory = () => {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onValueChange = firebase
      .database()
      .ref('/queries')
      .limitToLast(50) // Limitar aos últimos 50 registros
      .on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Transformar o objeto em um array
          const queriesArray = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          // Inverter a ordem para mostrar os mais recentes primeiro
          setQueries(queriesArray.reverse());
        } else {
          setQueries([]);
        }
        setLoading(false);
      });

    // Limpar o listener quando o componente desmontar
    return () => firebase.database().ref('/queries').off('value', onValueChange);
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemTitle}>Consulta em {new Date(item.timestamp).toLocaleString()}</Text>
      <Text style={styles.itemText}>Origem: {item.originCep}</Text>
      <Text style={styles.itemText}>Destino: {item.destinationCep}</Text>
      <Text style={styles.itemText}>
        Dimensões: {item.dimensions.length} x {item.dimensions.width} x {item.dimensions.height} cm
      </Text>
      <Text style={styles.itemText}>Peso: {item.weight} kg</Text>
      <Text style={styles.itemText}>Valor Segurado: R$ {item.insuranceValue}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico de Consultas</Text>
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
});

export default ShippingHistory;
