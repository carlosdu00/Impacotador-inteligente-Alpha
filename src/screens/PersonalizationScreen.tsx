// src/screens/Personalization.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebase from '../services/firebaseConfig';
import { ensureOperationalCostsInDb } from '../utils/utils';

type OperationalEntry = { operationalCost: number; samplePrice?: number | null };

type Personalization = {
  operationalCosts: Record<string, OperationalEntry>;
  baldeacoes: string[]; // lista de CEPs (somente dígitos salvo no DB)
  packagingProtectionCm: { normal: number; extra: number };
};

const defaultPersonalization: Personalization = {
  operationalCosts: {},
  baldeacoes: [],
  packagingProtectionCm: { normal: 0, extra: 0 },
};

const formatCep = (digitsOnly: string) => {
  const d = digitsOnly.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

const PersonalizationScreen = () => {
  const [data, setData] = useState<Personalization>(defaultPersonalization);

  // inputs temporários
  const [newBaldeacao, setNewBaldeacao] = useState(''); // exibido formatado (00000-000)
  const [normalCm, setNormalCm] = useState('');
  const [extraCm, setExtraCm] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem('personalization');
        if (stored) {
          const parsed = JSON.parse(stored);
          // normalizar qualquer valor para number
          const loadedOps = parsed.operationalCosts ?? {};
          const normalizedOps: Record<string, OperationalEntry> = {};
          for (const k of Object.keys(loadedOps)) {
            const raw = loadedOps[k];
            const opRaw = raw?.operationalCost ?? raw;
            const operationalCost = Number(String(opRaw).replace(',', '.')) || 0;
            const samplePriceRaw = raw?.samplePrice ?? null;
            const samplePrice = samplePriceRaw != null ? Number(samplePriceRaw) : null;
            normalizedOps[k] = { operationalCost: Number.isFinite(operationalCost) ? operationalCost : 0, samplePrice: Number.isFinite(samplePrice as number) ? (samplePrice as number) : null };
          }

          setData({
            operationalCosts: normalizedOps,
            baldeacoes: parsed.baldeacoes ?? [],
            packagingProtectionCm: parsed.packagingProtectionCm ?? { normal: 0, extra: 0 },
          });
          setNormalCm(String(parsed.packagingProtectionCm?.normal ?? 0));
          setExtraCm(String(parsed.packagingProtectionCm?.extra ?? 0));
        } else {
          // tentar garantir /operationalCosts no DB e carregar
          try {
            const snapshot = await firebase.database().ref('/operationalCosts').once('value');
            const val = snapshot.val();
            if (val && Object.keys(val).length > 0) {
              // normalizar
              const normalized: Record<string, OperationalEntry> = {};
              for (const k of Object.keys(val)) {
                const raw = val[k];
                const opRaw = raw?.operationalCost ?? raw;
                const operationalCost = Number(String(opRaw).replace(',', '.')) || 0;
                const samplePriceRaw = raw?.samplePrice ?? null;
                const samplePrice = samplePriceRaw != null ? Number(samplePriceRaw) : null;
                normalized[k] = { operationalCost: Number.isFinite(operationalCost) ? operationalCost : 0, samplePrice: Number.isFinite(samplePrice as number) ? (samplePrice as number) : null };
              }
              setData(prev => ({ ...prev, operationalCosts: normalized }));
            } else {
              // se não existe, pedir ao utils para criar uma lista inicial
              const created = await ensureOperationalCostsInDb();
              // created já normalizado pela função ensureOperationalCostsInDb
              setData(prev => ({ ...prev, operationalCosts: created }));
            }
          } catch (err: any) {
            console.error('Erro ao carregar operationalCosts do DB:', err?.message ?? err);
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
      // salvar histórico em /personalization
      try {
        const ref = firebase.database().ref('personalization').push();
        await ref.set({ ...payload, timestamp: new Date().toISOString() });
      } catch (err) {
        // ignore small firebase errors
      }
      // atualizar tabela corrente /operationalCosts no DB (mantendo estrutura atual)
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
    const digits = newBaldeacao.replace(/\D/g, '');
    if (digits.length !== 8) {
      Alert.alert('Erro', 'CEP inválido. Digite 8 dígitos.');
      return;
    }
    if (data.baldeacoes.includes(digits)) {
      Alert.alert('Aviso', 'Este CEP já está cadastrado.');
      return;
    }
    setData(prev => ({ ...prev, baldeacoes: [...prev.baldeacoes, digits] }));
    setNewBaldeacao('');
  };

  const removeBaldeacao = (cep: string) => {
    setData(prev => ({ ...prev, baldeacoes: prev.baldeacoes.filter(c => c !== cep) }));
  };

  const updateOperationalCost = (carrier: string, val: string) => {
    // garante que armazena número no estado
    const parsed = parseFloat(val.replace(',', '.'));
    const cost = Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
    setData(prev => ({
      ...prev,
      operationalCosts: {
        ...prev.operationalCosts,
        [carrier]: {
          ...(prev.operationalCosts[carrier] ?? { operationalCost: 0, samplePrice: null }),
          operationalCost: cost,
        }
      }
    }));
  };

  const applyPackagingExtras = () => {
    const n = parseFloat(normalCm.replace(',', '.'));
    const e = parseFloat(extraCm.replace(',', '.'));
    const normal = Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
    const extra = Number.isFinite(e) ? Number(e.toFixed(2)) : 0;
    setData(prev => ({ ...prev, packagingProtectionCm: { normal, extra } }));
    // persist immediate in local state (but still require saveAll to persist)
  };

  // onChange para o CEP com formatação
  const onChangeBaldeacao = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    const formatted = formatCep(digits);
    setNewBaldeacao(formatted);
  };

  // transformar objeto operationalCosts em array de chaves para o FlatList
  const carriers = Object.keys(data.operationalCosts ?? {});

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <Text style={styles.section}>Custos operacionais por transportadora</Text>

        <FlatList
          data={carriers}
          keyExtractor={(item) => item}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const entry = data.operationalCosts[item] ?? { operationalCost: 0 };
            return (
              <View style={styles.carrierBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.carrierName} numberOfLines={2}>{item}</Text>
                </View>

                <View style={{ width: 50, marginLeft: 8 }}>
                  <TextInput
                    value={String(entry.operationalCost ?? 0)}
                    onChangeText={(t) => updateOperationalCost(item, t)}
                    keyboardType="numeric"
                    style={styles.carrierInput}
                    underlineColorAndroid="transparent"
                  />
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={{ color: '#777' }}>Nenhuma transportadora configurada (o app pode gerar automaticamente).</Text>}
          style={{ marginBottom: 12 }}
        />

        <Text style={styles.section}>CEPs de baldeação</Text>
        <View style={styles.row}>
          <TextInput
            placeholder="00000-000"
            value={newBaldeacao}
            onChangeText={onChangeBaldeacao}
            style={[styles.input, { flex: 1 }]}
            keyboardType="numeric"
            maxLength={9} // 8 dígitos + '-'
          />
          <TouchableOpacity style={styles.addButton} onPress={addBaldeacao}>
            <Text style={{ color: '#fff' }}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={data.baldeacoes}
          keyExtractor={(item) => item}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text>{formatCep(item)}</Text>
              <TouchableOpacity onPress={() => removeBaldeacao(item)}><Text style={{ color: 'red' }}>Remover</Text></TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={{ color: '#777' }}>Nenhum CEP cadastrado.</Text>}
          style={{ maxHeight: 140, marginBottom: 6 }}
        />

        <Text style={styles.section}>Proteção (cm) adicionada às dimensões</Text>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={styles.legend}>Normal</Text>
            <TextInput placeholder="Normal (cm)" value={normalCm} onChangeText={setNormalCm} style={styles.input} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.legend}>Extra</Text>
            <TextInput placeholder="Extra (cm)" value={extraCm} onChangeText={setExtraCm} style={styles.input} keyboardType="numeric" />
          </View>
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.saveButton} onPress={() => { applyPackagingExtras(); saveAll(data); }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Salvar Personalização</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#007bff', marginLeft: 8 }]} onPress={async () => {
            try {
              const snapshot = await firebase.database().ref('/operationalCosts').once('value');
              const val = snapshot.val();
              if (val && Object.keys(val).length > 0) {
                // normalizar antes de setar
                const normalized: Record<string, OperationalEntry> = {};
                for (const k of Object.keys(val)) {
                  const raw = val[k];
                  const opRaw = raw?.operationalCost ?? raw;
                  const operationalCost = Number(String(opRaw).replace(',', '.')) || 0;
                  const samplePriceRaw = raw?.samplePrice ?? null;
                  const samplePrice = samplePriceRaw != null ? Number(samplePriceRaw) : null;
                  normalized[k] = { operationalCost: Number.isFinite(operationalCost) ? operationalCost : 0, samplePrice: Number.isFinite(samplePrice as number) ? (samplePrice as number) : null };
                }
                setData(prev => ({ ...prev, operationalCosts: normalized }));
                await AsyncStorage.setItem('personalization', JSON.stringify({ ...data, operationalCosts: normalized }));
                Alert.alert('Pronto', 'Lista de transportadoras atualizada a partir do banco.');
              } else {
                const created = await ensureOperationalCostsInDb();
                setData(prev => ({ ...prev, operationalCosts: created }));
                await AsyncStorage.setItem('personalization', JSON.stringify({ ...data, operationalCosts: created }));
                Alert.alert('Pronto', 'Lista criada e salva no banco.');
              }
            } catch (err: any) {
              console.error('Erro ao atualizar lista do DB:', err?.message ?? err);
              Alert.alert('Erro', 'Não foi possível atualizar a lista do banco.');
            }
          }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Atualizar lista de transportadoras</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f7f7f7', paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  section: { fontSize: 16, marginTop: 10, marginBottom: 6, fontWeight: '600' },
  legend: { fontSize: 12, color: '#444', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  input: { height: 44, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fff', fontSize: 14, textAlignVertical: 'center' },
  smallInput: { height: 36, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 8, backgroundColor: '#fff' },
  addButton: { backgroundColor: '#007bff', padding: 8, borderRadius: 6, marginLeft: 8 },
  saveButton: { backgroundColor: '#28a745', padding: 12, borderRadius: 6, alignItems: 'center', flex: 1 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, backgroundColor: '#fff', borderRadius: 6, marginVertical: 4, borderWidth: 1, borderColor: '#ddd' },
  buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 8 },
  carrierBox: {
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  carrierName: { fontWeight: '600', marginBottom: 0, fontSize: 13 },
  carrierInput: {
    height: 30,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#fff',
    fontSize: 14,
    textAlignVertical: 'center',
    textAlign: 'center',
  },
});

export default PersonalizationScreen;
