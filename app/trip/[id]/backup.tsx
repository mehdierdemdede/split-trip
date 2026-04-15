import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { Radii, Spacing, sectionKicker, shadowCard } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { listExpenseAuditForTrip } from '@/lib/repositories/expenseAuditRepository';
import { getTripDetail } from '@/lib/repositories/tripRepository';
import { buildTripBackupV1, serializeTripBackupV1 } from '@/lib/tripBackup';
import { shareJsonDocument } from '@/lib/tripBackupShare';

function paramId(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? '';
  return raw ?? '';
}

export default function TripBackupScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = paramId(idParam);
  const db = useSQLiteContext();
  const router = useRouter();
  const c = Colors[useColorScheme() ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getTripDetail>>>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      getTripDetail(db, id).then((d) => {
        if (!alive) return;
        setDetail(d);
        setLoading(false);
      });
      return () => {
        alive = false;
      };
    }, [db, id])
  );

  async function onExport() {
    if (!detail) return;
    setExporting(true);
    try {
      const audits = await listExpenseAuditForTrip(db, detail.trip.id);
      const backup = buildTripBackupV1(detail.trip, detail.participants, detail.expenses, audits);
      const json = serializeTripBackupV1(backup);
      const base = `SplitTrip-${detail.trip.name}-${detail.trip.id.slice(0, 8)}`;
      await shareJsonDocument(json, base);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Export failed.';
      Alert.alert('Backup', msg);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={c.tint} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: c.textMuted }}>Trip not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Backup' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <RNView style={[styles.panel, { backgroundColor: c.surface, borderColor: c.border }, shadowCard]}>
          <Text style={[sectionKicker, { color: c.tint, marginBottom: Spacing.sm }]}>Export</Text>
          <Text style={[styles.lead, { color: c.text }]}>Trip backup (JSON)</Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>
            Participants, expenses, and audit history in one file. Share it to Drive, Files, or your
            computer.
          </Text>
        </RNView>
        <Pressable
          disabled={exporting}
          style={[
            styles.btn,
            { backgroundColor: c.tint },
            shadowCard,
            exporting && styles.btnDisabled,
          ]}
          onPress={onExport}>
          <Text style={[styles.btnText, { color: c.primaryButtonText }]}>
            {exporting ? 'Preparing…' : 'Share as file'}
          </Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => router.push('/backup-import')}>
          <Text style={[styles.linkText, { color: c.tint }]}>Import another backup →</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  lead: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 23 },
  btn: {
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 17, fontWeight: '700' },
  link: { paddingVertical: 10 },
  linkText: { fontSize: 15, fontWeight: '700' },
});
