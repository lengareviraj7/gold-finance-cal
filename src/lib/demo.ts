import {
  calculateGoldMortgageInterest,
  formatDateString,
  getAnniversaryDate,
  getDaysInMonth,
  InterestMode,
  parseDateString,
} from "./calculator";
import { HistoryRecord } from "./types";

export const THEME_STORAGE_KEY = "sj_theme";
export const DEMO_MODE_STORAGE_KEY = "sj_demo_mode";
export const DEMO_HISTORY_STORAGE_KEY = "sj_demo_history_records";

export type ThemeMode = "light" | "dark";

export interface DemoScenario {
  id: string;
  title: string;
  badge: string;
  description: string;
  mortgageDate: string;
  principalRupees: number;
  monthlyRate: number;
  interestMode: InterestMode;
}

export function isDemoRecordId(id?: string): boolean {
  return typeof id === "string" && id.startsWith("demo-");
}

/**
 * Subtracts `daysBack` calendar days first, then `monthsBack` calendar months
 * (clamping day to month-end cleanly). Used so forward month/day calculation
 * against `asOfDate` reproduces realistic demo durations.
 */
export function subtractFromDate(
  asOfDateStr: string,
  monthsBack: number,
  daysBack = 0
): string {
  const parsed = parseDateString(asOfDateStr);

  // Step 1: subtract days in UTC
  const dayShiftedDate = new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day - daysBack)
  );
  const baseYear = dayShiftedDate.getUTCFullYear();
  const baseMonth = dayShiftedDate.getUTCMonth() + 1;
  const baseDay = dayShiftedDate.getUTCDate();

  if (monthsBack === 0) {
    return formatDateString({ year: baseYear, month: baseMonth, day: baseDay });
  }

  // Step 2: subtract calendar months safely
  const totalMonths = baseYear * 12 + (baseMonth - 1) - monthsBack;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (((totalMonths % 12) + 12) % 12) + 1;
  const maxDays = getDaysInMonth(targetYear, targetMonth);
  const targetDay = Math.min(baseDay, maxDays);

  return formatDateString({
    year: targetYear,
    month: targetMonth,
    day: targetDay,
  });
}

/**
 * Adds `monthsToAdd` calendar months to `dateStr` using the same anniversary
 * clamping rule as the core interest engine.
 */
export function addCalendarMonths(dateStr: string, monthsToAdd: number): string {
  const parsed = parseDateString(dateStr);
  const shifted = getAnniversaryDate(parsed, monthsToAdd);
  return formatDateString(shifted);
}

/**
 * Curated gold-mortgage demo presets dynamically anchored to `asOfDate`.
 */
export function getDemoScenarios(asOfDate: string): DemoScenario[] {
  return [
    {
      id: "compound-13m",
      title: "13th Month Compound",
      badge: "₹20k • 3% • 13 mo",
      description:
        "Year 1 capitalizes ₹7,200 into ₹27,200; 13th month accrues ₹816 (₹28,016 total).",
      mortgageDate: subtractFromDate(asOfDate, 13, 0),
      principalRupees: 20000,
      monthlyRate: 3,
      interestMode: "yearly_compound",
    },
    {
      id: "multiyear-29m",
      title: "Multi-Year (+0.5 Tier)",
      badge: "₹50k • 2% • 29.5 mo",
      description:
        "Crosses two 12-month compounding rests plus 10 extra days (+0.5 month tier).",
      mortgageDate: subtractFromDate(asOfDate, 29, 10),
      principalRupees: 50000,
      monthlyRate: 2,
      interestMode: "yearly_compound",
    },
    {
      id: "short-min-1m",
      title: "Min 1-Month Rule",
      badge: "₹35k • 2.5% • 14 days",
      description:
        "Positive duration under 1 month charges minimum 1.0 full month.",
      mortgageDate: subtractFromDate(asOfDate, 0, 14),
      principalRupees: 35000,
      monthlyRate: 2.5,
      interestMode: "yearly_compound",
    },
    {
      id: "simple-16d-tier",
      title: "Simple (16+ Days)",
      badge: "₹1L • 2% • 5 mo Simple",
      description:
        "4 months + 20 days rounds to 5.0 chargeable months on original principal only.",
      mortgageDate: subtractFromDate(asOfDate, 4, 20),
      principalRupees: 100000,
      monthlyRate: 2,
      interestMode: "simple",
    },
  ];
}

export function buildInitialDemoRecords(asOfDate: string): HistoryRecord[] {
  const scenarios = getDemoScenarios(asOfDate);
  const nowMs = Date.now();

  return scenarios.map((scenario, idx) => {
    const calculated = calculateGoldMortgageInterest({
      mortgageDate: scenario.mortgageDate,
      principalRupees: scenario.principalRupees,
      asOfDate,
      monthlyRate: scenario.monthlyRate,
      interestMode: scenario.interestMode,
    });

    return {
      _id: `demo-seed-${scenario.id}`,
      mortgageDate: calculated.mortgageDate,
      asOfDate: calculated.asOfDate,
      principalPaise: calculated.principalPaise,
      principalRupees: calculated.principalRupees,
      monthlyRate: calculated.monthlyRate,
      interestMode: calculated.interestMode,
      completedMonths: calculated.completedMonths,
      remainderDays: calculated.remainderDays,
      chargeableMonths: calculated.chargeableMonths,
      interestPaise: calculated.interestPaise,
      interestRupees: calculated.interestRupees,
      totalDuePaise: calculated.totalDuePaise,
      totalDueRupees: calculated.totalDueRupees,
      elapsedDescription: calculated.elapsedDescription,
      yearlyBreakdown: calculated.yearlyBreakdown,
      ruleVersion: calculated.ruleVersion,
      createdAt: new Date(nowMs - idx * 3600_000).toISOString(),
    };
  });
}

export function readDemoHistory(asOfDate: string): HistoryRecord[] {
  if (typeof window === "undefined") {
    return buildInitialDemoRecords(asOfDate);
  }

  try {
    const raw = window.localStorage.getItem(DEMO_HISTORY_STORAGE_KEY);
    if (raw === null) {
      const seeded = buildInitialDemoRecords(asOfDate);
      window.localStorage.setItem(DEMO_HISTORY_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as HistoryRecord[];
    }
  } catch {
    // Fall back to freshly computed seed records if storage is corrupted/blocked
  }

  return buildInitialDemoRecords(asOfDate);
}

export function writeDemoHistory(records: HistoryRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEMO_HISTORY_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota / private-browsing write errors gracefully
  }
}

export function saveDemoRecordToStorage(input: {
  mortgageDate: string;
  principalRupees: number;
  asOfDate: string;
  monthlyRate: number;
  interestMode: InterestMode;
}): HistoryRecord {
  const calculated = calculateGoldMortgageInterest({
    mortgageDate: input.mortgageDate,
    principalRupees: input.principalRupees,
    asOfDate: input.asOfDate,
    monthlyRate: input.monthlyRate,
    interestMode: input.interestMode,
  });

  const newRecord: HistoryRecord = {
    _id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    mortgageDate: calculated.mortgageDate,
    asOfDate: calculated.asOfDate,
    principalPaise: calculated.principalPaise,
    principalRupees: calculated.principalRupees,
    monthlyRate: calculated.monthlyRate,
    interestMode: calculated.interestMode,
    completedMonths: calculated.completedMonths,
    remainderDays: calculated.remainderDays,
    chargeableMonths: calculated.chargeableMonths,
    interestPaise: calculated.interestPaise,
    interestRupees: calculated.interestRupees,
    totalDuePaise: calculated.totalDuePaise,
    totalDueRupees: calculated.totalDueRupees,
    elapsedDescription: calculated.elapsedDescription,
    yearlyBreakdown: calculated.yearlyBreakdown,
    ruleVersion: calculated.ruleVersion,
    createdAt: new Date().toISOString(),
  };

  const existing = readDemoHistory(input.asOfDate);
  const updated = [newRecord, ...existing];
  writeDemoHistory(updated);
  return newRecord;
}

export function deleteDemoRecordFromStorage(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(DEMO_HISTORY_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const updated = (parsed as HistoryRecord[]).filter((rec) => rec._id !== id);
    writeDemoHistory(updated);
  } catch {
    // Ignore parse/storage errors gracefully
  }
}

export function resetDemoHistoryInStorage(asOfDate: string): HistoryRecord[] {
  const seeded = buildInitialDemoRecords(asOfDate);
  writeDemoHistory(seeded);
  return seeded;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function buildDemoCsvContent(records: HistoryRecord[]): string {
  const headers = [
    "Calculation ID",
    "Mortgage Date",
    "As Of Date",
    "Principal (₹)",
    "Monthly Rate (%)",
    "Interest Mode",
    "Completed Months",
    "Remainder Days",
    "Chargeable Months",
    "Interest (₹)",
    "Total Due (₹)",
    "Elapsed Period",
    "Rule Version",
    "Saved At (UTC)",
  ];

  const rows: string[] = [headers.map(escapeCsvCell).join(",")];

  for (const rec of records) {
    const modeLabel =
      rec.interestMode === "simple"
        ? "Simple Interest"
        : rec.interestMode === "yearly_compound"
        ? "Yearly Compounding"
        : rec.ruleVersion?.includes("simple")
        ? "Simple Interest"
        : "Yearly Compounding";

    const row = [
      rec._id || "",
      rec.mortgageDate,
      rec.asOfDate,
      (rec.principalRupees ?? rec.principalPaise / 100).toFixed(2),
      rec.monthlyRate ?? 2,
      modeLabel,
      rec.completedMonths,
      rec.remainderDays,
      rec.chargeableMonths,
      (rec.interestRupees ?? rec.interestPaise / 100).toFixed(2),
      (rec.totalDueRupees ?? rec.totalDuePaise / 100).toFixed(2),
      rec.elapsedDescription,
      rec.ruleVersion,
      rec.createdAt,
    ];
    rows.push(row.map(escapeCsvCell).join(","));
  }

  return rows.join("\r\n");
}

export function downloadDemoCsv(records: HistoryRecord[]): void {
  if (typeof window === "undefined") return;
  const csvContent = buildDemoCsvContent(records);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `siddheshwar-jewelers-demo-history-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
