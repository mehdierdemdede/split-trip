import { Stack, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { createTripWithParticipants } from '@/lib/repositories/tripRepository';

export default function NewTripScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const colors = Colors[useColorScheme() ?? 'light'];
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('EUR');
  const [participantsLine, setParticipantsLine] = useState('');
  const [saving, setSaving] = useState(false);

  const inputStyle = [
    styles.input,
    {
      color: colors.text,
      borderColor: colors.chipBorder,
      backgroundColor: colors.inputBg,
    },
  ];

  async function onSave() {
    const rawNames = participantsLine.split(/[,;\n]/).map((s) => s.trim());
    const participantNames = rawNames.filter(Boolean);
    setSaving(true);
    try {
      const { tripId } = await createTripWithParticipants(db, {
        name,
        destination: destination.trim() || undefined,
        baseCurrency: baseCurrency.trim() || 'EUR',
        participantNames,
      });
      router.replace(`/trip/${tripId}`);
    } catch (e) {
      Alert.alert('Could not create trip', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'New trip' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Trip name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Lisbon weekend"
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
            editable={!saving}
          />

          <Text style={styles.label}>Destination (optional)</Text>
          <TextInput
            value={destination}
            onChangeText={setDestination}
            placeholder="City / country"
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
            editable={!saving}
          />

          <Text style={styles.label}>Base currency</Text>
          <TextInput
            value={baseCurrency}
            onChangeText={(t) => setBaseCurrency(t.toUpperCase().slice(0, 3))}
            placeholder="EUR"
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
            autoCapitalize="characters"
            maxLength={3}
            editable={!saving}
          />

          <Text style={styles.label}>Participants * (comma or line separated)</Text>
          <TextInput
            value={participantsLine}
            onChangeText={setParticipantsLine}
            placeholder="Alice, Bob, Carol"
            placeholderTextColor={colors.textMuted}
            style={[inputStyle, styles.multiline]}
            multiline
            editable={!saving}
          />

          <Text style={styles.hint}>The first name is marked as the organizer on this device.</Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.tint, opacity: saving || !name.trim() ? 0.45 : pressed ? 0.85 : 1 },
            ]}
            onPress={onSave}
            disabled={saving || !name.trim()}>
            {saving ? (
              <ActivityIndicator color={colors.primaryButtonText} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryButtonText }]}>Create trip</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
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
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 13,
    opacity: 0.55,
    marginTop: 8,
    lineHeight: 18,
  },
  primaryBtn: {
    marginTop: 28,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
  },
});
