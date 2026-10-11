import { describe, it, expect } from "vitest";
import {
  calculateGoldMortgageInterest,
  parseDateString,
  getAnniversaryDate,
  formatIndianRupees,
  formatIndianDate,
  DEFAULT_MONTHLY_RATE,
} from "./calculator";

describe("Gold Mortgage Interest Calculator", () => {
  describe("Date parsing & anniversary calculations", () => {
    it("parses valid YYYY-MM-DD dates", () => {
      const parsed = parseDateString("2024-02-29");
      expect(parsed).toEqual({ year: 2024, month: 2, day: 29 });
    });

    it("rejects invalid date formats and invalid days", () => {
      expect(() => parseDateString("2024/02/29")).toThrow();
      expect(() => parseDateString("invalid")).toThrow();
      expect(() => parseDateString("2023-02-29")).toThrow(); // 2023 is not leap year
      expect(() => parseDateString("2024-04-31")).toThrow(); // April has 30 days
    });

    it("handles 31st of month anniversaries across shorter months safely", () => {
      // Mortgage on Jan 31, 2024 (leap year)
      const jan31 = { year: 2024, month: 1, day: 31 };
      
      // 1 month -> Feb 29, 2024 (leap year end of month)
      expect(getAnniversaryDate(jan31, 1)).toEqual({ year: 2024, month: 2, day: 29 });

      // 2 months -> Mar 31, 2024
      expect(getAnniversaryDate(jan31, 2)).toEqual({ year: 2024, month: 3, day: 31 });

      // 3 months -> Apr 30, 2024 (April has 30 days)
      expect(getAnniversaryDate(jan31, 3)).toEqual({ year: 2024, month: 4, day: 30 });
    });

    it("handles non-leap year February clamp safely", () => {
      // Mortgage on Jan 31, 2023 (non-leap year)
      const jan31NonLeap = { year: 2023, month: 1, day: 31 };
      expect(getAnniversaryDate(jan31NonLeap, 1)).toEqual({ year: 2023, month: 2, day: 28 });
    });

    it("handles year crossover anniversaries", () => {
      const nov15 = { year: 2024, month: 11, day: 15 };
      expect(getAnniversaryDate(nov15, 2)).toEqual({ year: 2025, month: 1, day: 15 });
      expect(getAnniversaryDate(nov15, 14)).toEqual({ year: 2026, month: 1, day: 15 });
    });
  });

  describe("Validation & Guard Rules", () => {
    it("rejects future mortgage dates", () => {
      expect(() =>
        calculateGoldMortgageInterest({
          mortgageDate: "2026-05-10",
          principalRupees: 10000,
          asOfDate: "2026-05-01",
        })
      ).toThrow("Mortgage date cannot be in the future");
    });

    it("rejects zero or negative principal amounts", () => {
      expect(() =>
        calculateGoldMortgageInterest({
          mortgageDate: "2026-01-01",
          principalRupees: 0,
          asOfDate: "2026-02-01",
        })
      ).toThrow("strictly greater than ₹0");

      expect(() =>
        calculateGoldMortgageInterest({
          mortgageDate: "2026-01-01",
          principalRupees: -500,
          asOfDate: "2026-02-01",
        })
      ).toThrow("strictly greater than ₹0");

      expect(() =>
        calculateGoldMortgageInterest({
          mortgageDate: "2026-01-01",
          principalRupees: NaN,
          asOfDate: "2026-02-01",
        })
      ).toThrow("strictly greater than ₹0");
    });
  });

  describe("Same day loan rule", () => {
    it("returns 0 interest and total due equal to principal if mortgage date equals asOfDate", () => {
      const res = calculateGoldMortgageInterest({
        mortgageDate: "2026-03-15",
        principalRupees: 50000,
        asOfDate: "2026-03-15",
      });

      expect(res.completedMonths).toBe(0);
      expect(res.remainderDays).toBe(0);
      expect(res.chargeableMonths).toBe(0);
      expect(res.interestPaise).toBe(0);
      expect(res.interestRupees).toBe(0);
      expect(res.totalDuePaise).toBe(5000000);
      expect(res.totalDueRupees).toBe(50000);
      expect(res.elapsedDescription).toContain("0 days");
    });
  });

  describe("Minimum charge for first period (< 1 full month)", () => {
    it("charges minimum 1.0 month for positive elapsed period before first anniversary", () => {
      // 5 days elapsed
      const res5Days = calculateGoldMortgageInterest({
        mortgageDate: "2026-01-10",
        principalRupees: 10000,
        asOfDate: "2026-01-15",
      });
      expect(res5Days.completedMonths).toBe(0);
      expect(res5Days.remainderDays).toBe(5);
      expect(res5Days.chargeableMonths).toBe(1.0);
      expect(res5Days.interestRupees).toBe(200); // 10000 * 2% * 1.0 = 200
      expect(res5Days.totalDueRupees).toBe(10200);

      // 25 days elapsed
      const res25Days = calculateGoldMortgageInterest({
        mortgageDate: "2026-01-10",
        principalRupees: 10000,
        asOfDate: "2026-02-04",
      });
      expect(res25Days.completedMonths).toBe(0);
      expect(res25Days.remainderDays).toBe(25);
      expect(res25Days.chargeableMonths).toBe(1.0);
      expect(res25Days.interestRupees).toBe(200);
    });
  });

  describe("Exact day boundary examples from specification", () => {
    const principal = 10000; // ₹10,000 at 2% monthly rate

    it("Example 1: Exactly 1 completed month -> chargeable 1.0 month -> 2% (₹200)", () => {
      const res = calculateGoldMortgageInterest({
        mortgageDate: "2026-01-10",
        principalRupees: principal,
        asOfDate: "2026-02-10",
      });
      expect(res.completedMonths).toBe(1);
      expect(res.remainderDays).toBe(0);
      expect(res.chargeableMonths).toBe(1.0);
      expect(res.interestRupees).toBe(200);
      expect(res.totalDueRupees).toBe(10200);
    });

    it("Example 2: 1 completed month + 5 days -> chargeable 1.0 month -> 2% (₹200)", () => {
      const res = calculateGoldMortgageInterest({
        mortgageDate: "2026-01-10",
        principalRupees: principal,
        asOfDate: "2026-02-15", // Feb 10 + 5 days = Feb 15
      });
      expect(res.completedMonths).toBe(1);
      expect(res.remainderDays).toBe(5);
      expect(res.chargeableMonths).toBe(1.0);
      expect(res.interestRupees).toBe(200);
      expect(res.totalDueRupees).toBe(10200);
    });

    it("Example 3: 1 completed month + 6 days -> chargeable 1.5 months -> 3% (₹300)", () => {
      const res = calculateGoldMortgageInterest({
        mortgageDate: "2026-01-10",
        principalRupees: principal,
        asOfDate: "2026-02-16", // Feb 10 + 6 days = Feb 16
      });
      expect(res.completedMonths).toBe(1);
      expect(res.remainderDays).toBe(6);
      expect(res.chargeableMonths).toBe(1.5);
      expect(res.interestRupees).toBe(300);
      expect(res.totalDueRupees).toBe(10300);
    });

    it("Example 4: 1 completed month + 15 days -> chargeable 1.5 months -> 3% (₹300)", () => {
      const res = calculateGoldMortgageInterest({
        mortgageDate: "2026-01-10",
        principalRupees: principal,
        asOfDate: "2026-02-25", // Feb 10 + 15 days = Feb 25
      });
      expect(res.completedMonths).toBe(1);
      expect(res.remainderDays).toBe(15);
      expect(res.chargeableMonths).toBe(1.5);
      expect(res.interestRupees).toBe(300);
      expect(res.totalDueRupees).toBe(10300);
    });

    it("Example 5: 1 completed month + 16 days -> chargeable 2.0 months -> 4% (₹400)", () => {
      const res = calculateGoldMortgageInterest({
        mortgageDate: "2026-01-10",
        principalRupees: principal,
        asOfDate: "2026-02-26", // Feb 10 + 16 days = Feb 26
      });
      expect(res.completedMonths).toBe(1);
      expect(res.remainderDays).toBe(16);
      expect(res.chargeableMonths).toBe(2.0);
      expect(res.interestRupees).toBe(400);
      expect(res.totalDueRupees).toBe(10400);
    });

    it("Example 6: Exactly 2 completed months -> chargeable 2.0 months -> 4% (₹400)", () => {
      const res = calculateGoldMortgageInterest({
        mortgageDate: "2026-01-10",
        principalRupees: principal,
        asOfDate: "2026-03-10",
      });
      expect(res.completedMonths).toBe(2);
      expect(res.remainderDays).toBe(0);
      expect(res.chargeableMonths).toBe(2.0);
      expect(res.interestRupees).toBe(400);
      expect(res.totalDueRupees).toBe(10400);
    });

    it("Example 7: 2 completed months + 6 days -> chargeable 2.5 months -> 5% (₹500)", () => {
      const res = calculateGoldMortgageInterest({
        mortgageDate: "2026-01-10",
        principalRupees: principal,
        asOfDate: "2026-03-16", // Mar 10 + 6 days = Mar 16
      });
      expect(res.completedMonths).toBe(2);
      expect(res.remainderDays).toBe(6);
      expect(res.chargeableMonths).toBe(2.5);
      expect(res.interestRupees).toBe(500);
      expect(res.totalDueRupees).toBe(10500);
    });
  });

  describe("Paise accuracy and precision", () => {
    it("calculates paise accurately without floating-point drift", () => {
      // ₹12,345.67 at 2% for 1.5 months = 12345.67 * 0.02 * 1.5 = 370.3701 => ₹370.37 (37037 paise)
      const res = calculateGoldMortgageInterest({
        mortgageDate: "2026-01-01",
        principalRupees: 12345.67,
        asOfDate: "2026-02-07", // 1 month + 6 days = 1.5 months
      });

      expect(res.principalPaise).toBe(1234567);
      expect(res.interestPaise).toBe(37037);
      expect(res.interestRupees).toBe(370.37);
      expect(res.totalDuePaise).toBe(1234567 + 37037);
      expect(res.totalDueRupees).toBe(12716.04);
    });
  });

  describe("Formatting helpers", () => {
    it("formats Indian rupees properly", () => {
      const formatted = formatIndianRupees(100000);
      expect(formatted).toMatch(/1,00,000(\.00)?/);
    });

    it("formats Indian readable dates", () => {
      const formatted = formatIndianDate("2026-10-15");
      expect(formatted).toContain("2026");
      expect(formatted).toContain("Oct");
    });
  });
});
