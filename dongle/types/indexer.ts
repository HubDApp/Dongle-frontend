export type SorobanEventType =
  | "ProjectRegistered"
  | "ProjectUpdated"
  | "ReviewSubmitted"
  | "VerificationApproved";

export interface IndexedEvent {
  id: string;
  eventType: SorobanEventType;
  contractId: string;
  ledger: number;
  txHash: string;
  payload: Record<string, unknown>;
  indexedAt: string;
}

export interface EventsQueryParams {
  eventType?: SorobanEventType;
  contractId?: string;
  fromLedger?: number;
  toLedger?: number;
  limit?: number;
  offset?: number;
}
