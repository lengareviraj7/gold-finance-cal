"use client";

import React, { useState } from "react";
import { Lock, AlertTriangle } from "lucide-react";

interface PinLoginProps {
  onSuccess: () => void;
}

export function PinLogin({ onSuccess }: PinLoginProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError("Please enter the owner PIN.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed.");
      } else {
        setPin("");
        onSuccess();
      }
    } catch {
      setError("Network error. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#fbf9f5] dark:bg-stone-950">
      <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-sm p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 mb-3 text-amber-700 dark:text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Siddheshwar Jewelers
          </h1>
          <p className="text-xs uppercase tracking-wider text-amber-800 dark:text-amber-400 font-semibold mt-0.5">
            Owner Access
          </p>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">
            Enter your private owner PIN to unlock the mortgage calculator &amp; history.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-200 text-sm flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="owner-pin-input"
              className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5 uppercase tracking-wide"
            >
              Owner PIN
            </label>
            <input
              id="owner-pin-input"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full px-4 py-3 text-center tracking-widest text-lg font-mono rounded-xl border border-stone-300 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !pin.trim()}
            className="w-full py-3.5 px-4 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 dark:bg-amber-500 dark:hover:bg-amber-400 disabled:opacity-50 text-white dark:text-stone-950 font-semibold rounded-xl shadow-sm text-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? "Verifying..." : "Unlock Calculator"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-100 dark:border-stone-800 text-center">
          <p className="text-[11px] text-stone-600 dark:text-stone-400">
            Secure Server-Side Protection • Siddheshwar Jewelers
          </p>
        </div>
      </div>
    </div>
  );
}
