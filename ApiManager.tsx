// ApiManager.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import firebase from './firebaseConfig';

const ApiManager = () => {
  const [tokenInfo, setTokenInfo] = useState<{ expiresAt: string } | null>(null);

  useEffect(() => {
    // Obter informações do token do Firebase
    const tokenRef = firebase.database().ref('/apiToken');
    tokenRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTokenInfo({ expiresAt: data.expiresAt });
      } else {
        setTokenInfo(null);
      }
    });

    return () => tokenRef.off();
  }, []);

  const handleRefreshToken = () => {
    // Implementar lógica para atualizar o token
    Alert.alert('Aviso', 'Função de atualização de token não implementada.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gerenciador de API</Text>
      {tokenInfo ? (
        <Text style={styles.infoText}>Token expira em: {tokenInfo.expiresAt}</Text>
      ) : (
        <Text style={styles.infoText}>Informações do token não disponíveis.</Text>
      )}
      <View style={styles.buttonContainer}>
        <Button title="Atualizar Token" onPress={handleRefreshToken} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f7f7f7' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' },
  infoText: { fontSize: 16, color: '#555', marginBottom: 20, textAlign: 'center' },
  buttonContainer: { marginTop: 20 },
});

export default ApiManager;
