/** Core domain types — UI-agnostic, safe to share with web later. */

export type CurrencyCode = string;

export type ParticipantId = string;
export type TripId = string;
export type ExpenseId = string;

export type ParticipantKind = 'active' | 'invited' | 'passive';

export interface Participant {
  id: ParticipantId;
  displayName: string;
  kind: ParticipantKind;
}

export type SplitMode = 'equal' | 'custom' | 'selected_only';

/** Maps participant → owed amount in expense currency (minor units or decimal string — use one convention app-wide). */
export type CustomSplit = Record<ParticipantId, string>;

export interface Expense {
  id: ExpenseId;
  tripId: TripId;
  amount: string;
  currency: CurrencyCode;
  /** Trip ana para birimindeki tutar; farklı para birimindeki harcamalar için gerekli. */
  amountInBase?: string;
  paidBy: ParticipantId;
  /** Participants included in this expense (temporary participation). */
  participantIds: ParticipantId[];
  splitMode: SplitMode;
  /** Required when splitMode === 'custom'; amounts in same currency as expense. */
  customSplit?: CustomSplit;
  title?: string;
  category?: string;
  note?: string;
  occurredAt: string;
  createdAt: string;
}

export interface Trip {
  id: TripId;
  name: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  baseCurrency: CurrencyCode;
  participantIds: ParticipantId[];
  archived: boolean;
  createdAt: string;
}

export interface ParticipantBalance {
  participantId: ParticipantId;
  /** Positive = should receive from the group; negative = should pay into the group (trip base currency). */
  netBase: string;
}

export interface SettlementTransfer {
  from: ParticipantId;
  to: ParticipantId;
  amountBase: string;
}
