import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

type LoyaltyCard = {
  id: string;
  name: string;
  code: string;
  codeType: 'barcode' | 'qrcode';
  color?: string;
  dateAdded: number;
};

async function addCard(card: LoyaltyCard) {
  console.log('Saving card:', card);
}

function getFirstParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] ?? '';
  return param ?? '';
}

export default function Success() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const code = getFirstParam(params.code);
  const store = getFirstParam(params.store);
  const type = getFirstParam(params.type);

  const [name, setName] = useState(store);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setError('');
    if (!code.trim()) {
      setError('Musíte zadať kód');
      return;
    }
    if (!name.trim()) {
      setError('Musíte zadať názov karty');
      return;
    }
    setLoading(true);
    try {
      const newCard: LoyaltyCard = {
        id: Date.now().toString(),
        name: name.trim(),
        code: code.trim(),
        codeType: type === 'qrcode' ? 'qrcode' : 'barcode',
        dateAdded: Date.now(),
      };
      await addCard(newCard);
      setSaved(true);
    } catch {
      setError('Chyba pri ukladaní karty.');
    } finally {
      setLoading(false);
    }
  };

  if (saved) {
    return (
      <View style={styles.container}>
        <Text style={styles.successText}>Karta bola úspešne uložená!</Text>
        <Button title="Domov" onPress={() => router.replace('/')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Uložiť kartu</Text>

      <Text style={styles.label}>Kód:</Text>
      <Text selectable style={styles.codeText}>
        {code}
      </Text>

      <Text style={styles.label}>Názov karty:</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Zadajte názov karty"
        editable={!loading}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Button title={loading ? 'Ukladám...' : 'Uložiť'} onPress={handleSave} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, marginTop: 12, marginBottom: 4 },
  codeText: { fontSize: 18, marginBottom: 12, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  errorText: { color: 'red', marginBottom: 12 },
  successText: { fontSize: 20, color: 'green', marginBottom: 20, textAlign: 'center' },
});
