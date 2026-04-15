import * as Clipboard from 'expo-clipboard';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Alert,
  View as RNView,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radii, Spacing, sectionKicker, shadowCard } from '@/constants/theme';
import { formatDecimal, parseDecimal } from '@/lib/money';
import { getTripDetail } from '@/lib/repositories/tripRepository';
import { participantName } from '@/lib/seedData';
import { amountInBaseOverrideMap, ledgerFromExpenses } from '@/lib/split';
import { settlementFromBalances } from '@/lib/settlement';
import {
  buildTripShareText,
  categoryTotalsInBase,
  paidByTotalsInBase,
  recentExpenseLineItems,
  topPayerId,
  tripFxMissingCount,
  tripSpentTotal,
} from '@/lib/tripSummary';

type TripDetailLoaded = NonNullable<Awaited<ReturnType<typeof getTripDetail>>>;

function buildSummaryShareMessage(detail: TripDetailLoaded): string {
  const base = detail.trip.baseCurrency;
  const overrides = amountInBaseOverrideMap(detail.expenses);
  const ledger = ledgerFromExpenses(detail.expenses, base, overrides);
  const settlement = settlementFromBalances(
    Object.entries(ledger).map(([participantId, netBase]) => ({ participantId, netBase }))
  );
  return buildTripShareText({
    trip: detail.trip,
    participants: detail.participants,
    expenses: detail.expenses,
    ledger,
    settlement,
  });
}

function paramId(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? '';
  return raw ?? '';
}

export default function TripSummaryScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = paramId(idParam);
  const db = useSQLiteContext();
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  const [loading, setLoading] = useState(true);
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

  async function onShare() {
    if (!detail) return;
    const message = buildSummaryShareMessage(detail);
    try {
      await Share.share({ message, title: detail.trip.name });
    } catch {
      Alert.alert('Share', 'Could not open the share sheet.');
    }
  }

  async function onCopy() {
    if (!detail) return;
    const message = buildSummaryShareMessage(detail);
    try {
      await Clipboard.setStringAsync(message);
      Alert.alert('Clipboard', 'Summary copied.');
    } catch {
      Alert.alert('Clipboard', 'Could not copy.');
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
        <Text>Trip not found</Text>
      </View>
    );
  }

  const { trip, participants, expenses } = detail;
  const base = trip.baseCurrency;
  const total = tripSpentTotal(expenses, base);
  const fxMiss = tripFxMissingCount(expenses, base);
  const pCount = participants.length || 1;
  const perHead = formatDecimal(parseDecimal(total) / pCount);
  const cats = categoryTotalsInBase(expenses, base);
  const paidMap = paidByTotalsInBase(expenses, base);
  const topPay = topPayerId(paidMap);
  const overrides = amountInBaseOverrideMap(expenses);
  const ledger = ledgerFromExpenses(expenses, base, overrides);
  const settlement = settlementFromBalances(
    Object.entries(ledger).map(([participantId, netBase]) => ({ participantId, netBase }))
  );
  const name = (pid: string) => participantName(participants, pid);
  const recentItems = recentExpenseLineItems(expenses, base, participants, 15);

  return (
    <>
      <Stack.Screen options={{ title: 'Trip summary' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[sectionKicker, { color: c.tint, marginBottom: 6 }]}>Summary</Text>
        <Text style={[styles.lead, { color: c.text }]}>{trip.name}</Text>
        {trip.destination ? (
          <Text style={[styles.meta, { color: c.textSecondary }]}>{trip.destination}</Text>
        ) : null}

        <RNView style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, shadowCard]}>
          <Text style={[styles.cardTitle, { color: c.textMuted }]}>Total</Text>
          <Text style={[styles.big, { color: c.text }]}>
            {total} {base}
          </Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            {expenses.length} expense(s) · ~{perHead} {base} per person ({pCount} people)
          </Text>
          {fxMiss > 0 ? (
            <RNView style={[styles.warnBox, { backgroundColor: c.warningBg }]}>
              <Text style={[styles.warn, { color: c.warning }]}>
                {fxMiss} expense(s) missing amount in base currency; total may be incomplete.
              </Text>
            </RNView>
          ) : null}
        </RNView>

        {cats.length > 0 ? (
          <RNView style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, shadowCard]}>
            <Text style={[styles.cardTitle, { color: c.textMuted }]}>Categories</Text>
            {cats.map((cat) => (
              <Text key={cat.label} style={[styles.row, { color: c.text }]}>
                {cat.label}: {cat.total} {base}
              </Text>
            ))}
          </RNView>
        ) : null}

        {topPay && Number(paidMap[topPay] ?? 0) > 0 ? (
          <RNView style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, shadowCard]}>
            <Text style={[styles.cardTitle, { color: c.textMuted }]}>Top payer</Text>
            <Text style={[styles.row, { color: c.text }]}>
              {name(topPay)} — {paidMap[topPay]} {base}
            </Text>
          </RNView>
        ) : null}

        <RNView style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, shadowCard]}>
          <Text style={[styles.cardTitle, { color: c.textMuted }]}>Balance summary</Text>
          {Object.entries(ledger).map(([pid, net]) => (
            <Text key={pid} style={[styles.row, { color: c.text }]}>
              {name(pid)}: {net} {base}
            </Text>
          ))}
        </RNView>

        <RNView style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, shadowCard]}>
          <Text style={[styles.cardTitle, { color: c.textMuted }]}>Suggested settlement</Text>
          {settlement.length === 0 ? (
            <Text style={[styles.muted, { color: c.textMuted }]}>No transfers needed or all settled.</Text>
          ) : (
            settlement.map((s, i) => (
              <Text key={i} style={[styles.row, { color: c.text }]}>
                {name(s.from)} → {name(s.to)}: {s.amountBase} {base}
              </Text>
            ))
          )}
        </RNView>

        <RNView style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, shadowCard]}>
          <Text style={[styles.cardTitle, { color: c.textMuted }]}>Recent expenses</Text>
          {recentItems.length === 0 ? (
            <Text style={[styles.muted, { color: c.textMuted }]}>No expenses yet.</Text>
          ) : (
            <>
              {recentItems.map((it) => (
                <RNView key={it.id} style={styles.expItem}>
                  <Text style={[styles.expTitle, { color: c.text }]}>
                    {it.dateLabel} · {it.title}
                  </Text>
                  <Text style={[styles.row, { color: c.textSecondary }]}>
                    {it.amountCurrency} · {it.payerName}
                  </Text>
                  {it.baseNote ? (
                    <Text
                      style={[
                        styles.expBase,
                        { color: it.baseNote === 'FX missing' ? c.warning : c.textMuted },
                        it.baseNote === 'FX missing' && { fontWeight: '700' as const },
                      ]}>
                      {it.baseNote}
                    </Text>
                  ) : null}
                </RNView>
              ))}
              {expenses.length > 15 ? (
                <Text style={[styles.muted, { color: c.textMuted }]}>
                  +{expenses.length - 15} more expense(s) in trip
                </Text>
              ) : null}
            </>
          )}
        </RNView>

        <RNView style={styles.btnRow}>
          <Pressable
            style={[styles.halfBtn, { backgroundColor: c.tint }]}
            onPress={onShare}>
            <Text style={[styles.shareBtnText, { color: c.primaryButtonText }]}>Share</Text>
          </Pressable>
          <Pressable
            style={[styles.halfBtn, styles.outlineBtn, { borderColor: c.border, backgroundColor: c.surface }]}
            onPress={onCopy}>
            <Text style={[styles.shareBtnText, { color: c.text }]}>Copy to clipboard</Text>
          </Pressable>
        </RNView>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  lead: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4, marginBottom: 4 },
  meta: { fontSize: 15, marginBottom: Spacing.md, fontWeight: '600' },
  card: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  big: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  warnBox: { marginTop: 12, padding: 12, borderRadius: Radii.sm },
  warn: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  row: { fontSize: 15, lineHeight: 22, marginBottom: 4 },
  muted: { fontSize: 14 },
  expItem: { marginBottom: 12 },
  expTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  expBase: { fontSize: 13, marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: Spacing.sm },
  halfBtn: {
    flex: 1,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtn: {
    borderWidth: 1.5,
  },
  shareBtnText: { fontSize: 16, fontWeight: '700' },
});
