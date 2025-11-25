// src/screens/Personalization.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebase from '../services/firebaseConfig';
import { ensureOperationalCostsInDb } from '../utils/utils';

type OperationalEntry = { operationalCost: number; samplePrice: number | null };

type Personalization = {
  operationalCosts: Record<string, OperationalEntry>;
  baldeacoes: string[]; // lista de CEPs
  packagingProtectionCm: { standard: number; sensitive: number };
};

const defaultPersonalization: Personalization = {
  operationalCosts: {},
  baldeacoes: [],
  packagingProtectionCm: { standard: 0, sensitive: 0 },
};

const PersonalizationScreen = () => {
  const [data, setData] = useState<Personalization>(defaultPersonalization);

  // inputs temporários
  const [newBaldeacao, setNewBaldeacao] = useState('');
  const [standardCm, setStandardCm] = useState('');
  const [sensitiveCm, setSensitiveCm] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem('personalization');
        if (stored) {
          const parsed = JSON.parse(stored);
          setData({
            operationalCosts: parsed.operationalCosts ?? {},
            baldeacoes: parsed.baldeacoes ?? [],
            packagingProtectionCm: parsed.packagingProtectionCm ?? { standard: 0, sensitive: 0 },
          });
          setStandardCm(String(parsed.packagingProtectionCm?.standard ?? 0));
          setSensitiveCm(String(parsed.packagingProtectionCm?.sensitive ?? 0));
        } else {
          // tentar garantir /operationalCosts no DB e carregar
          try {
            const opsFromDb = await firebase.database().ref('/operationalCosts').once('value');
            const val = opsFromDb.val();
            if (val && Object.keys(val).length > 0) {
              setData(prev => ({ ...prev, operationalCosts: val }));
            } else {
              // se não existe, pedir ao utils para criar uma lista inicial
              const created = await ensureOperationalCostsInDb();
              // created tem formato { carrier: { operationalCost, samplePrice } }
              setData(prev => ({ ...prev, operationalCosts: created }));
            }
          } catch (err) {
            console.error('Erro ao carregar operationalCosts do DB:', err);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar personalização:', err);
      }
    };
    load();
  }, []);

  const saveAll = async (toSave?: Personalization) => {
    const payload = toSave ?? data;
    try {
      await AsyncStorage.setItem('personalization', JSON.stringify(payload));
      // salvar no firebase em /personalization (log histórico) e em /operationalCosts a tabela corrente
      try {
        const ref = firebase.database().ref('personalization').push();
        await ref.set({ ...payload, timestamp: new Date().toISOString() });
      } catch (err) {
        // ignore if firebase has issues
      }
      // atualizar também tabela /operationalCosts com o formato requerido
      try {
        await firebase.database().ref('/operationalCosts').set(payload.operationalCosts);
      } catch (err) {
        // ignore
      }
      Alert.alert('Salvo', 'Personalização salva com sucesso.');
    } catch (err) {
      console.error('Erro ao salvar personalization:', err);
      Alert.alert('Erro', 'Não foi possível salvar a personalização.');
    }
  };

  const addBaldeacao = () => {
    const cep = newBaldeacao.replace(/\D/g, '');
    if (cep.length !== 8) {
      Alert.alert('Erro', 'CEP inválido. Digite 8 dígitos.');
      return;
    }
    if (data.baldeacoes.includes(cep)) {
      Alert.alert('Aviso', 'Este CEP já está cadastrado.');
      return;
    }
    setData(prev => ({ ...prev, baldeacoes: [...prev.baldeacoes, cep] }));
    setNewBaldeacao('');
  };

  const removeBaldeacao = (cep: string) => {
    setData(prev => ({ ...prev, baldeacoes: prev.baldeacoes.filter(c => c !== cep) }));
  };

  const updateOperationalCost = (carrier: string, val: string) => {
    const parsed = parseFloat(val.replace(',', '.')) || 0;
    setData(prev => ({
      ...prev,
      operationalCosts: {
        ...prev.operationalCosts,
        [carrier]: {
          ...(prev.operationalCosts[carrier] ?? { operationalCost: 0, samplePrice: null }),
          operationalCost: Number(parsed.toFixed(2)),
        }
      }
    }));
  };

  const removeCarrier = (carrier: string) => {
    const op = { ...data.operationalCosts };
    delete op[carrier];
    setData(prev => ({ ...prev, operationalCosts: op }));
  };

  const applyPackagingExtras = () => {
    const s = parseFloat(standardCm.replace(',', '.')) || 0;
    const sen = parseFloat(sensitiveCm.replace(',', '.')) || 0;
    setData(prev => ({ ...prev, packagingProtectionCm: { standard: Number(s.toFixed(2)), sensitive: Number(sen.toFixed(2)) } }));
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <Text style={styles.title}>Personalização</Text>

      <Text style={styles.section}>Custos operacionais por transportadora (lista do banco)</Text>

      <FlatList
        data={Object.keys(data.operationalCosts)}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>{item}</Text>
              <Text style={{ color: '#666', fontSize: 12 }}>Preço amostra: {data.operationalCosts[item]?.samplePrice != null ? `R$ ${data.operationalCosts[item].samplePrice!.toFixed(2)}` : 'n/d'}</Text>
            </View>
            <View style={{ width: 140, marginLeft: 8 }}>
              <TextInput
                value={String(data.operationalCosts[item]?.operationalCost ?? 0)}
                onChangeText={(t) => updateOperationalCost(item, t)}
                keyboardType="numeric"
                style={styles.smallInput}
              />
            </View>
            <TouchableOpacity onPress={() => removeCarrier(item)} style={{ marginLeft: 8 }}>
              <Text style={{ color: 'red' }}>Remover</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: '#777' }}>Nenhuma transportadora configurada (o app pode gerar automaticamente).</Text>}
        style={{ maxHeight: 260, marginBottom: 12 }}
      />

      <Text style={styles.section}>CEPs de baldeação</Text>
      <View style={styles.row}>
        <TextInput placeholder="00000000" value={newBaldeacao} onChangeText={setNewBaldeacao} style={[styles.input, { flex: 1 }]} keyboardType="numeric" />
        <TouchableOpacity style={styles.addButton} onPress={addBaldeacao}>
          <Text style={{ color: '#fff' }}>Adicionar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data.baldeacoes}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text>{item}</Text>
            <TouchableOpacity onPress={() => removeBaldeacao(item)}><Text style={{ color: 'red' }}>Remover</Text></TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: '#777' }}>Nenhum CEP cadastrado.</Text>}
        style={{ maxHeight: 140 }}
      />

      <Text style={styles.section}>Proteção (cm) adicionada às dimensões</Text>
      <View style={styles.row}>
        <TextInput placeholder="Padrão (cm)" value={standardCm} onChangeText={setStandardCm} style={[styles.input, { flex: 1 }]} keyboardType="numeric" />
        <TextInput placeholder="Sensível (cm)" value={sensitiveCm} onChangeText={setSensitiveCm} style={[styles.input, { flex: 1, marginLeft: 8 }]} keyboardType="numeric" />
        <TouchableOpacity style={[styles.addButton, { marginLeft: 8 }]} onPress={applyPackagingExtras}>
          <Text style={{ color: '#fff' }}>Aplicar</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={() => saveAll(data)}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Salvar Personalização</Text>
      </TouchableOpacity>

      <View style={{ height: 20 }} />
      <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#007bff' }]} onPress={async () => {
        // forçar atualização da lista a partir do DB (útil se gerar automaticamente)
        try {
          const snapshot = await firebase.database().ref('/operationalCosts').once('value');
          const val = snapshot.val();
          if (val && Object.keys(val).length > 0) {
            setData(prev => ({ ...prev, operationalCosts: val }));
            await AsyncStorage.setItem('personalization', JSON.stringify({ ...data, operationalCosts: val }));
            Alert.alert('Pronto', 'Lista de transportadoras atualizada a partir do banco.');
          } else {
            const created = await ensureOperationalCostsInDb();
            setData(prev => ({ ...prev, operationalCosts: created }));
            await AsyncStorage.setItem('personalization', JSON.stringify({ ...data, operationalCosts: created }));
            Alert.alert('Pronto', 'Lista criada e salva no banco.');
          }
        } catch (err) {
          console.error('Erro ao atualizar lista do DB:', err);
          Alert.alert('Erro', 'Não foi possível atualizar a lista do banco.');
        }
      }}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Atualizar lista de transportadoras (DB)</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f7f7f7' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  section: { fontSize: 16, marginTop: 10, marginBottom: 6, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  input: { height: 40, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 8, backgroundColor: '#fff' },
  smallInput: { height: 36, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 8, backgroundColor: '#fff' },
  addButton: { backgroundColor: '#007bff', padding: 8, borderRadius: 6, marginLeft: 8 },
  saveButton: { backgroundColor: '#28a745', padding: 12, borderRadius: 6, alignItems: 'center', marginTop: 16 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, backgroundColor: '#fff', borderRadius: 6, marginVertical: 4, borderWidth: 1, borderColor: '#ddd' },
});

export default PersonalizationScreen;
