import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';

import { ExpenseFields } from '@/components/ExpenseFields';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { normalizeAmountInput } from '@/lib/amountInput';
import { newId } from '@/lib/ids';
import { getTripDetail, insertExpense } from '@/lib/repositories/tripRepository';
import type { Expense } from '@/lib/types';
import { equalSplitAmountsForIds, splitModeForExpense, validateCustomSplit } from '@/lib/split';

function useTripIdParam(): string {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return Array.isArray(tripId) ? tripId[0] : tripId;
}

export default function NewExpenseScreen() {
  const tripId = useTripIdParam();
  const db = useSQLiteContext();
  const router = useRouter();
  const colors = Colors[useColorScheme() ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<{ id: string; name: string }[]>([]);
  const [baseCurrency, setBaseCurrency] = useState('EUR');

  const [amountRaw, setAmountRaw] = useState('');
  const [currency, setCurrency] = useState('');
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [splitKind, setSplitKind] = useState<'equal' | 'custom'>('equal');
  const [customParts, setCustomParts] = useState<Record<string, string>>({});
  const [amountInBaseRaw, setAmountInBaseRaw] = useState('');

  const includedIds = useMemo(
    () => Object.keys(included).filter((id) => included[id]),
    [included]
  );

  const onSplitKindChange = useCallback(
    (k: 'equal' | 'custom') => {
      if (k === 'custom') {
        try {
          const a = normalizeAmountInput(amountRaw);
          setCustomParts(equalSplitAmountsForIds(a, includedIds));
        } catch {
          const o: Record<string, string> = {};
          for (const id of includedIds) o[id] = '0.00';
          setCustomParts(o);
        }
      }
      setSplitKind(k);
    },
    [amountRaw, includedIds]
  );

  useEffect(() => {
    if (splitKind !== 'custom') return;
    setCustomParts((prev) => {
      const n = { ...prev };
      for (const id of includedIds) {
        if (!(id in n)) n[id] = '0.00';
      }
      for (const k of Object.keys(n)) {
        if (!includedIds.includes(k)) delete n[k];
      }
      return n;
    });
  }, [splitKind, includedIds]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!tripId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const detail = await getTripDetail(db, tripId);
      if (!alive) return;
      if (!detail) {
        setLoading(false);
        return;
      }
      if (detail.trip.archived) {
        setLoading(false);
        Alert.alert('Archived', 'You cannot add expenses to an archived trip.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }
      setBaseCurrency(detail.trip.baseCurrency);
      setCurrency(detail.trip.baseCurrency);
      const plist = detail.participants.map((p) => ({ id: p.id, name: p.displayName }));
      setParticipants(plist);
      const first = plist[0]?.id ?? null;
      setPaidBy(first);
      const inc: Record<string, boolean> = {};
      for (const p of plist) inc[p.id] = true;
      setIncluded(inc);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [db, tripId, router]);

  function setCustomPart(participantId: string, raw: string) {
    setCustomParts((prev) => ({ ...prev, [participantId]: raw }));
  }

  async function onSave() {
    if (!tripId || !paidBy) return;
    let amount: string;
    try {
      amount = normalizeAmountInput(amountRaw);
    } catch (e) {
      Alert.alert('Amount', e instanceof Error ? e.message : 'Invalid');
      return;
    }
    const cur = (currency.trim() || baseCurrency).toUpperCase().slice(0, 3);
    if (cur.length !== 3) {
      Alert.alert('Currency', 'Enter 3 letters (e.g. EUR).');
      return;
    }
    const baseCode = baseCurrency.trim().toUpperCase().slice(0, 3);
    let amountInBase: string | undefined;
    if (cur !== baseCode) {
      try {
        amountInBase = normalizeAmountInput(amountInBaseRaw);
      } catch (e) {
        Alert.alert('Amount in base currency', e instanceof Error ? e.message : 'Invalid amount');
        return;
      }
    }
    if (includedIds.length === 0) {
      Alert.alert('Split', 'At least one person must be included.');
      return;
    }
    if (!includedIds.includes(paidBy)) {
      Alert.alert('Paid by', 'The payer must be included in the split.');
      return;
    }

    let customSplit: Record<string, string> | undefined;
    let splitMode = splitModeForExpense(participants.length, includedIds.length, splitKind === 'custom');

    if (splitKind === 'custom') {
      const cs: Record<string, string> = {};
      try {
        for (const id of includedIds) {
          cs[id] = normalizeAmountInput(customParts[id] ?? '0');
        }
      } catch (e) {
        Alert.alert('Custom split', e instanceof Error ? e.message : 'Invalid amount');
        return;
      }
      const probe: Expense = {
        id: '_',
        tripId,
        amount,
        currency: cur,
        paidBy,
        participantIds: includedIds,
        splitMode: 'custom',
        customSplit: cs,
        occurredAt: '',
        createdAt: '',
      };
      if (!validateCustomSplit(probe)) {
        Alert.alert('Custom split', 'Per-person amounts must add up to the total.');
        return;
      }
      customSplit = cs;
      splitMode = 'custom';
    }

    const now = new Date().toISOString();
    const expense: Expense = {
      id: newId(),
      tripId,
      amount,
      currency: cur,
      amountInBase,
      paidBy,
      participantIds: includedIds,
      splitMode,
      customSplit,
      title: title.trim() || undefined,
      category,
      occurredAt: now,
      createdAt: now,
    };

    setSaving(true);
    try {
      await insertExpense(db, expense);
      router.back();
    } catch (e) {
      Alert.alert('Save', e instanceof Error ? e.message : 'Could not add expense');
    } finally {
      setSaving(false);
    }
  }

  if (!tripId) {
    return (
      <View style={styles.centered}>
        <Text>Missing trip ID</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (participants.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>This trip has no participants.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Add expense' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ExpenseFields
            colors={colors}
            amountRaw={amountRaw}
            setAmountRaw={setAmountRaw}
            currency={currency}
            setCurrency={setCurrency}
            baseCurrency={baseCurrency}
            participants={participants}
            paidBy={paidBy}
            setPaidBy={setPaidBy}
            included={included}
            toggleIncluded={(pid) => setIncluded((prev) => ({ ...prev, [pid]: !prev[pid] }))}
            title={title}
            setTitle={setTitle}
            category={category}
            setCategory={setCategory}
            saving={saving}
            amountInBaseRaw={amountInBaseRaw}
            setAmountInBaseRaw={setAmountInBaseRaw}
            splitKind={splitKind}
            onSplitKindChange={onSplitKindChange}
            customParts={customParts}
            setCustomPart={setCustomPart}
          />

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.tint, opacity: saving ? 0.45 : pressed ? 0.85 : 1 },
            ]}
            onPress={onSave}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.primaryButtonText} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryButtonText }]}>Save</Text>
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
  primaryBtn: {
    marginTop: 28,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700' },
});
