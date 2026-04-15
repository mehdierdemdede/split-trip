import { StyleSheet, TextInput, Pressable } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';

export const EXPENSE_CATEGORIES = [
  'accommodation',
  'transport',
  'food',
  'groceries',
  'activities',
  'misc',
] as const;

type ThemeColors = (typeof Colors)['light'];

export interface ExpenseFieldsProps {
  colors: ThemeColors;
  amountRaw: string;
  setAmountRaw: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  baseCurrency: string;
  participants: { id: string; name: string }[];
  paidBy: string | null;
  setPaidBy: (id: string) => void;
  included: Record<string, boolean>;
  toggleIncluded: (id: string) => void;
  title: string;
  setTitle: (v: string) => void;
  category: string | undefined;
  setCategory: (v: string | undefined) => void;
  saving: boolean;
  /** Filled when expense currency ≠ trip base currency. */
  amountInBaseRaw: string;
  setAmountInBaseRaw: (v: string) => void;
  splitKind: 'equal' | 'custom';
  onSplitKindChange: (k: 'equal' | 'custom') => void;
  customParts: Record<string, string>;
  setCustomPart: (participantId: string, raw: string) => void;
}

export function ExpenseFields({
  colors,
  amountRaw,
  setAmountRaw,
  currency,
  setCurrency,
  baseCurrency,
  participants,
  paidBy,
  setPaidBy,
  included,
  toggleIncluded,
  title,
  setTitle,
  category,
  setCategory,
  saving,
  amountInBaseRaw,
  setAmountInBaseRaw,
  splitKind,
  onSplitKindChange,
  customParts,
  setCustomPart,
}: ExpenseFieldsProps) {
  const inputStyle = [
    styles.input,
    {
      color: colors.text,
      borderColor: colors.chipBorder,
      backgroundColor: colors.inputBg,
    },
  ];

  const includedList = participants.filter((p) => included[p.id]);
  const curCode = (currency.trim() || baseCurrency).toUpperCase().slice(0, 3);
  const baseCode = baseCurrency.trim().toUpperCase().slice(0, 3);
  const needsBaseConversion = curCode.length === 3 && baseCode.length === 3 && curCode !== baseCode;

  return (
    <>
      <Text style={styles.label}>Amount *</Text>
      <TextInput
        value={amountRaw}
        onChangeText={setAmountRaw}
        placeholder="0.00"
        keyboardType="decimal-pad"
        placeholderTextColor={colors.textMuted}
        style={inputStyle}
        editable={!saving}
      />

      <Text style={styles.label}>Currency</Text>
      <TextInput
        value={currency}
        onChangeText={(t) => setCurrency(t.toUpperCase().slice(0, 3))}
        placeholder={baseCurrency}
        placeholderTextColor={colors.textMuted}
        style={inputStyle}
        maxLength={3}
        editable={!saving}
      />

      {needsBaseConversion ? (
        <>
          <Text style={styles.label}>Amount in base ({baseCode}) *</Text>
          <Text style={styles.hint}>
            Balances and settlement use {baseCode}; there is no live rate — enter your estimated total in base
            currency.
          </Text>
          <TextInput
            value={amountInBaseRaw}
            onChangeText={setAmountInBaseRaw}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
            editable={!saving}
          />
        </>
      ) : null}

      <Text style={styles.label}>Who paid? *</Text>
      <View style={styles.chipRow}>
        {participants.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => setPaidBy(p.id)}
            style={[
              styles.chip,
              { backgroundColor: paidBy === p.id ? colors.chipBgActive : colors.chipBg, borderColor: colors.chipBorder },
            ]}>
            <Text style={styles.chipText}>{p.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Who is included? *</Text>
      <View style={styles.chipRow}>
        {participants.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => toggleIncluded(p.id)}
            style={[
              styles.chip,
              {
                backgroundColor: included[p.id] ? colors.chipBgActive : colors.chipBg,
                borderColor: colors.chipBorder,
              },
            ]}>
            <Text style={styles.chipText}>{p.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Split</Text>
      <View style={styles.chipRow}>
        <Pressable
          onPress={() => onSplitKindChange('equal')}
          style={[
            styles.chip,
            {
              backgroundColor: splitKind === 'equal' ? colors.chipBgActive : colors.chipBg,
              borderColor: colors.chipBorder,
            },
          ]}>
          <Text style={styles.chipText}>Equal</Text>
        </Pressable>
        <Pressable
          onPress={() => onSplitKindChange('custom')}
          style={[
            styles.chip,
            {
              backgroundColor: splitKind === 'custom' ? colors.chipBgActive : colors.chipBg,
              borderColor: colors.chipBorder,
            },
          ]}>
          <Text style={styles.chipText}>Custom</Text>
        </Pressable>
      </View>

      {splitKind === 'custom' ? (
        <>
          <Text style={styles.hint}>
            Enter an amount for each included person; the sum must match the total above (±0.01).
          </Text>
          {includedList.map((p) => (
            <View key={p.id} style={styles.customRow}>
              <Text style={styles.subLabel}>{p.name}</Text>
              <TextInput
                value={customParts[p.id] ?? ''}
                onChangeText={(t) => setCustomPart(p.id, t)}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
                style={inputStyle}
                editable={!saving}
              />
            </View>
          ))}
        </>
      ) : null}

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Groceries, taxi"
        placeholderTextColor={colors.textMuted}
        style={inputStyle}
        editable={!saving}
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>
        {EXPENSE_CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(category === c ? undefined : c)}
            style={[
              styles.chip,
              {
                backgroundColor: category === c ? colors.chipBgActive : colors.chipBg,
                borderColor: colors.chipBorder,
              },
            ]}>
            <Text style={styles.chipText}>{c}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    opacity: 0.75,
    marginBottom: 8,
    marginTop: 16,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.8,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.55,
    marginTop: 4,
    marginBottom: 8,
  },
  customRow: {
    marginBottom: 10,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
});
