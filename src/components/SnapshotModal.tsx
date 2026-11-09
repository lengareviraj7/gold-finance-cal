"use client";

import React from "react";
import { X, RefreshCw, Calendar, IndianRupee } from "lucide-react";
import { HistoryRecord } from "@/lib/types";
import {
  formatIndianRupees,
  formatIndianDate,
  InterestMode,
} from "@/lib/calculator";

interface SnapshotModalProps {
  record: HistoryRecord | null;
  onClose: () => void;
  onRecalculateAsOfToday: (
    mortgageDate: string,
    principalRupees: number,
    monthlyRate?: number,
    interestMode?: InterestMode
  ) => void;
}

export function SnapshotModal({
  record,
  onClose,
  onRecalculateAsOfToday,
}: SnapshotModalProps) {
  if (!record) return null;

  const resolvedMode: InterestMode =
    record.interestMode === "simple" || record.interestMode === "yearly_compound"
      ? record.interestMode
      : record.ruleVersion?.includes("simple")
      ? "simple"
      : "yearly_compound";

  const breakdown = record.yearlyBreakdown ?? [];

  const handleRecalculate = () => {
    onRecalculateAsOfToday(
      record.mortgageDate,
      record.principalRupees,
      record.monthlyRate,
      resolvedMode
    );
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="snapshot-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm transition-opacity"
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-stone-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50">
          <div>
            <h2 id="snapshot-modal-title" className="text-base font-semibold text-stone-900">
              Calculation Snapshot
            </h2>
            <p className="text-xs text-stone-500">
              Exact historical record from {formatIndianDate(record.asOfDate)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Prominent Amount Due */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Original Amount Due
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-900 mt-1">
              {formatIndianRupees(record.totalDueRupees)}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {formatIndianRupees(record.principalRupees)} + {formatIndianRupees(record.interestRupees)} interest
            </p>
            <span className="inline-block mt-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-900 border border-amber-300/70">
              {resolvedMode === "yearly_compound" ? "Yearly Compounding" : "Simple Interest"}
            </span>
          </div>

          {/* Multi-year breakdown if available */}
          {breakdown.length > 1 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 px-1">
                Yearly Receipt Breakdown
              </h3>
              {breakdown.map((item, idx) => {
                const isLast = idx === breakdown.length - 1;
                return (
                  <div
                    key={item.year}
                    className={`p-3 rounded-xl border text-xs ${
                      isLast
                        ? "bg-amber-50/50 border-amber-200"
                        : "bg-stone-50/90 border-stone-200/80"
                    }`}
                  >
                    <div className="flex justify-between font-bold text-stone-900 pb-1 mb-1 border-b border-stone-200/60">
                      <span>
                        Year {item.year} ({item.months} {item.months === 1 ? "mo" : "mos"})
                      </span>
                      <span className="text-stone-500 font-medium">
                        Open: {formatIndianRupees(item.startingPrincipalRupees)}
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Interest ({record.monthlyRate}% × {item.months} mo)</span>
                      <span className="font-semibold text-amber-800">
                        + {formatIndianRupees(item.interestRupees)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-stone-900 pt-1 mt-1 border-t border-stone-200/60">
                      <span>{isLast ? "Final Due" : `End Year ${item.year}`}</span>
                      <span className="text-amber-900">
                        {formatIndianRupees(item.endingAmountRupees)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Breakdown table */}
          <div className="bg-stone-50/80 rounded-xl border border-stone-200/70 divide-y divide-stone-200/60 text-sm">
            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-stone-400" />
                Principal Amount
              </span>
              <span className="font-semibold text-stone-800">
                {formatIndianRupees(record.principalRupees)}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                Mortgage Date
              </span>
              <span className="font-semibold text-stone-800">
                {formatIndianDate(record.mortgageDate)}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                Saved As-Of Date
              </span>
              <span className="font-semibold text-stone-800">
                {formatIndianDate(record.asOfDate)}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500">Elapsed Period</span>
              <span className="font-medium text-stone-800">
                {record.elapsedDescription}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500">Chargeable Months</span>
              <span className="font-medium text-amber-900">
                {record.chargeableMonths} {record.chargeableMonths === 1 ? "month" : "months"}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500">Monthly Interest Rate</span>
              <span className="font-medium text-stone-800">
                {record.monthlyRate}% / month
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500">Interest Method</span>
              <span className="font-medium text-stone-800">
                {resolvedMode === "yearly_compound" ? "Yearly Compounding" : "Simple Interest"}
              </span>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2.5">
              <span className="text-stone-500 font-medium">Interest Accrued</span>
              <span className="font-semibold text-amber-800">
                {formatIndianRupees(record.interestRupees)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-stone-600 italic text-center">
            Note: This view displays the frozen historical snapshot. It has not been updated with today&apos;s date.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handleRecalculate}
            className="flex-1 py-3 px-4 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white font-medium rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Recalculate as of today
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 border border-stone-300 hover:bg-stone-100 active:bg-stone-200 text-stone-700 font-medium rounded-xl text-sm transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
