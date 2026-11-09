"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  IndianRupee,
  RotateCcw,
  BookmarkPlus,
  Check,
  AlertTriangle,
  Percent,
  Sparkles,
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
import {
  addCalendarMonths,
  DemoScenario,
  getDemoScenarios,
} from "@/lib/demo";

interface CalculatorProps {
  onSavedToHistory: (record: HistoryRecord) => void;
  externalPreset?: {
    mortgageDate: string;
    principalRupees: number;
    monthlyRate?: number;
    interestMode?: InterestMode;
  } | null;
  demoMode?: boolean;
  onSaveDemoRecord?: (input: {
    mortgageDate: string;
    principalRupees: number;
    asOfDate: string;
    monthlyRate: number;
    interestMode: InterestMode;
  }) => HistoryRecord;
  onEnableDemoMode?: () => void;
}

export function Calculator({
  onSavedToHistory,
  externalPreset,
  demoMode = false,
  onSaveDemoRecord,
  onEnableDemoMode,
}: CalculatorProps) {
  const [todayKolkata, setTodayKolkata] = useState<string>(() => {
    try {
      return getTodayKolkataDateString();
    } catch {
      return "";
    }
  });
  const [simulatedAsOfDate, setSimulatedAsOfDate] = useState<string>("");
  const [mortgageDate, setMortgageDate] = useState<string>("");
  const [principalInput, setPrincipalInput] = useState<string>("");
  const [monthlyRateInput, setMonthlyRateInput] = useState<string>("2");
  const [interestMode, setInterestMode] = useState<InterestMode>(DEFAULT_INTEREST_MODE);

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Effective settlement date: strictly todayKolkata in Live Mode,
  // customizable simulatedAsOfDate in Demo Mode.
  const effectiveAsOfDate = demoMode ? simulatedAsOfDate || todayKolkata : todayKolkata;

  const demoScenarios = useMemo(() => {
    if (!todayKolkata) return [];
    return getDemoScenarios(todayKolkata);
  }, [todayKolkata]);

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

  // Keep demo simulated date initialized & clean up simulated state on mode switch
  useEffect(() => {
    setSaveSuccess(false);
    setSaveError(null);
    if (demoMode) {
      setSimulatedAsOfDate((prev) => prev || todayKolkata);
    } else {
      setSimulatedAsOfDate(todayKolkata);
      setResult((prev) =>
        prev && todayKolkata && prev.asOfDate !== todayKolkata ? null : prev
      );
    }
  }, [demoMode, todayKolkata]);

  // Handle external presets (e.g. from "Recalculate as of today" button in history modal)
  useEffect(() => {
    if (externalPreset && todayKolkata) {
      const asOfTarget = demoMode ? simulatedAsOfDate || todayKolkata : todayKolkata;
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
          asOfDate: asOfTarget,
          monthlyRate: targetRate,
          interestMode: targetMode,
        });
        setResult(calculated);
      } catch (err) {
        setCalcError(err instanceof Error ? err.message : "Calculation error");
        setResult(null);
      }
    }
  }, [externalPreset, todayKolkata, demoMode, simulatedAsOfDate]);

  const runCalculationWithParams = (params: {
    targetMortgageDate: string;
    targetAsOfDate: string;
    targetPrincipalStr: string;
    targetRateStr: string;
    targetMode: InterestMode;
  }) => {
    const principal = parseFloat(params.targetPrincipalStr);
    const rate = parseFloat(params.targetRateStr);
    if (
      !params.targetMortgageDate ||
      !params.targetAsOfDate ||
      !params.targetPrincipalStr.trim() ||
      isNaN(principal) ||
      principal <= 0 ||
      !params.targetRateStr.trim() ||
      isNaN(rate) ||
      rate <= 0
    ) {
      return;
    }

    try {
      const calculated = calculateGoldMortgageInterest({
        mortgageDate: params.targetMortgageDate,
        principalRupees: principal,
        asOfDate: params.targetAsOfDate,
        monthlyRate: rate,
        interestMode: params.targetMode,
      });
      setResult(calculated);
      setCalcError(null);
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : "Failed to calculate interest");
      setResult(null);
    }
  };

  const handleApplyDemoScenario = (scenario: DemoScenario) => {
    if (!todayKolkata) return;
    setMortgageDate(scenario.mortgageDate);
    setPrincipalInput(String(scenario.principalRupees));
    setMonthlyRateInput(String(scenario.monthlyRate));
    setInterestMode(scenario.interestMode);
    setSimulatedAsOfDate(todayKolkata);
    setCalcError(null);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const calculated = calculateGoldMortgageInterest({
        mortgageDate: scenario.mortgageDate,
        principalRupees: scenario.principalRupees,
        asOfDate: todayKolkata,
        monthlyRate: scenario.monthlyRate,
        interestMode: scenario.interestMode,
      });
      setResult(calculated);
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : "Failed to load demo scenario");
      setResult(null);
    }
  };

  const handleSimulateAsOfOffset = (monthsToAdd: number | null) => {
    if (!todayKolkata) return;
    const nextAsOfDate =
      monthsToAdd === null
        ? todayKolkata
        : addCalendarMonths(mortgageDate || todayKolkata, monthsToAdd);
    setSimulatedAsOfDate(nextAsOfDate);
    setCalcError(null);
    setSaveSuccess(false);
    setSaveError(null);

    if (result) {
      runCalculationWithParams({
        targetMortgageDate: mortgageDate,
        targetAsOfDate: nextAsOfDate,
        targetPrincipalStr: principalInput,
        targetRateStr: monthlyRateInput,
        targetMode: interestMode,
      });
    }
  };

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

    if (!effectiveAsOfDate) {
      setCalcError("Determining as-of date. Please try again.");
      return;
    }

    try {
      const calculated = calculateGoldMortgageInterest({
        mortgageDate,
        principalRupees: principal,
        asOfDate: effectiveAsOfDate,
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
    setSimulatedAsOfDate(todayKolkata);
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

    if (demoMode && onSaveDemoRecord) {
      try {
        const savedDemo = onSaveDemoRecord({
          mortgageDate: result.mortgageDate,
          principalRupees: result.principalRupees,
          asOfDate: result.asOfDate,
          monthlyRate: result.monthlyRate,
          interestMode: result.interestMode,
        });
        setSaveSuccess(true);
        onSavedToHistory(savedDemo);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to save demo record.");
      } finally {
        setSaving(false);
      }
      return;
    }

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
      {/* Quick Demo Presets Strip (Visible only in Demo Mode) */}
      {demoMode && demoScenarios.length > 0 && (
        <div className="bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-300/80 dark:border-amber-800/70 p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                Try Demo Scenarios
              </h2>
            </div>
            <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">
              1-tap fill &amp; compute
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {demoScenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => handleApplyDemoScenario(scenario)}
                title={scenario.description}
                className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-white dark:bg-stone-900 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50/70 dark:hover:bg-stone-800 text-left transition cursor-pointer"
              >
                <span className="block text-xs font-semibold text-stone-900 dark:text-stone-100 leading-tight">
                  {scenario.title}
                </span>
                <span className="block text-[11px] font-medium text-amber-800 dark:text-amber-400 mt-0.5">
                  {scenario.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Calculator Card */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none p-5 sm:p-6">
        <form onSubmit={handleCalculate} className="space-y-4">
          {/* Today's Date / Simulated As-Of Date */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={demoMode ? "simulated-asof-input" : undefined}
                className="block text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide"
              >
                {demoMode ? "Simulated As-Of Date (Demo)" : "Today's Date (As-Of Date)"}
              </label>
              {demoMode && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200">
                  Date Simulator
                </span>
              )}
            </div>

            {demoMode ? (
              <div className="space-y-2">
                <input
                  id="simulated-asof-input"
                  type="date"
                  min={mortgageDate || undefined}
                  value={effectiveAsOfDate}
                  onChange={(e) => {
                    setSimulatedAsOfDate(e.target.value);
                    setCalcError(null);
                    setSaveSuccess(false);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-400 dark:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-amber-50/40 dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-sm font-medium transition"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSimulateAsOfOffset(null)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                      effectiveAsOfDate === todayKolkata
                        ? "bg-amber-100 dark:bg-amber-900/50 border-amber-500 text-amber-900 dark:text-amber-200"
                        : "bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
                    }`}
                  >
                    Today
                  </button>
                  {[6, 13, 25].map((months) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => handleSimulateAsOfOffset(months)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition cursor-pointer"
                    >
                      +{months} mo {mortgageDate ? "from Loan" : "from Today"}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-400">
                  Simulate past or future payoff dates (e.g. 13th month / Year 2) without affecting live records.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200/80 dark:border-stone-700 text-stone-700 dark:text-stone-200">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <span>
                      {todayKolkata ? formatIndianDate(todayKolkata) : "Loading date..."}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold tracking-wide text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/50 px-2 py-0.5 rounded-md">
                    IST (Kolkata)
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">
                  Automatically refreshed on app open
                </p>
              </>
            )}
          </div>

          {/* Mortgage Date Picker */}
          <div>
            <label
              htmlFor="mortgage-date-input"
              className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5 uppercase tracking-wide"
            >
              Mortgage Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="mortgage-date-input"
                type="date"
                required
                max={effectiveAsOfDate || undefined}
                value={mortgageDate}
                onChange={(e) => {
                  setMortgageDate(e.target.value);
                  setCalcError(null);
                  setSaveSuccess(false);
                }}
                className="w-full px-3.5 py-3 rounded-xl border border-stone-300 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-sm font-medium transition"
              />
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">
              The date the gold was mortgaged / loan disbursed
            </p>
          </div>

          {/* Principal Amount Input */}
          <div>
            <label
              htmlFor="principal-amount-input"
              className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5 uppercase tracking-wide"
            >
              Principal Amount (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
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
                className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-stone-300 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-base font-semibold placeholder:font-normal placeholder:text-stone-400 dark:placeholder:text-stone-500 transition"
              />
            </div>
          </div>

          {/* Dynamic Monthly Interest Rate Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="interest-rate-input"
                className="block text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide"
              >
                Monthly Interest Rate (%) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">
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
                        ? "bg-amber-100/90 dark:bg-amber-900/40 border-amber-600 dark:border-amber-500 text-amber-900 dark:text-amber-200 ring-1 ring-amber-600 dark:ring-amber-500 shadow-xs"
                        : "bg-stone-50 dark:bg-stone-800/70 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600 active:bg-stone-200 dark:active:bg-stone-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Dynamic Numeric Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                <Percent className="w-4 h-4" />
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
                className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-sm font-semibold placeholder:text-stone-400 dark:placeholder:text-stone-500 transition"
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-medium text-stone-500 dark:text-stone-400">
                % per month
              </div>
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">
              Select 2%, 2.5%, 3% or enter any custom rate above
            </p>
          </div>

          {/* Interest Mode Toggle: Yearly Compounding vs Simple */}
          <div>
            <span className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5 uppercase tracking-wide">
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
                    ? "bg-amber-100/90 dark:bg-amber-900/40 border-amber-600 dark:border-amber-500 text-amber-950 dark:text-amber-100 ring-1 ring-amber-600 dark:ring-amber-500"
                    : "bg-stone-50 dark:bg-stone-800/70 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                <span className="block text-xs font-semibold">Yearly Compound</span>
                <span className="block text-[10px] text-stone-600 dark:text-stone-400 mt-0.5">
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
                    ? "bg-amber-100/90 dark:bg-amber-900/40 border-amber-600 dark:border-amber-500 text-amber-950 dark:text-amber-100 ring-1 ring-amber-600 dark:ring-amber-500"
                    : "bg-stone-50 dark:bg-stone-800/70 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                <span className="block text-xs font-semibold">Simple Interest</span>
                <span className="block text-[10px] text-stone-600 dark:text-stone-400 mt-0.5">
                  Original principal only
                </span>
              </button>
            </div>
          </div>

          {/* Validation Error Banner */}
          {calcError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-200 text-xs sm:text-sm flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <span>{calcError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="submit"
              className="flex-1 py-3.5 px-4 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 dark:bg-amber-500 dark:hover:bg-amber-400 dark:active:bg-amber-600 text-white dark:text-stone-950 font-semibold rounded-xl shadow-xs text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Calculate Interest</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="py-3.5 px-4 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 active:bg-stone-100 dark:active:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-stone-500 dark:text-stone-400" />
              <span>Clear</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results / Receipt Display Card */}
      {result && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-amber-300/80 dark:border-amber-700/60 shadow-[0_2px_8px_rgba(180,131,37,0.08)] dark:shadow-none p-5 sm:p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Prominent Calculated Amount Due */}
          <div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                {demoMode ? "Simulated Amount Due (Demo)" : "Calculated Amount Due"}
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-amber-900 dark:text-amber-300 tracking-tight mt-1">
              {formatIndianRupees(result.totalDueRupees)}
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-300 mt-1">
              Original Principal {formatIndianRupees(result.principalRupees)} + Total Interest {formatIndianRupees(result.interestRupees)}
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-amber-100/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/70 dark:border-amber-700/70">
                {result.interestMode === "yearly_compound"
                  ? "Yearly Compounding (12-mo Rest)"
                  : "Simple Interest"}
              </span>
              {demoMode && (
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-stone-800 dark:bg-stone-700 text-amber-200">
                  Demo Mode
                </span>
              )}
            </div>
          </div>

          {/* Year-by-Year Compounding Receipt Breakdown (shown when compounded across > 1 year) */}
          {result.yearlyBreakdown.length > 1 ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Yearly Receipt Breakdown
                </h3>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
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
                          ? "bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70"
                          : "bg-stone-50/90 dark:bg-stone-800/60 border-stone-200/80 dark:border-stone-700"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-stone-200/60 dark:border-stone-700/70">
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          Year {item.year} ({item.months} {item.months === 1 ? "month" : "months"})
                        </span>
                        <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                          {item.year === 1
                            ? "Initial Capital"
                            : `From Year ${item.year - 1} Balance`}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-stone-600 dark:text-stone-400">
                          <span>Opening Capital</span>
                          <span className="font-medium text-stone-800 dark:text-stone-200">
                            {formatIndianRupees(item.startingPrincipalRupees)}
                          </span>
                        </div>
                        <div className="flex justify-between text-stone-600 dark:text-stone-400">
                          <span>
                            Interest ({result.monthlyRate}% × {item.months} mo)
                          </span>
                          <span className="font-semibold text-amber-800 dark:text-amber-400">
                            + {formatIndianRupees(item.interestRupees)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-stone-200/60 dark:border-stone-700/70 font-bold text-stone-900 dark:text-stone-100">
                          <span>
                            {isLast ? "Final Amount Due" : `End of Year ${item.year} Capital`}
                          </span>
                          <span className="text-amber-900 dark:text-amber-300">
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
              <div className="px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 text-center font-mono text-xs sm:text-sm text-stone-800 dark:text-stone-200">
                {formatIndianRupees(result.principalRupees)} × {result.monthlyRate}% × {result.chargeableMonths} mo ={" "}
                <strong className="text-amber-800 dark:text-amber-400">
                  {formatIndianRupees(result.interestRupees)}
                </strong>{" "}
                interest
              </div>
              {result.interestMode === "yearly_compound" && result.chargeableMonths === 12 && (
                <p className="text-[11px] text-amber-900 dark:text-amber-200 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/70 rounded-lg px-3 py-1.5 text-center">
                  1 full year completed — from the 13th month onward,{" "}
                  <strong>{formatIndianRupees(result.totalDueRupees)}</strong> becomes the new capital.
                </p>
              )}
            </div>
          )}

          {/* Details Table */}
          <div className="bg-stone-50/70 dark:bg-stone-800/50 rounded-xl border border-stone-200/80 dark:border-stone-700 divide-y divide-stone-200/60 dark:divide-stone-700/70 text-xs sm:text-sm">
            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500 dark:text-stone-400">Mortgage Date</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {formatIndianDate(result.mortgageDate)}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500 dark:text-stone-400">
                {demoMode ? "Simulated As-Of Date" : "As-Of Date (Today)"}
              </span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {formatIndianDate(result.asOfDate)}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500 dark:text-stone-400">Elapsed Period</span>
              <span className="font-medium text-stone-800 dark:text-stone-200">
                {result.elapsedDescription}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500 dark:text-stone-400">Chargeable Months</span>
              <span className="font-semibold text-amber-900 dark:text-amber-300">
                {result.chargeableMonths} {result.chargeableMonths === 1 ? "month" : "months"}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500 dark:text-stone-400">Monthly Interest Rate</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {result.monthlyRate}% / month
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500 dark:text-stone-400">Interest Method</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {result.interestMode === "yearly_compound"
                  ? "Yearly Compounding"
                  : "Simple Interest"}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500 dark:text-stone-400">Total Interest Accrued</span>
              <span className="font-bold text-amber-800 dark:text-amber-400">
                {formatIndianRupees(result.interestRupees)}
              </span>
            </div>
          </div>

          {/* Save Status & Action */}
          {saveError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-200 text-xs flex flex-col gap-2"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <span>{saveError}</span>
              </div>
              {!demoMode && onEnableDemoMode && (
                <button
                  type="button"
                  onClick={onEnableDemoMode}
                  className="self-start text-xs font-semibold underline underline-offset-2 text-amber-900 dark:text-amber-300 hover:opacity-80 cursor-pointer"
                >
                  Save to Sandbox by switching to Demo Mode →
                </button>
              )}
            </div>
          )}

          <div className="pt-1">
            <button
              type="button"
              onClick={handleSaveToHistory}
              disabled={saving || saveSuccess}
              className={`w-full py-3 px-4 font-medium rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                saveSuccess
                  ? "bg-green-700 dark:bg-green-600 text-white cursor-default"
                  : "bg-stone-900 hover:bg-stone-800 active:bg-black dark:bg-stone-100 dark:hover:bg-white dark:active:bg-stone-200 text-white dark:text-stone-950 font-semibold"
              } disabled:opacity-80`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-green-200 dark:text-green-100" />
                  <span>{demoMode ? "Saved to Demo History ✓" : "Saved to History ✓"}</span>
                </>
              ) : saving ? (
                <span>Saving snapshot...</span>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4" />
                  <span>{demoMode ? "Save to Demo History" : "Save to History"}</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-stone-600 dark:text-stone-400 text-center leading-normal">
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
