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
import { getTripDetail, insertTripParticipant } from '@/lib/repositories/tripRepository';

function paramId(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? '';
  return raw ?? '';
}

export default function AddParticipantScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const tripId = paramId(idParam);
  const db = useSQLiteContext();
  const router = useRouter();
  const colors = Colors[useColorScheme() ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [archived, setArchived] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!tripId) {
        setLoading(false);
        return;
      }
      const d = await getTripDetail(db, tripId);
      if (!alive) return;
      if (!d) {
        setLoading(false);
        return;
      }
      if (d.trip.archived) {
        setArchived(true);
        Alert.alert('Archived', 'You cannot add participants to an archived trip.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [db, tripId, router]);

  const inputStyle = [
    styles.input,
    {
      color: colors.text,
      borderColor: colors.chipBorder,
      backgroundColor: colors.inputBg,
    },
  ];

  async function onSave() {
    if (!tripId || archived) return;
    setSaving(true);
    try {
      await insertTripParticipant(db, { tripId, displayName, kind: 'passive' });
      router.back();
    } catch (e) {
      Alert.alert('Save', e instanceof Error ? e.message : 'Could not add');
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

  if (archived) {
    return (
      <View style={styles.centered}>
        <Text>Archived trip</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Add participant' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>
            Added as a passive participant; you include them when splitting expenses.
          </Text>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Alex"
            style={inputStyle}
            editable={!saving}
            placeholderTextColor={colors.textMuted}
          />
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.tint, opacity: saving ? 0.45 : pressed ? 0.85 : 1 },
            ]}
            onPress={onSave}
            disabled={saving || !displayName.trim()}>
            {saving ? (
              <ActivityIndicator color={colors.primaryButtonText} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryButtonText }]}>Add</Text>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  hint: { fontSize: 14, lineHeight: 20, opacity: 0.7, marginBottom: 8 },
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
  primaryBtn: {
    marginTop: 28,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700' },
});
