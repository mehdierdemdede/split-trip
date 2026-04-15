import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet, View as RNView } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { Radii, Spacing, displayTitle, sectionKicker, shadowCard } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

export default function ModalScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  return (
    <View style={styles.screen}>
      <RNView style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, shadowCard]}>
        <RNView style={[styles.accentBar, { backgroundColor: c.accentLine }]} />
        <RNView style={styles.cardInner}>
          <Text style={[sectionKicker, { color: c.tint, marginBottom: Spacing.sm }]}>About</Text>
          <Text style={[displayTitle, { color: c.text, fontSize: 28, lineHeight: 34 }]}>SplitTrip</Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>
            Trip-first group expenses and settlement. The goal is less tension, not accounting perfection: quick
            entry, transparent splits, and the fewest transfers to settle up.
          </Text>
          <Link href="/privacy" asChild>
            <Pressable style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}>
              <Text style={[styles.linkText, { color: c.tint }]}>Privacy & data</Text>
            </Pressable>
          </Link>
          <Link href="/backup-import" asChild>
            <Pressable style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}>
              <Text style={[styles.linkText, { color: c.tint }]}>Import trip from backup</Text>
            </Pressable>
          </Link>
        </RNView>
      </RNView>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  card: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  cardInner: {
    padding: Spacing.lg,
  },
  body: {
    fontSize: 16,
    lineHeight: 25,
    marginBottom: Spacing.md,
  },
  linkBtn: {
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
