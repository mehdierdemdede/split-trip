import { Stack } from 'expo-router';
import { StyleSheet, ScrollView, View as RNView } from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radii, Spacing, sectionKicker, shadowCard } from '@/constants/theme';

export default function PrivacyScreen() {
  const c = Colors[useColorScheme() ?? 'light'];

  return (
    <>
      <Stack.Screen options={{ title: 'Privacy' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <RNView style={[styles.hero, { backgroundColor: c.surface, borderColor: c.border }, shadowCard]}>
          <Text style={[sectionKicker, { color: c.tint, marginBottom: 8 }]}>On-device</Text>
          <Text style={[styles.lead, { color: c.text }]}>
            Your data stays on this device. There is no account or server.
          </Text>
        </RNView>
        <Text style={[styles.body, { color: c.textSecondary }]}>
          You export and share trip backups (JSON); the app does not upload them automatically.
        </Text>
        <Text style={[styles.body, { color: c.textSecondary }]}>
          SplitTrip does not sell personal data, does not use advertising SDKs, and currently does not use
          third-party analytics.
        </Text>
        <Text style={[styles.body, { color: c.textSecondary }]}>
          Uninstalling the app or resetting the device deletes data permanently. Back up trips you care about.
        </Text>
        <Text style={[styles.caption, { color: c.textMuted }]}>Last updated: 2026-03-30</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  hero: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  lead: { fontSize: 17, fontWeight: '700', lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 24, marginBottom: 16 },
  caption: { fontSize: 12, lineHeight: 18 },
});
