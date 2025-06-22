//ApiManager.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import firebase from '../services/firebaseConfig';

const ApiManager = () => {

  useEffect(() => {
    
    
  }, []);

  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gerenciador de API</Text>
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
