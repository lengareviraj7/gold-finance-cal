/**
 * Siddheshwar Jewelers - Gold Mortgage Interest Calculator
 * Core Calculation Module & Business Rules
 */

export const DEFAULT_MONTHLY_RATE = 2.0; // 2.0% per month

// For any positive elapsed period before the first full monthly anniversary,
// use a minimum charge of 1.0 month by default.
export const MINIMUM_CHARGE_FIRST_PERIOD_MONTHS = 1.0;

// Remainder days thresholds after completing at least one calendar month:
// 0–5 extra days: +0.0 month
// 6–15 extra days: +0.5 month
// 16 or more extra days: +1.0 month
export const REMAINDER_DAYS_TIER_1_MAX = 5;
export const REMAINDER_DAYS_TIER_2_MAX = 15;

export const CALCULATION_RULE_VERSION = "v1-siddheshwar-calendar-anniversary-2pct";

export interface ParsedDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export interface CalculationInput {
  mortgageDate: string; // YYYY-MM-DD
  principalRupees: number; // In rupees (> 0)
  asOfDate: string; // YYYY-MM-DD
  monthlyRate?: number; // Default 2.0%
}

export interface CalculationResult {
  mortgageDate: string;
  asOfDate: string;
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
}

/**
 * Validates and parses a YYYY-MM-DD string into year, month, day numbers.
 */
export function parseDateString(dateStr: string): ParsedDate {
  if (!dateStr || typeof dateStr !== "string") {
    throw new Error("Date string is required");
  }

  const parts = dateStr.trim().split("-");
  if (parts.length !== 3) {
    throw new Error(`Invalid date format "${dateStr}". Expected YYYY-MM-DD.`);
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (
    isNaN(year) ||
    isNaN(month) ||
    isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new Error(`Invalid date values in "${dateStr}". Expected valid YYYY-MM-DD.`);
  }

  const maxDays = getDaysInMonth(year, month);
  if (day > maxDays) {
    throw new Error(`Invalid date "${dateStr}". Month ${month} only has ${maxDays} days in ${year}.`);
  }

  return { year, month, day };
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function getDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
}

/**
 * Returns integer count of calendar days since Unix epoch (UTC) for a given date.
 */
export function toDaysSinceEpoch(year: number, month: number, day: number): number {
  const ms = Date.UTC(year, month - 1, day);
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

/**
 * Calculates calendar day difference (d1 - d2).
 */
export function differenceInCalendarDays(d1: ParsedDate, d2: ParsedDate): number {
  return (
    toDaysSinceEpoch(d1.year, d1.month, d1.day) -
    toDaysSinceEpoch(d2.year, d2.month, d2.day)
  );
}

/**
 * Calculates the calendar-month anniversary date for a given mortgage date plus `monthsToAdd`.
 * Handles month-end clamp safely: a mortgage made on the 31st (or last day of month)
 * will use the last day of shorter months (e.g., Feb 28/29, Apr 30), preventing JS date overflow.
 */
export function getAnniversaryDate(mortgageDate: ParsedDate, monthsToAdd: number): ParsedDate {
  if (monthsToAdd === 0) {
    return { ...mortgageDate };
  }

  const totalMonths = mortgageDate.year * 12 + (mortgageDate.month - 1) + monthsToAdd;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const maxDays = getDaysInMonth(targetYear, targetMonth);
  const targetDay = Math.min(mortgageDate.day, maxDays);

  return {
    year: targetYear,
    month: targetMonth,
    day: targetDay,
  };
}

/**
 * Converts a ParsedDate back to YYYY-MM-DD.
 */
export function formatDateString(date: ParsedDate): string {
  const y = date.year.toString().padStart(4, "0");
  const m = date.month.toString().padStart(2, "0");
  const d = date.day.toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the Asia/Kolkata timezone.
 */
export function getTodayKolkataDateString(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Formats a currency amount in rupees according to Indian numbering format (e.g. ₹10,000.00).
 */
export function formatIndianRupees(amountInRupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInRupees);
}

/**
 * Formats an ISO YYYY-MM-DD date into readable Indian date (e.g. 15 Aug 2024).
 */
export function formatIndianDate(dateStr: string): string {
  const { year, month, day } = parseDateString(dateStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Main calculation function.
 * Validates inputs, handles edge cases, and computes interest using exact paise arithmetic.
 */
export function calculateGoldMortgageInterest(input: CalculationInput): CalculationResult {
  const { mortgageDate: mortgageDateStr, principalRupees, asOfDate: asOfDateStr } = input;
  const monthlyRate = input.monthlyRate ?? DEFAULT_MONTHLY_RATE;

  if (typeof principalRupees !== "number" || isNaN(principalRupees) || principalRupees <= 0) {
    throw new Error("Principal amount must be a valid number strictly greater than ₹0.");
  }

  if (typeof monthlyRate !== "number" || isNaN(monthlyRate) || monthlyRate < 0) {
    throw new Error("Monthly interest rate must be a non-negative number.");
  }

  const mortgage = parseDateString(mortgageDateStr);
  const asOf = parseDateString(asOfDateStr);

  const totalDayDiff = differenceInCalendarDays(asOf, mortgage);

  if (totalDayDiff < 0) {
    throw new Error("Mortgage date cannot be in the future relative to today's date.");
  }

  // Work with integer paise to eliminate floating-point drift
  const principalPaise = Math.round(principalRupees * 100);

  // Case 1: Same day (mortgageDate === asOfDate)
  if (totalDayDiff === 0) {
    return {
      mortgageDate: mortgageDateStr,
      asOfDate: asOfDateStr,
      principalPaise,
      principalRupees: principalPaise / 100,
      monthlyRate,
      completedMonths: 0,
      remainderDays: 0,
      chargeableMonths: 0,
      interestPaise: 0,
      interestRupees: 0,
      totalDuePaise: principalPaise,
      totalDueRupees: principalPaise / 100,
      elapsedDescription: "0 days (same day)",
      ruleVersion: CALCULATION_RULE_VERSION,
    };
  }

  // Determine completed calendar months
  let completedMonths = 0;
  while (true) {
    const nextAnniversary = getAnniversaryDate(mortgage, completedMonths + 1);
    if (differenceInCalendarDays(asOf, nextAnniversary) >= 0) {
      completedMonths++;
    } else {
      break;
    }
  }

  const lastAnniversary = getAnniversaryDate(mortgage, completedMonths);
  const remainderDays = differenceInCalendarDays(asOf, lastAnniversary);

  let chargeableMonths: number;

  if (completedMonths === 0) {
    // Elapsed period is positive but less than 1 full calendar month
    // Default rule: minimum charge of 1.0 month
    chargeableMonths = MINIMUM_CHARGE_FIRST_PERIOD_MONTHS;
  } else {
    // Completed at least 1 full calendar month
    if (remainderDays <= REMAINDER_DAYS_TIER_1_MAX) {
      // 0–5 extra days: charge no additional month
      chargeableMonths = completedMonths + 0.0;
    } else if (remainderDays <= REMAINDER_DAYS_TIER_2_MAX) {
      // 6–15 extra days: add 0.5 month
      chargeableMonths = completedMonths + 0.5;
    } else {
      // 16 or more extra days: add 1.0 month
      chargeableMonths = completedMonths + 1.0;
    }
  }

  // Calculate interest: principal * (monthlyRate / 100) * chargeableMonths
  // Do integer paise calculation safely:
  // interestPaise = Math.round(principalPaise * (monthlyRate / 100) * chargeableMonths)
  const interestPaise = Math.round(principalPaise * (monthlyRate / 100) * chargeableMonths);
  const totalDuePaise = principalPaise + interestPaise;

  // Format elapsed description
  let elapsedDescription: string;
  if (completedMonths === 0) {
    elapsedDescription = `${remainderDays} ${remainderDays === 1 ? "day" : "days"}`;
  } else if (remainderDays === 0) {
    elapsedDescription = `${completedMonths} ${completedMonths === 1 ? "month" : "months"}`;
  } else {
    elapsedDescription = `${completedMonths} ${
      completedMonths === 1 ? "month" : "months"
    }, ${remainderDays} ${remainderDays === 1 ? "day" : "days"}`;
  }

  return {
    mortgageDate: mortgageDateStr,
    asOfDate: asOfDateStr,
    principalPaise,
    principalRupees: principalPaise / 100,
    monthlyRate,
    completedMonths,
    remainderDays,
    chargeableMonths,
    interestPaise,
    interestRupees: interestPaise / 100,
    totalDuePaise,
    totalDueRupees: totalDuePaise / 100,
    elapsedDescription,
    ruleVersion: CALCULATION_RULE_VERSION,
  };
}
