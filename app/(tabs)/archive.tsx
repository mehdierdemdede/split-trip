import { Link, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View as RNView } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { Radii, Spacing, sectionKicker, shadowCard } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { listTripSummaries, type TripSummary } from '@/lib/repositories/tripRepository';

export default function ArchiveScreen() {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const [trips, setTrips] = useState<TripSummary[] | null>(null);

  const refresh = useCallback(() => {
    listTripSummaries(db, true)
      .then(setTrips)
      .catch(() => setTrips([]));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (trips === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={c.tint} />
      </View>
    );
  }

  if (trips.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[sectionKicker, { color: c.tint, marginBottom: Spacing.sm }]}>Past</Text>
        <Text style={[styles.title, { color: c.text }]}>Archive</Text>
        <Text style={[styles.body, { color: c.textSecondary }]}>
          Finished trips live here. When you archive a trip it leaves the main list; open it from here for
          the summary.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[sectionKicker, { color: c.tint, marginBottom: Spacing.xs }]}>Past</Text>
      <Text style={[styles.title, { color: c.text, marginBottom: Spacing.md }]}>Archive</Text>
      {trips.map((t) => (
        <ArchiveCard key={t.id} trip={t} />
      ))}
    </View>
  );
}

function ArchiveCard({ trip }: { trip: TripSummary }) {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  return (
    <Link href={`/trip/${trip.id}`} asChild>
      <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1, marginBottom: Spacing.md }]}>
        <RNView
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.border },
            shadowCard,
          ]}>
          <RNView style={[styles.archiveStripe, { backgroundColor: c.textMuted }]} />
          <RNView style={styles.cardInner}>
            <Text style={[styles.cardTitle, { color: c.text }]}>{trip.name}</Text>
            <Text style={[styles.cardMeta, { color: c.textMuted }]}>
              {trip.expenseCount} expense(s) · ~{trip.spentInBase} {trip.baseCurrency}
            </Text>
            {trip.fxIncompleteCount > 0 ? (
              <RNView style={[styles.warnPill, { backgroundColor: c.warningBg }]}>
                <Text style={[styles.cardWarn, { color: c.warning }]}>
                  FX missing: {trip.fxIncompleteCount}
                </Text>
              </RNView>
            ) : null}
          </RNView>
        </RNView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  archiveStripe: {
    width: 4,
    opacity: 0.85,
  },
  cardInner: {
    flex: 1,
    padding: Spacing.md,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 14,
    marginTop: 6,
  },
  warnPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
  },
  cardWarn: {
    fontSize: 12,
    fontWeight: '700',
  },
});
