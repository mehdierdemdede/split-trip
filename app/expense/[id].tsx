import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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

import { ExpenseAuditTrail } from '@/components/ExpenseAuditTrail';
import { ExpenseFields } from '@/components/ExpenseFields';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { normalizeAmountInput } from '@/lib/amountInput';
import {
  deleteExpense,
  getExpenseById,
  getTripDetail,
  updateExpense,
} from '@/lib/repositories/tripRepository';
import { listExpenseAudit, type ExpenseAuditEntry } from '@/lib/repositories/expenseAuditRepository';
import type { Expense } from '@/lib/types';
import {
  equalSplitAmountsForIds,
  sharesForExpense,
  splitModeForExpense,
  validateCustomSplit,
} from '@/lib/split';

function paramExpenseId(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? '';
  return raw ?? '';
}

export default function EditExpenseScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const expenseId = paramExpenseId(idParam);
  const db = useSQLiteContext();
  const router = useRouter();
  const colors = Colors[useColorScheme() ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [participants, setParticipants] = useState<{ id: string; name: string }[]>([]);
  const [baseCurrency, setBaseCurrency] = useState('EUR');
  const [tripArchived, setTripArchived] = useState(false);

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
  const [audit, setAudit] = useState<ExpenseAuditEntry[]>([]);

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
      if (!expenseId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const ex = await getExpenseById(db, expenseId);
      if (!alive) return;
      if (!ex) {
        setExpense(null);
        setLoading(false);
        return;
      }
      const detail = await getTripDetail(db, ex.tripId);
      if (!alive) return;
      if (!detail) {
        setExpense(null);
        setLoading(false);
        return;
      }
      setTripArchived(detail.trip.archived);
      setExpense(ex);
      setBaseCurrency(detail.trip.baseCurrency);
      setAmountRaw(ex.amount);
      setCurrency(ex.currency);
      setPaidBy(ex.paidBy);
      const inc: Record<string, boolean> = {};
      for (const p of detail.participants) {
        inc[p.id] = ex.participantIds.includes(p.id);
      }
      setIncluded(inc);
      setTitle(ex.title ?? '');
      setCategory(ex.category);
      setAmountInBaseRaw(ex.amountInBase ?? '');
      setSplitKind(ex.splitMode === 'custom' ? 'custom' : 'equal');
      if (ex.splitMode === 'custom' && ex.customSplit) {
        setCustomParts({ ...ex.customSplit });
      } else {
        setCustomParts({});
      }
      setParticipants(detail.participants.map((p) => ({ id: p.id, name: p.displayName })));
      const entries = await listExpenseAudit(db, expenseId);
      if (!alive) return;
      setAudit(entries);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [db, expenseId]);

  useFocusEffect(
    useCallback(() => {
      if (!expenseId) return;
      listExpenseAudit(db, expenseId).then(setAudit);
    }, [db, expenseId])
  );

  function setCustomPart(participantId: string, raw: string) {
    setCustomParts((prev) => ({ ...prev, [participantId]: raw }));
  }

  function toggleIncluded(pid: string) {
    setIncluded((prev) => ({ ...prev, [pid]: !prev[pid] }));
  }

  async function onSave() {
    if (!expense || !paidBy) return;
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
        ...expense,
        amount,
        currency: cur,
        paidBy,
        participantIds: includedIds,
        splitMode: 'custom',
        customSplit: cs,
      };
      if (!validateCustomSplit(probe)) {
        Alert.alert('Custom split', 'Per-person amounts must add up to the total.');
        return;
      }
      customSplit = cs;
      splitMode = 'custom';
    } else {
      customSplit = undefined;
    }

    const updated: Expense = {
      ...expense,
      amount,
      currency: cur,
      amountInBase,
      paidBy,
      participantIds: includedIds,
      splitMode,
      customSplit,
      title: title.trim() || undefined,
      category,
    };

    setSaving(true);
    try {
      await updateExpense(db, updated);
      const entries = await listExpenseAudit(db, expenseId);
      setAudit(entries);
      router.back();
    } catch (e) {
      Alert.alert('Save', e instanceof Error ? e.message : 'Could not update');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!expense) return;
    Alert.alert('Delete expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExpense(db, expense.id);
            router.back();
          } catch {
            Alert.alert('Error', 'Could not delete.');
          }
        },
      },
    ]);
  }

  if (!expenseId) {
    return (
      <View style={styles.centered}>
        <Text>Missing expense ID</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!expense) {
    return (
      <View style={styles.centered}>
        <Text>Expense not found</Text>
      </View>
    );
  }

  const pname = (pid: string) => participants.find((x) => x.id === pid)?.name ?? pid;

  if (tripArchived) {
    const shares = sharesForExpense(expense);
    return (
      <>
        <Stack.Screen options={{ title: expense.title ?? 'Expense', headerShown: true }} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text
            style={[
              styles.roBadge,
              { color: colors.textMuted, backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
            ]}>
            Read-only (archived)
          </Text>
          <Text style={[styles.roTitle, { color: colors.text }]}>{expense.title ?? 'Expense'}</Text>
          <Text style={[styles.roMeta, { color: colors.textSecondary }]}>
            {expense.amount} {expense.currency} · paid by: {pname(expense.paidBy)}
          </Text>
          {expense.amountInBase ? (
            <Text style={[styles.roMeta, { color: colors.textSecondary }]}>
              In base currency: {expense.amountInBase} {baseCurrency}
            </Text>
          ) : null}
          <Text style={[styles.roMeta, { color: colors.textSecondary }]}>Split: {expense.splitMode}</Text>
          {Object.entries(shares).map(([pid, amt]) => (
            <Text key={pid} style={[styles.roMeta, { color: colors.textSecondary }]}>
              {pname(pid)}: {amt} {expense.currency}
            </Text>
          ))}
          <ExpenseAuditTrail entries={audit} />
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit expense', headerShown: true }} />
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
            toggleIncluded={toggleIncluded}
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
              <Text style={[styles.primaryBtnText, { color: colors.primaryButtonText }]}>Update</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.deleteBtn, { borderColor: colors.dangerBorder }]}
            onPress={confirmDelete}
            disabled={saving}>
            <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete expense</Text>
          </Pressable>

          <ExpenseAuditTrail entries={audit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  roBadge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  roTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8, letterSpacing: -0.3 },
  roMeta: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  primaryBtn: {
    marginTop: 28,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700' },
  deleteBtn: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
  },
  deleteBtnText: { fontSize: 16, fontWeight: '700' },
});
