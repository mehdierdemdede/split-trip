import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { getTripDetail, updateTripDetails } from '@/lib/repositories/tripRepository';

function paramId(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? '';
  return raw ?? '';
}

export default function EditTripScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = paramId(idParam);
  const db = useSQLiteContext();
  const router = useRouter();
  const colors = Colors[useColorScheme() ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      const d = await getTripDetail(db, id);
      if (!alive) return;
      if (!d) {
        setLoading(false);
        return;
      }
      if (d.trip.archived) {
        Alert.alert('Archived', 'Archived trips cannot be edited.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        setLoading(false);
        return;
      }
      setName(d.trip.name);
      setDestination(d.trip.destination ?? '');
      setStartDate(d.trip.startDate ?? '');
      setEndDate(d.trip.endDate ?? '');
      setBaseCurrency(d.trip.baseCurrency);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [db, id, router]);

  const inputStyle = [
    styles.input,
    {
      color: colors.text,
      borderColor: colors.chipBorder,
      backgroundColor: colors.inputBg,
    },
  ];

  async function onSave() {
    if (!id) return;
    setSaving(true);
    try {
      await updateTripDetails(db, id, {
        name,
        destination: destination.trim() || null,
        startDate: startDate.trim() || null,
        endDate: endDate.trim() || null,
      });
      router.back();
    } catch (e) {
      Alert.alert('Save', e instanceof Error ? e.message : 'Could not update');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Trip settings' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Trip name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={inputStyle}
            editable={!saving}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Destination</Text>
          <TextInput
            value={destination}
            onChangeText={setDestination}
            style={inputStyle}
            editable={!saving}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Start (YYYY-MM-DD)</Text>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            style={inputStyle}
            editable={!saving}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>End (YYYY-MM-DD)</Text>
          <TextInput
            value={endDate}
            onChangeText={setEndDate}
            style={inputStyle}
            editable={!saving}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.readonly}>Base currency: {baseCurrency} (cannot be changed for now)</Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.tint, opacity: saving ? 0.45 : pressed ? 0.85 : 1 },
            ]}
            onPress={onSave}
            disabled={saving || !name.trim()}>
            {saving ? (
              <ActivityIndicator color={colors.primaryButtonText} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryButtonText }]}>Save</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    opacity: 0.75,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  readonly: {
    marginTop: 16,
    fontSize: 13,
    opacity: 0.5,
  },
  primaryBtn: {
    marginTop: 28,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700' },
});
