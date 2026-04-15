import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Stack, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View as RNView,
} from 'react-native';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { Radii, Spacing, sectionKicker, shadowCard } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { importTripFromBackup } from '@/lib/repositories/tripRepository';
import { parseTripBackupV1 } from '@/lib/tripBackup';

export default function BackupImportScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const c = Colors[useColorScheme() ?? 'light'];
  const [busy, setBusy] = useState(false);

  async function pickAndImport() {
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) {
        Alert.alert('Backup', 'Could not select file.');
        return;
      }
      const raw = await readAsStringAsync(asset.uri);
      const backup = parseTripBackupV1(raw);
      await importTripFromBackup(db, backup);
      Alert.alert('Done', 'Trip imported.', [
        { text: 'Open', onPress: () => router.replace(`/trip/${backup.trip.id}`) },
        { text: 'Close', style: 'cancel' },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed.';
      Alert.alert('Backup', msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Import backup' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <RNView style={[styles.panel, { backgroundColor: c.surface, borderColor: c.border }, shadowCard]}>
          <Text style={[sectionKicker, { color: c.tint, marginBottom: Spacing.sm }]}>Import</Text>
          <Text style={[styles.panelText, { color: c.textSecondary }]}>
            Choose a .json file you exported from SplitTrip. Import is rejected if the same trip ID already
            exists on this device.
          </Text>
        </RNView>
        <Pressable
          disabled={busy}
          style={[styles.btn, { backgroundColor: c.tint }, shadowCard, busy && styles.btnDisabled]}
          onPress={pickAndImport}>
          {busy ? (
            <ActivityIndicator color={c.primaryButtonText} />
          ) : (
            <Text style={[styles.btnText, { color: c.primaryButtonText }]}>Choose JSON file</Text>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  panel: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  panelText: { fontSize: 15, lineHeight: 23 },
  btn: {
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { fontSize: 17, fontWeight: '700' },
});
