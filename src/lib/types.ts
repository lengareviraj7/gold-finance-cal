export interface HistoryRecord {
  _id?: string;
  mortgageDate: string; // YYYY-MM-DD
  asOfDate: string; // YYYY-MM-DD
  principalPaise: number;
  principalRupees: number;
  monthlyRate: number;
  completedMonths: number;
  remainderDays: number;
  chargeableMonths: number;
  interestPaise: number;
  interestRupees: number;
  totalDuePaise: number;
  totalDueRupees: number;
  elapsedDescription: string;
  ruleVersion: string;
  createdAt: string; // ISO 8601 string for client serialization
}

export interface HistoryListResponse {
  records: HistoryRecord[];
  nextCursor?: string | null;
  totalCount?: number;
}

export interface SessionPayload {
  authenticated: boolean;
  issuedAt: number;
  expiresAt: number;
}
