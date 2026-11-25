"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { WEEKDAY_HOURS, getBaseSlotsForDate, doesBookingOccupySlot } from "@/lib/studio-slots";

interface WalkInTimePickerProps {
  date: string;
  time: string;
  onDateChange: (newDate: string) => void;
  onTimeChange: (newTime: string) => void;
  showDateInput?: boolean;
}

export function WalkInTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  showDateInput = true,
}: WalkInTimePickerProps) {
  const [baseSlots, setBaseSlots] = useState<string[]>(() =>
    date ? getBaseSlotsForDate(date) : WEEKDAY_HOURS
  );
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!date) return;
    let active = true;
    setLoadingSlots(true);

    fetch(`/api/appointments/available?date=${date}&includePast=1&t=${Date.now()}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const fallbackSlots = getBaseSlotsForDate(date);
        setBaseSlots(
          Array.isArray(data.baseSlots) && data.baseSlots.length > 0
            ? data.baseSlots
            : fallbackSlots.length > 0
            ? fallbackSlots
            : WEEKDAY_HOURS
        );
        setOccupiedSlots(Array.isArray(data.occupiedSlots) ? data.occupiedSlots : []);
        setBookedTimes(Array.isArray(data.bookedTimes) ? data.bookedTimes : []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingSlots(false);
      });

    return () => {
      active = false;
    };
  }, [date]);

  const orderedSlots = baseSlots.length > 0 ? baseSlots : WEEKDAY_HOURS;
  const isSelectedTimeOccupied =
    occupiedSlots.includes(time) ||
    bookedTimes.some((bt) => doesBookingOccupySlot(bt, time, orderedSlots));

  return (
    <div className="space-y-3">
      {showDateInput && (
        <div>
          <label className="flex items-center gap-1.5 text-gray-400 text-xs uppercase font-mono tracking-wider mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#DFBA73]" />
            <span>Data do Atendimento</span>
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm font-mono focus:border-[#DFBA73] focus:outline-none [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="flex items-center gap-1.5 text-gray-400 text-xs uppercase font-mono tracking-wider">
            <Clock className="w-3.5 h-3.5 text-[#DFBA73]" />
            <span>Horário (Bloqueia na Agenda)</span>
          </label>
          {loadingSlots && (
            <span className="text-[10px] text-[#DFBA73] font-mono">Atualizando...</span>
          )}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
          {orderedSlots.map((slot) => {
            const isSelected = time === slot;
            const isOccupied = occupiedSlots.includes(slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => onTimeChange(slot)}
                title={
                  isOccupied
                    ? `${slot} já possui atendimento na agenda`
                    : `Selecionar ${slot} e indisponibilizar na agenda`
                }
                className={`py-2 px-1 rounded-xl text-xs font-mono border transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? "bg-[#DFBA73] border-[#DFBA73] text-black font-bold shadow-md shadow-[#DFBA73]/25"
                    : isOccupied
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300/80 hover:border-rose-400"
                    : "bg-white/[0.03] border-white/10 text-gray-200 hover:border-[#DFBA73]/50 hover:text-white"
                }`}
              >
                <span>{slot}</span>
                {isOccupied && (
                  <span
                    className={`text-[8px] uppercase tracking-tight leading-none mt-0.5 ${
                      isSelected ? "text-black/80 font-bold" : "text-rose-400"
                    }`}
                  >
                    Ocupado
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3 bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2">
          <span className="text-[11px] text-gray-400 font-mono">
            Ou informe horário exato:
          </span>
          <input
            type="time"
            required
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            aria-label="Horário personalizado do cliente balcão"
            className="bg-transparent text-white text-xs font-mono font-bold outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>

        {isSelectedTimeOccupied ? (
          <p className="mt-2 text-[11px] text-amber-300 font-mono flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Aviso: já existe um atendimento registrado às {time}.</span>
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-emerald-400/80 font-mono">
            O horário das {time} ficará indisponível na agenda online ao confirmar.
          </p>
        )}
      </div>
    </div>
  );
}
