import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import firebase from './firebaseConfig';

const ShippingHistory = () => {
  const [queries, setQueries] = useState<any[]>([]);

  useEffect(() => {
    const onValueChange = firebase.database()
      .ref('/queries')
      .on('value', snapshot => {
        const data = snapshot.val();
        if (data) {
          // Transformar o objeto em um array
          const queriesArray = Object.keys(data).map(key => ({
            id: key,
            ...data[key],
          }));
          // Opcionalmente, inverter a ordem para mostrar os mais recentes primeiro
          setQueries(queriesArray.reverse());
        } else {
          setQueries([]);
        }
      });

    // Limpar o listener quando o componente desmontar
    return () => firebase.database().ref('/queries').off('value', onValueChange);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico de Consultas</Text>
      <FlatList
        data={queries}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <Text>Origem: {item.originCep}</Text>
            <Text>Destino: {item.destinationCep}</Text>
            <Text>Dimensões: {item.dimensions.length}x{item.dimensions.width}x{item.dimensions.height}</Text>
            <Text>Peso: {item.weight} kg</Text>
            <Text>Valor Segurado: R$ {item.insuranceValue}</Text>
            <Text>Data: {new Date(item.timestamp).toLocaleString()}</Text>
            <Text style={{ fontWeight: 'bold', marginTop: 5 }}>Resultados:</Text>
            {item.results.map((result: any, index: number) => (
              <View key={index} style={{ marginLeft: 10 }}>
                <Text>{result.company.name} - {result.name}</Text>
                <Text>{result.price ? `Preço: R$ ${result.price}` : `Erro: ${result.error}`}</Text>
                <Text>Variação: {result.variation}</Text>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={<Text>Nenhuma consulta encontrada.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  itemContainer: { padding: 10, marginVertical: 5, borderWidth: 1, borderColor: '#ccc', borderRadius: 5 },
});

export default ShippingHistory;
