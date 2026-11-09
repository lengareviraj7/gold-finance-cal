"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  IndianRupee,
  RotateCcw,
  BookmarkPlus,
  Check,
  AlertTriangle,
  Percent,
} from "lucide-react";
import {
  calculateGoldMortgageInterest,
  getTodayKolkataDateString,
  formatIndianRupees,
  formatIndianDate,
  DEFAULT_INTEREST_MODE,
  DEFAULT_MONTHLY_RATE,
  CalculationResult,
  InterestMode,
} from "@/lib/calculator";
import { HistoryRecord } from "@/lib/types";

interface CalculatorProps {
  onSavedToHistory: (record: HistoryRecord) => void;
  externalPreset?: {
    mortgageDate: string;
    principalRupees: number;
    monthlyRate?: number;
    interestMode?: InterestMode;
  } | null;
}

export function Calculator({
  onSavedToHistory,
  externalPreset,
}: CalculatorProps) {
  const [todayKolkata, setTodayKolkata] = useState<string>(() => {
    try {
      return getTodayKolkataDateString();
    } catch {
      return "";
    }
  });
  const [mortgageDate, setMortgageDate] = useState<string>("");
  const [principalInput, setPrincipalInput] = useState<string>("");
  const [monthlyRateInput, setMonthlyRateInput] = useState<string>("2");
  const [interestMode, setInterestMode] = useState<InterestMode>(DEFAULT_INTEREST_MODE);

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Update today's date in Asia/Kolkata timezone
  const refreshTodayDate = useCallback(() => {
    try {
      const today = getTodayKolkataDateString();
      setTodayKolkata(today);
    } catch {
      setTodayKolkata(new Date().toISOString().split("T")[0]);
    }
  }, []);

  // Update date on mount and when app/tab becomes visible again
  useEffect(() => {
    refreshTodayDate();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshTodayDate();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", refreshTodayDate);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", refreshTodayDate);
    };
  }, [refreshTodayDate]);

  // Handle external presets (e.g. from "Recalculate as of today" button in history modal)
  useEffect(() => {
    if (externalPreset && todayKolkata) {
      setMortgageDate(externalPreset.mortgageDate);
      setPrincipalInput(String(externalPreset.principalRupees));
      const targetRate = externalPreset.monthlyRate ?? DEFAULT_MONTHLY_RATE;
      const targetMode = externalPreset.interestMode ?? DEFAULT_INTEREST_MODE;
      setMonthlyRateInput(String(targetRate));
      setInterestMode(targetMode);
      setCalcError(null);
      setSaveSuccess(false);
      setSaveError(null);

      try {
        const calculated = calculateGoldMortgageInterest({
          mortgageDate: externalPreset.mortgageDate,
          principalRupees: externalPreset.principalRupees,
          asOfDate: todayKolkata,
          monthlyRate: targetRate,
          interestMode: targetMode,
        });
        setResult(calculated);
      } catch (err) {
        setCalcError(err instanceof Error ? err.message : "Calculation error");
        setResult(null);
      }
    }
  }, [externalPreset, todayKolkata]);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setCalcError(null);
    setSaveSuccess(false);
    setSaveError(null);

    const principal = parseFloat(principalInput);
    if (!principalInput.trim() || isNaN(principal) || principal <= 0) {
      setCalcError("Please enter a valid principal amount strictly greater than ₹0.");
      setResult(null);
      return;
    }

    if (!mortgageDate) {
      setCalcError("Please select the mortgage date.");
      setResult(null);
      return;
    }

    const rate = parseFloat(monthlyRateInput);
    if (!monthlyRateInput.trim() || isNaN(rate) || rate <= 0) {
      setCalcError("Please enter a valid monthly interest rate greater than 0%.");
      setResult(null);
      return;
    }

    if (!todayKolkata) {
      setCalcError("Determining today's date. Please try again.");
      return;
    }

    try {
      const calculated = calculateGoldMortgageInterest({
        mortgageDate,
        principalRupees: principal,
        asOfDate: todayKolkata,
        monthlyRate: rate,
        interestMode,
      });
      setResult(calculated);
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : "Failed to calculate interest");
      setResult(null);
    }
  };

  const handleClear = () => {
    setMortgageDate("");
    setPrincipalInput("");
    setMonthlyRateInput("2"); // Keep 2% as default
    setInterestMode(DEFAULT_INTEREST_MODE); // Keep Yearly Compounding as default
    setResult(null);
    setCalcError(null);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSaveToHistory = async () => {
    if (!result) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mortgageDate: result.mortgageDate,
          principalRupees: result.principalRupees,
          asOfDate: result.asOfDate,
          monthlyRate: result.monthlyRate,
          interestMode: result.interestMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Failed to save calculation.");
      } else {
        setSaveSuccess(true);
        if (data.record) {
          onSavedToHistory(data.record);
        }
      }
    } catch {
      setSaveError("Network error while saving. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Calculator Card */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 sm:p-6">
        <form onSubmit={handleCalculate} className="space-y-4">
          {/* Today's Date (Read-Only Auto-Updated in Asia/Kolkata) */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wide">
              Today&apos;s Date (As-Of Date)
            </label>
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200/80 text-stone-700">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="w-4 h-4 text-amber-700" />
                <span>
                  {todayKolkata ? formatIndianDate(todayKolkata) : "Loading date..."}
                </span>
              </div>
              <span className="text-[11px] font-semibold tracking-wide text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                IST (Kolkata)
              </span>
            </div>
            <p className="text-[11px] text-stone-600 mt-1">
              Automatically refreshed on app open
            </p>
          </div>

          {/* Mortgage Date Picker */}
          <div>
            <label
              htmlFor="mortgage-date-input"
              className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wide"
            >
              Mortgage Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="mortgage-date-input"
                type="date"
                required
                max={todayKolkata || undefined}
                value={mortgageDate}
                onChange={(e) => {
                  setMortgageDate(e.target.value);
                  setCalcError(null);
                  setSaveSuccess(false);
                }}
                className="w-full px-3.5 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-stone-900 text-sm font-medium transition"
              />
            </div>
            <p className="text-[11px] text-stone-600 mt-1">
              The date the gold was mortgaged / loan disbursed
            </p>
          </div>

          {/* Principal Amount Input */}
          <div>
            <label
              htmlFor="principal-amount-input"
              className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wide"
            >
              Principal Amount (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <IndianRupee className="w-4 h-4" />
              </div>
              <input
                id="principal-amount-input"
                type="number"
                inputMode="decimal"
                step="any"
                min="1"
                required
                placeholder="e.g. 20000"
                value={principalInput}
                onChange={(e) => {
                  setPrincipalInput(e.target.value);
                  setCalcError(null);
                  setSaveSuccess(false);
                }}
                className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-stone-900 text-base font-semibold placeholder:font-normal placeholder:text-stone-400 transition"
              />
            </div>
          </div>

          {/* Dynamic Monthly Interest Rate Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="interest-rate-input"
                className="block text-xs font-semibold text-stone-700 uppercase tracking-wide"
              >
                Monthly Interest Rate (%) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-amber-800">
                Default: 2% / month
              </span>
            </div>

            {/* Quick Preset Buttons (2%, 2.5%, 3%) */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { label: "2% (Default)", value: "2" },
                { label: "2.5%", value: "2.5" },
                { label: "3%", value: "3" },
              ].map((preset) => {
                const isSelected = monthlyRateInput === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setMonthlyRateInput(preset.value);
                      setCalcError(null);
                      setSaveSuccess(false);
                    }}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border transition cursor-pointer text-center ${
                      isSelected
                        ? "bg-amber-100/90 border-amber-600 text-amber-900 ring-1 ring-amber-600 shadow-xs"
                        : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300 active:bg-stone-200"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Dynamic Numeric Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Percent className="w-4 h-4 text-stone-400" />
              </div>
              <input
                id="interest-rate-input"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                placeholder="2.0, 2.5, 3.0 or custom rate"
                value={monthlyRateInput}
                onChange={(e) => {
                  setMonthlyRateInput(e.target.value);
                  setCalcError(null);
                  setSaveSuccess(false);
                }}
                className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-stone-900 text-sm font-semibold transition"
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-medium text-stone-500">
                % per month
              </div>
            </div>
            <p className="text-[11px] text-stone-600 mt-1">
              Select 2%, 2.5%, 3% or enter any custom rate above
            </p>
          </div>

          {/* Interest Mode Toggle: Yearly Compounding vs Simple */}
          <div>
            <span className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wide">
              Interest Calculation Method
            </span>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Interest Calculation Method">
              <button
                type="button"
                role="radio"
                aria-checked={interestMode === "yearly_compound"}
                onClick={() => {
                  setInterestMode("yearly_compound");
                  setCalcError(null);
                  setSaveSuccess(false);
                }}
                className={`py-2.5 px-3 rounded-xl border text-left transition cursor-pointer ${
                  interestMode === "yearly_compound"
                    ? "bg-amber-100/90 border-amber-600 text-amber-950 ring-1 ring-amber-600"
                    : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                }`}
              >
                <span className="block text-xs font-semibold">Yearly Compound</span>
                <span className="block text-[10px] text-stone-600 mt-0.5">
                  Adds to capital every 12 mo
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={interestMode === "simple"}
                onClick={() => {
                  setInterestMode("simple");
                  setCalcError(null);
                  setSaveSuccess(false);
                }}
                className={`py-2.5 px-3 rounded-xl border text-left transition cursor-pointer ${
                  interestMode === "simple"
                    ? "bg-amber-100/90 border-amber-600 text-amber-950 ring-1 ring-amber-600"
                    : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                }`}
              >
                <span className="block text-xs font-semibold">Simple Interest</span>
                <span className="block text-[10px] text-stone-600 mt-0.5">
                  Original principal only
                </span>
              </button>
            </div>
          </div>

          {/* Validation Error Banner */}
          {calcError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <span>{calcError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="submit"
              className="flex-1 py-3.5 px-4 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white font-medium rounded-xl shadow-xs text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Calculate Interest</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="py-3.5 px-4 border border-stone-300 hover:bg-stone-50 active:bg-stone-100 text-stone-700 font-medium rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-stone-500" />
              <span>Clear</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results / Receipt Display Card */}
      {result && (
        <div className="bg-white rounded-2xl border border-amber-300/80 shadow-[0_2px_8px_rgba(180,131,37,0.08)] p-5 sm:p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Prominent Calculated Amount Due */}
          <div className="text-center p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                Calculated Amount Due
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-amber-900 tracking-tight mt-1">
              {formatIndianRupees(result.totalDueRupees)}
            </div>
            <div className="text-xs text-stone-600 mt-1">
              Original Principal {formatIndianRupees(result.principalRupees)} + Total Interest {formatIndianRupees(result.interestRupees)}
            </div>
            <div className="mt-2">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-900 border border-amber-300/70">
                {result.interestMode === "yearly_compound"
                  ? "Yearly Compounding (12-mo Rest)"
                  : "Simple Interest"}
              </span>
            </div>
          </div>

          {/* Year-by-Year Compounding Receipt Breakdown (shown when compounded across > 1 year) */}
          {result.yearlyBreakdown.length > 1 ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Yearly Receipt Breakdown
                </h3>
                <span className="text-[11px] text-stone-500">
                  {result.yearlyBreakdown.length} periods
                </span>
              </div>

              <div className="space-y-2">
                {result.yearlyBreakdown.map((item, idx) => {
                  const isLast = idx === result.yearlyBreakdown.length - 1;
                  return (
                    <div
                      key={item.year}
                      className={`p-3 rounded-xl border text-xs ${
                        isLast
                          ? "bg-amber-50/50 border-amber-200"
                          : "bg-stone-50/90 border-stone-200/80"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-stone-200/60">
                        <span className="font-bold text-stone-900">
                          Year {item.year} ({item.months} {item.months === 1 ? "month" : "months"})
                        </span>
                        <span className="text-[11px] font-medium text-stone-600">
                          {item.year === 1
                            ? "Initial Capital"
                            : `From Year ${item.year - 1} Balance`}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-stone-600">
                          <span>Opening Capital</span>
                          <span className="font-medium text-stone-800">
                            {formatIndianRupees(item.startingPrincipalRupees)}
                          </span>
                        </div>
                        <div className="flex justify-between text-stone-600">
                          <span>
                            Interest ({result.monthlyRate}% × {item.months} mo)
                          </span>
                          <span className="font-semibold text-amber-800">
                            + {formatIndianRupees(item.interestRupees)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-stone-200/60 font-bold text-stone-900">
                          <span>
                            {isLast ? "Final Amount Due" : `End of Year ${item.year} Capital`}
                          </span>
                          <span className="text-amber-900">
                            {formatIndianRupees(item.endingAmountRupees)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Compact Single-Period Formula Breakdown */
            <div className="space-y-1.5">
              <div className="px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-center font-mono text-xs sm:text-sm text-stone-800">
                {formatIndianRupees(result.principalRupees)} × {result.monthlyRate}% × {result.chargeableMonths} mo ={" "}
                <strong className="text-amber-800">{formatIndianRupees(result.interestRupees)}</strong> interest
              </div>
              {result.interestMode === "yearly_compound" && result.chargeableMonths === 12 && (
                <p className="text-[11px] text-amber-900 bg-amber-50/70 border border-amber-200/70 rounded-lg px-3 py-1.5 text-center">
                  1 full year completed — from the 13th month onward,{" "}
                  <strong>{formatIndianRupees(result.totalDueRupees)}</strong> becomes the new capital.
                </p>
              )}
            </div>
          )}

          {/* Details Table */}
          <div className="bg-stone-50/70 rounded-xl border border-stone-200/80 divide-y divide-stone-200/60 text-xs sm:text-sm">
            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500">Mortgage Date</span>
              <span className="font-semibold text-stone-800">
                {formatIndianDate(result.mortgageDate)}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500">As-Of Date (Today)</span>
              <span className="font-semibold text-stone-800">
                {formatIndianDate(result.asOfDate)}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500">Elapsed Period</span>
              <span className="font-medium text-stone-800">
                {result.elapsedDescription}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500">Chargeable Months</span>
              <span className="font-semibold text-amber-900">
                {result.chargeableMonths} {result.chargeableMonths === 1 ? "month" : "months"}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500">Monthly Interest Rate</span>
              <span className="font-semibold text-stone-800">
                {result.monthlyRate}% / month
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500">Interest Method</span>
              <span className="font-semibold text-stone-800">
                {result.interestMode === "yearly_compound"
                  ? "Yearly Compounding"
                  : "Simple Interest"}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500">Total Interest Accrued</span>
              <span className="font-bold text-amber-800">
                {formatIndianRupees(result.interestRupees)}
              </span>
            </div>
          </div>

          {/* Save Status & Action */}
          {saveError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="pt-1">
            <button
              type="button"
              onClick={handleSaveToHistory}
              disabled={saving || saveSuccess}
              className={`w-full py-3 px-4 font-medium rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                saveSuccess
                  ? "bg-green-700 text-white cursor-default"
                  : "bg-stone-900 hover:bg-stone-800 active:bg-black text-white"
              } disabled:opacity-80`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-green-200" />
                  <span>Saved to History ✓</span>
                </>
              ) : saving ? (
                <span>Saving snapshot to database...</span>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Save to History</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-stone-600 text-center leading-normal">
            Calculated amount due under{" "}
            {result.interestMode === "yearly_compound"
              ? "yearly compounding (12-month rest)"
              : "simple interest"}{" "}
            terms ({result.monthlyRate}% / month). This calculation does not constitute a legal or contractual payoff quote.
          </p>
        </div>
      )}
    </div>
  );
}
