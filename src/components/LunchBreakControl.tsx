"use client";

import React from "react";

export const LUNCH_BREAK_OPTIONS = [
  { value: "", label: "Sem pausa" },
  { value: "11:00", label: "11:00 às 12:00" },
  { value: "12:00", label: "12:00 às 13:00" },
  { value: "13:00", label: "13:00 às 14:00" },
  { value: "14:00", label: "14:00 às 15:00" },
  { value: "15:00", label: "15:00 às 16:00" },
  { value: "11:00-13:00", label: "11:00 às 13:00 (2h)" },
  { value: "12:00-14:00", label: "12:00 às 14:00 (2h)" },
  { value: "13:00-15:00", label: "13:00 às 15:00 (2h)" },
];

interface LunchBreakControlProps {
  selectedDate: string;
  lunchBreak: string | null;
  defaultLunchBreak: string | null;
  hasDateOverride: boolean;
  scope: "default" | "date";
  saving?: boolean;
  onScopeChange: (scope: "default" | "date") => void;
  onSelectTime: (time: string | null, scope: "default" | "date") => void;
}

/**
 * Controle unificado da Pausa para Almoço (Fixa todos os dias vs Exceção na data).
 */
export function LunchBreakControl({
  selectedDate,
  lunchBreak,
  defaultLunchBreak,
  hasDateOverride,
  scope,
  saving = false,
  onScopeChange,
  onSelectTime,
}: LunchBreakControlProps) {
  const shortDate = selectedDate
    ? selectedDate.split("-").reverse().slice(0, 2).join("/")
    : "Hoje";

  const handleClickFixed = () => {
    onScopeChange("default");
    if (hasDateOverride) {
      const targetTime = lunchBreak || defaultLunchBreak || null;
      onSelectTime(targetTime, "default");
    }
  };

  return (
    <div className="flex flex-col gap-1.5 bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">🍽️</span>
          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider whitespace-nowrap">
            Almoço:
          </span>
        </div>
        <select
          value={lunchBreak || ""}
          disabled={saving}
          onChange={(e) => onSelectTime(e.target.value || null, scope)}
          className="bg-transparent text-white text-xs font-mono outline-none cursor-pointer disabled:opacity-50"
          aria-label="Horário de pausa para almoço"
        >
          {LUNCH_BREAK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#080A0E] text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1 pt-1 border-t border-white/10">
        <button
          type="button"
          disabled={saving}
          onClick={handleClickFixed}
          title="Aplicar pausa para almoço de forma fixa em todos os dias"
          className={`flex-1 px-2 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
            scope === "default"
              ? "bg-[#DFBA73]/25 text-[#F5D799] border border-[#DFBA73]/40 font-bold"
              : "text-gray-400 hover:text-white border border-transparent"
          }`}
        >
          Direto (Fixo)
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => onScopeChange("date")}
          title={`Ajustar pausa apenas para o dia ${shortDate}`}
          className={`flex-1 px-2 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
            scope === "date"
              ? "bg-amber-500/25 text-amber-200 border border-amber-500/40 font-bold"
              : "text-gray-400 hover:text-white border border-transparent"
          }`}
        >
          Só {shortDate}
        </button>
      </div>
    </div>
  );
}
