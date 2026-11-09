import { describe, it, expect } from "vitest";
import {
  addCalendarMonths,
  buildDemoCsvContent,
  buildInitialDemoRecords,
  getDemoScenarios,
  isDemoRecordId,
  subtractFromDate,
} from "./demo";
import { calculateGoldMortgageInterest } from "./calculator";

describe("Demo Mode Utilities", () => {
  describe("subtractFromDate & addCalendarMonths", () => {
    it("subtracts exact months cleanly", () => {
      expect(subtractFromDate("2026-11-09", 13, 0)).toBe("2025-10-09");
      expect(subtractFromDate("2026-11-09", 12, 0)).toBe("2025-11-09");
    });

    it("subtracts days first then months and matches forward calculation", () => {
      const asOfDate = "2026-11-09";
      const mortgageDate = subtractFromDate(asOfDate, 29, 10);
      expect(mortgageDate).toBe("2024-05-30");

      const calc = calculateGoldMortgageInterest({
        mortgageDate,
        principalRupees: 50000,
        asOfDate,
        monthlyRate: 2,
        interestMode: "yearly_compound",
      });
      expect(calc.completedMonths).toBe(29);
      expect(calc.remainderDays).toBe(10);
      expect(calc.chargeableMonths).toBe(29.5);
    });

    it("clamps month-end dates safely when subtracting or adding months", () => {
      expect(subtractFromDate("2026-03-31", 1, 0)).toBe("2026-02-28");
      expect(addCalendarMonths("2026-01-31", 1)).toBe("2026-02-28");
      expect(addCalendarMonths("2025-10-09", 13)).toBe("2026-11-09");
    });
  });

  describe("getDemoScenarios & buildInitialDemoRecords", () => {
    it("produces 4 valid scenarios including the exact 13th-month ₹20k @ 3% compounding example", () => {
      const asOfDate = "2026-11-09";
      const scenarios = getDemoScenarios(asOfDate);
      expect(scenarios).toHaveLength(4);

      const records = buildInitialDemoRecords(asOfDate);
      expect(records).toHaveLength(4);

      for (const rec of records) {
        expect(isDemoRecordId(rec._id)).toBe(true);
        expect(rec.totalDueRupees).toBeGreaterThan(rec.principalRupees);
      }

      const compound13 = records.find((r) => r._id === "demo-seed-compound-13m");
      expect(compound13).toBeDefined();
      expect(compound13?.chargeableMonths).toBe(13);
      expect(compound13?.interestRupees).toBe(8016);
      expect(compound13?.totalDueRupees).toBe(28016);
      expect(compound13?.yearlyBreakdown).toHaveLength(2);
    });
  });

  describe("buildDemoCsvContent", () => {
    it("exports header and properly escaped rows matching server CSV structure", () => {
      const records = buildInitialDemoRecords("2026-11-09");
      const csv = buildDemoCsvContent(records);
      const lines = csv.split("\r\n");
      expect(lines.length).toBe(5);
      expect(lines[0]).toContain('"Calculation ID"');
      expect(lines[0]).toContain('"Interest Mode"');
      expect(lines[1]).toContain('"Yearly Compounding"');
      expect(lines[1]).toContain('"28016.00"');
      expect(lines[4]).toContain('"Simple Interest"');
    });
  });
});
