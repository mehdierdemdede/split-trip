import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { ExpenseAuditEntry } from '@/lib/repositories/expenseAuditRepository';

function actionTr(action: string): string {
  switch (action) {
    case 'created':
      return 'Created';
    case 'updated':
      return 'Updated';
    case 'deleted':
      return 'Deleted';
    default:
      return action;
  }
}

function shortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function ExpenseAuditTrail({ entries }: { entries: ExpenseAuditEntry[] }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  if (entries.length === 0) return null;

  return (
    <View style={[styles.box, { borderTopColor: c.border }]}>
      <Text style={[styles.title, { color: c.textMuted }]}>History</Text>
      {entries.map((e) => (
        <Text key={e.id} style={[styles.line, { color: c.textSecondary }]}>
          {actionTr(e.action)} · {shortDate(e.createdAt)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  line: {
    fontSize: 13,
    lineHeight: 20,
  },
});
