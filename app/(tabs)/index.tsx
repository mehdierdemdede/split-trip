import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View as RNView } from 'react-native';

import Colors from '@/constants/Colors';
import { Radii, Spacing, displayTitle, sectionKicker, shadowCard, shadowSoft } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

import { Text, View } from '@/components/Themed';
import { getTripDetail, listTripSummaries, type TripSummary } from '@/lib/repositories/tripRepository';
import { participantName } from '@/lib/seedData';
import { amountInBaseOverrideMap, ledgerFromExpenses } from '@/lib/split';
import { settlementFromBalances } from '@/lib/settlement';

export default function TripsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const [trips, setTrips] = useState<TripSummary[] | null>(null);

  const refresh = useCallback(() => {
    listTripSummaries(db, false)
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
        <ActivityIndicator size="large" color={c.tint} />
        <Text style={[styles.muted, { color: c.textMuted }]}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <RNView
        style={[
          styles.hero,
          { backgroundColor: c.surface, borderColor: c.border },
          shadowSoft,
        ]}>
        <RNView style={[styles.heroAccent, { backgroundColor: c.accentLine }]} />
        <Text style={[sectionKicker, styles.heroKicker, { color: c.tint }]}>
          On device · offline
        </Text>
        <Text style={[displayTitle, { color: c.text }]}>SplitTrip</Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Log expenses fast, see who owes whom clearly, and settle with the fewest transfers.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.newTripBtn,
            { backgroundColor: c.tint, opacity: pressed ? 0.92 : 1 },
            shadowCard,
          ]}
          onPress={() => router.push('/trip/new')}>
          <Text style={[styles.newTripBtnText, { color: c.primaryButtonText }]}>+ New trip</Text>
        </Pressable>
      </RNView>

      {trips.length === 0 ? (
        <RNView
          style={[
            styles.empty,
            { backgroundColor: c.surfaceSecondary, borderColor: c.border },
          ]}>
          <Text style={[styles.emptyTitle, { color: c.text }]}>No active trips yet</Text>
          <Text style={[styles.muted, { color: c.textMuted }]}>
            Create a new trip above or check the Archive tab.
          </Text>
        </RNView>
      ) : (
        trips.map((t) => (
          <RNView key={t.id} style={styles.tripBlock}>
            <TripPreviewCard trip={t} />
            <TripBalanceSnippet trip={t} db={db} compact />
          </RNView>
        ))
      )}
    </View>
  );
}

function TripPreviewCard({ trip }: { trip: TripSummary }) {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  return (
    <Link href={`/trip/${trip.id}`} asChild>
      <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}>
        <RNView
          style={[
            styles.card,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
            },
            shadowCard,
          ]}>
          <RNView style={[styles.cardStripe, { backgroundColor: c.tint }]} />
          <RNView style={styles.cardBody}>
            <Text style={[styles.cardTitle, { color: c.text }]}>{trip.name}</Text>
            {trip.destination ? (
              <Text style={[styles.cardDestination, { color: c.tintSecondary }]}>{trip.destination}</Text>
            ) : null}
            <Text style={[styles.cardMeta, { color: c.textMuted }]}>
              {trip.expenseCount} expense(s) · total ~{trip.spentInBase} {trip.baseCurrency}
            </Text>
            {trip.fxIncompleteCount > 0 ? (
              <RNView style={[styles.warnPill, { backgroundColor: c.warningBg }]}>
                <Text style={[styles.cardWarn, { color: c.warning }]}>
                  FX missing · {trip.fxIncompleteCount} expense(s)
                </Text>
              </RNView>
            ) : null}
            <Text style={[styles.cardCta, { color: c.tint }]}>Open trip →</Text>
          </RNView>
        </RNView>
      </Pressable>
    </Link>
  );
}

function TripBalanceSnippet({
  trip,
  db,
  compact,
}: {
  trip: TripSummary;
  db: SQLiteDatabase;
  compact?: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getTripDetail>>>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      getTripDetail(db, trip.id).then((d) => {
        if (!alive) return;
        setDetail(d);
        setLoading(false);
      });
      return () => {
        alive = false;
      };
    }, [db, trip.id])
  );

  if (loading) {
    return (
      <RNView style={styles.section}>
        <ActivityIndicator color={c.tint} />
      </RNView>
    );
  }

  if (!detail) return null;

  const ledger = ledgerFromExpenses(
    detail.expenses,
    detail.trip.baseCurrency,
    amountInBaseOverrideMap(detail.expenses)
  );
  const settlement = settlementFromBalances(
    Object.entries(ledger).map(([participantId, netBase]) => ({ participantId, netBase }))
  );
  const name = (id: string) => participantName(detail.participants, id);

  if (compact) {
    const lines = settlement.slice(0, 4).map((x, i) => (
      <Text key={i} style={[styles.compactLine, { color: c.textSecondary }]}>
        {name(x.from)} → {name(x.to)}: {x.amountBase} {detail.trip.baseCurrency}
      </Text>
    ));
    return (
      <RNView
        style={[
          styles.compactSection,
          { backgroundColor: c.surfaceSecondary, borderColor: c.border },
        ]}>
        <Text style={[styles.compactTitle, { color: c.textMuted }]}>Suggested settlement</Text>
        {settlement.length === 0 ? (
          <Text style={[styles.compactMuted, { color: c.success }]}>Balanced</Text>
        ) : (
          lines
        )}
        {settlement.length > 4 ? (
          <Text style={[styles.compactMore, { color: c.textMuted }]}>
            +{settlement.length - 4} more transfer(s) in trip
          </Text>
        ) : null}
      </RNView>
    );
  }

  return (
    <>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>Balances (base currency)</Text>
        {Object.entries(ledger).map(([id, net]) => (
          <Text key={id} style={[styles.line, { color: c.text }]}>
            {name(id)}: {net} {detail.trip.baseCurrency}
          </Text>
        ))}
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>Suggested settlement</Text>
        {settlement.length === 0 ? (
          <Text style={[styles.muted, { color: c.textMuted }]}>Nobody owes anyone right now.</Text>
        ) : (
          settlement.map((x, i) => (
            <Text key={i} style={[styles.line, { color: c.text }]}>
              {name(x.from)} → {name(x.to)}: {x.amountBase} {detail.trip.baseCurrency}
            </Text>
          ))
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  hero: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  heroKicker: {
    marginBottom: Spacing.sm,
  },
  sub: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  newTripBtn: {
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  newTripBtnText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  empty: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  tripBlock: {
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardStripe: {
    width: 5,
  },
  cardBody: {
    flex: 1,
    padding: Spacing.md,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  cardDestination: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
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
  cardCta: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  line: {
    fontSize: 15,
    lineHeight: 22,
  },
  muted: {
    fontSize: 15,
  },
  compactSection: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: -4,
    marginBottom: Spacing.sm,
  },
  compactTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactLine: {
    fontSize: 13,
    lineHeight: 19,
  },
  compactMuted: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactMore: {
    fontSize: 12,
    marginTop: 6,
  },
});
