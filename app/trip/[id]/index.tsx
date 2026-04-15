import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View as RNView,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { Radii, Spacing, sectionKicker, shadowCard } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { deleteTrip, getTripDetail, setTripArchived } from '@/lib/repositories/tripRepository';
import { participantName } from '@/lib/seedData';
import { sharesForExpense } from '@/lib/split';

function paramId(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? '';
  return raw ?? '';
}

export default function TripDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = paramId(idParam);
  const db = useSQLiteContext();
  const router = useRouter();
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

  function confirmUnarchive() {
    if (!detail) return;
    Alert.alert('Unarchive trip?', 'The trip will appear on the main list again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unarchive',
        onPress: async () => {
          try {
            await setTripArchived(db, detail.trip.id, false);
            const d = await getTripDetail(db, detail.trip.id);
            setDetail(d);
          } catch {
            Alert.alert('Error', 'Something went wrong.');
          }
        },
      },
    ]);
  }

  function confirmArchive() {
    if (!detail) return;
    Alert.alert(
      'Archive this trip?',
      'It will disappear from the main list; you can still open it from the Archive tab.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await setTripArchived(db, detail.trip.id, true);
              router.replace('/');
            } catch {
              Alert.alert('Error', 'Could not archive.');
            }
          },
        },
      ]
    );
  }

  function confirmDeleteTrip() {
    if (!detail) return;
    const name = detail.trip.name;
    const tripId = detail.trip.id;
    Alert.alert(
      'Delete trip permanently?',
      `“${name}” and all expenses and any data not backed up will be removed from this device. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Are you sure?', 'Please confirm one more time.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete permanently',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteTrip(db, tripId);
                    router.replace('/');
                  } catch {
                    Alert.alert('Error', 'Could not delete trip.');
                  }
                },
              },
            ]);
          },
        },
      ]
    );
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
        <Text style={[styles.title, { color: c.text }]}>Trip not found</Text>
        <Text style={[styles.muted, { color: c.textMuted }]}>ID: {id}</Text>
      </View>
    );
  }

  const { trip, participants, expenses } = detail;

  return (
    <>
      <Stack.Screen
        options={{
          title: trip.name,
          headerRight: () =>
            trip.archived ? null : (
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/expense/new', params: { tripId: trip.id } })
                }
                style={({ pressed }) => ({
                  marginRight: 16,
                  opacity: pressed ? 0.7 : 1,
                  padding: 4,
                })}
                accessibilityLabel="Add expense">
                <FontAwesome name="plus-circle" size={26} color={c.tint} />
              </Pressable>
            ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {trip.archived ? (
          <RNView style={[styles.banner, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
            <Text style={[styles.bannerText, { color: c.text }]}>This trip is archived.</Text>
            <RNView style={styles.bannerActions}>
              <Pressable
                style={[styles.unarchiveBtn, { backgroundColor: c.chipBgActive }]}
                onPress={confirmUnarchive}>
                <Text style={[styles.unarchiveBtnText, { color: c.tint }]}>Unarchive</Text>
              </Pressable>
              <Pressable
                style={[styles.bannerDeleteBtn, { borderColor: c.dangerBorder }]}
                onPress={confirmDeleteTrip}>
                <Text style={[styles.bannerDeleteText, { color: c.danger }]}>Delete permanently</Text>
              </Pressable>
            </RNView>
          </RNView>
        ) : null}

        <RNView style={styles.actionsRow}>
          <ActionChip label="Summary" onPress={() => router.push(`/trip/${trip.id}/summary`)} />
          <ActionChip label="Backup" onPress={() => router.push(`/trip/${trip.id}/backup`)} />
          {!trip.archived ? (
            <>
              <ActionChip label="Settings" onPress={() => router.push(`/trip/${trip.id}/edit`)} />
              <ActionChip
                label="Participant"
                onPress={() => router.push(`/trip/${trip.id}/add-participant`)}
              />
            </>
          ) : null}
        </RNView>

        <Text style={[sectionKicker, { color: c.tint, marginBottom: 6 }]}>Transparent splits</Text>
        <Text style={[styles.headline, { color: c.text }]}>Expenses</Text>

        {expenses.length === 0 ? (
          <Text style={[styles.muted, { color: c.textMuted }]}>
            No expenses yet. Tap + in the top right to add one.
          </Text>
        ) : null}

        {expenses.map((e) => {
          const shares = sharesForExpense(e);
          const fxMissing =
            e.currency.trim().toUpperCase() !== trip.baseCurrency.trim().toUpperCase() &&
            (e.amountInBase == null || e.amountInBase === '');
          return (
            <Pressable
              key={e.id}
              style={({ pressed }) => [{ opacity: pressed ? 0.97 : 1, marginBottom: Spacing.md }]}
              onPress={() => router.push(`/expense/${e.id}`)}>
              <RNView
                style={[
                  styles.expenseCard,
                  { backgroundColor: c.surface, borderColor: c.border },
                  shadowCard,
                ]}>
                <RNView style={[styles.expenseAccent, { backgroundColor: c.accentLine }]} />
                <RNView style={styles.expenseInner}>
                  <RNView style={styles.expenseTopRow}>
                    <Text style={[styles.expenseTitle, { color: c.text }]}>{e.title ?? 'Expense'}</Text>
                    <RNView style={[styles.amountPill, { backgroundColor: c.chipBg }]}>
                      <Text style={[styles.amountPillText, { color: c.tint }]}>
                        {e.amount} {e.currency}
                      </Text>
                    </RNView>
                  </RNView>
                  <Text style={[styles.expenseMeta, { color: c.textMuted }]}>
                    Paid by: {participantName(participants, e.paidBy)}
                  </Text>
                  {e.currency.trim().toUpperCase() !== trip.baseCurrency.trim().toUpperCase() &&
                  e.amountInBase ? (
                    <Text style={[styles.fxLine, { color: c.success }]}>
                      ≈ {e.amountInBase} {trip.baseCurrency} (balance)
                    </Text>
                  ) : null}
                  {fxMissing ? (
                    <RNView style={[styles.fxBanner, { backgroundColor: c.warningBg }]}>
                      <Text style={[styles.fxWarn, { color: c.warning }]}>
                        No amount in base currency — needed for balances
                      </Text>
                    </RNView>
                  ) : null}
                  <Text style={[styles.expenseMeta, { color: c.textSecondary, marginTop: 8 }]}>
                    {e.splitMode} ·{' '}
                    {e.participantIds.map((pid) => participantName(participants, pid)).join(', ')}
                  </Text>
                  <RNView style={[styles.shareBlock, { borderTopColor: c.border }]}>
                    {Object.entries(shares).map(([pid, amt]) => (
                      <Text key={pid} style={[styles.shareLine, { color: c.text }]}>
                        {participantName(participants, pid)} → {amt} {e.currency}
                      </Text>
                    ))}
                  </RNView>
                  <Text style={[styles.tapHint, { color: c.textMuted }]}>
                    {trip.archived ? 'Read-only · details →' : 'Tap to edit →'}
                  </Text>
                </RNView>
              </RNView>
            </Pressable>
          );
        })}

        {!trip.archived ? (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.archiveBtn,
                {
                  borderColor: c.dangerBorder,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={confirmArchive}>
              <Text style={[styles.archiveBtnText, { color: c.danger }]}>Archive trip</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.deleteTripBtn,
                { borderColor: c.dangerBorder, opacity: pressed ? 0.88 : 1 },
              ]}
              onPress={confirmDeleteTrip}>
              <Text style={[styles.deleteTripBtnText, { color: c.danger }]}>
                Delete trip permanently
              </Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

function ActionChip({ label, onPress }: { label: string; onPress: () => void }) {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionChip,
        {
          backgroundColor: c.chipBg,
          borderColor: c.chipBorder,
          opacity: pressed ? 0.88 : 1,
        },
      ]}>
      <Text style={[styles.actionChipText, { color: c.tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.md,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  actionChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  banner: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  bannerText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  bannerActions: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  unarchiveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: Radii.pill,
  },
  unarchiveBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  bannerDeleteBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  bannerDeleteText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  muted: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 15,
  },
  expenseCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  expenseAccent: {
    width: 4,
  },
  expenseInner: {
    flex: 1,
    padding: Spacing.md,
  },
  expenseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  amountPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  amountPillText: {
    fontSize: 14,
    fontWeight: '800',
  },
  tapHint: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  expenseTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  expenseMeta: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  fxLine: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '700',
  },
  fxBanner: {
    marginTop: 10,
    padding: 10,
    borderRadius: Radii.sm,
  },
  fxWarn: {
    fontSize: 12,
    fontWeight: '700',
  },
  shareBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  shareLine: {
    fontSize: 14,
    lineHeight: 21,
  },
  archiveBtn: {
    marginTop: Spacing.lg,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: Radii.lg,
    borderWidth: 1.5,
  },
  archiveBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  deleteTripBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: Radii.lg,
    borderWidth: 1.5,
  },
  deleteTripBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
