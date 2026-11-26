"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, AlertCircle, Lock } from "lucide-react";
import {
  WEEKDAY_HOURS,
  getBaseSlotsForDate,
  doesBookingOccupySlot,
  toMinutes,
} from "@/lib/studio-slots";

interface WalkInTimePickerProps {
  date: string;
  time: string;
  onDateChange: (newDate: string) => void;
  onTimeChange: (newTime: string) => void;
  onValidityChange?: (isValid: boolean) => void;
  showDateInput?: boolean;
}

function getLocalTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function WalkInTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  onValidityChange,
  showDateInput = true,
}: WalkInTimePickerProps) {
  const [todayDate, setTodayDate] = useState<string>(getLocalTodayStr);
  const [currentTime, setCurrentTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [baseSlots, setBaseSlots] = useState<string[]>(() =>
    date ? getBaseSlotsForDate(date) : WEEKDAY_HOURS
  );
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [pastSlots, setPastSlots] = useState<string[]>([]);
  const [lunchBreakSlots, setLunchBreakSlots] = useState<string[]>([]);
  const [earlyClosingTime, setEarlyClosingTime] = useState<string | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [isDayClosed, setIsDayClosed] = useState(false);
  const [closedReason, setClosedReason] = useState<string | null>(null);
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

        const apiToday = data.todayDate || getLocalTodayStr();
        const apiNow = data.currentTime || currentTime;
        const avail: string[] = Array.isArray(data.availableTimes) ? data.availableTimes : [];
        const fallbackSlots = getBaseSlotsForDate(date);
        const resolvedBase =
          Array.isArray(data.baseSlots) && data.baseSlots.length > 0
            ? data.baseSlots
            : fallbackSlots;

        setTodayDate(apiToday);
        setCurrentTime(apiNow);
        setBaseSlots(resolvedBase);
        setAvailableTimes(avail);
        setOccupiedSlots(Array.isArray(data.occupiedSlots) ? data.occupiedSlots : []);
        setPastSlots(Array.isArray(data.pastSlots) ? data.pastSlots : []);
        setLunchBreakSlots(Array.isArray(data.lunchBreakSlots) ? data.lunchBreakSlots : []);
        setEarlyClosingTime(data.earlyClosingTime || null);
        setBookedTimes(Array.isArray(data.bookedTimes) ? data.bookedTimes : []);
        setIsDayClosed(Boolean(data.isClosed));
        setClosedReason(data.reason || null);

        // Se o horário atual estiver vazio, no passado ou já ocupado na agenda,
        // seleciona automaticamente o próximo horário válido disponível
        const timeStillValid =
          Boolean(time) &&
          !data.isClosed &&
          date >= apiToday &&
          !(date === apiToday && toMinutes(time) < toMinutes(apiNow)) &&
          !(data.earlyClosingTime && time > data.earlyClosingTime) &&
          !(Array.isArray(data.lunchBreakSlots) && data.lunchBreakSlots.includes(time)) &&
          !(Array.isArray(data.bookedTimes) &&
            data.bookedTimes.some(
              (bt: string) =>
                doesBookingOccupySlot(bt, time, resolvedBase) ||
                doesBookingOccupySlot(time, bt, resolvedBase)
            ));

        if (!timeStillValid) {
          onTimeChange(avail[0] || "");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingSlots(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const orderedSlots = baseSlots;
  const isPastDate = Boolean(date && date < todayDate);
  const isSelectedPast =
    Boolean(time) &&
    (isPastDate || (date === todayDate && toMinutes(time) < toMinutes(currentTime)));
  const isSelectedLunch = Boolean(time && lunchBreakSlots.includes(time));
  const isSelectedAfterClosing = Boolean(time && earlyClosingTime && time > earlyClosingTime);
  const isSelectedOccupied =
    Boolean(time) &&
    (occupiedSlots.includes(time) ||
      bookedTimes.some(
        (bt) =>
          doesBookingOccupySlot(bt, time, orderedSlots) ||
          doesBookingOccupySlot(time, bt, orderedSlots)
      ));

  const validationError = isDayClosed
    ? closedReason || "O estúdio não atende nesta data."
    : isPastDate
    ? "Não é possível selecionar uma data que já passou."
    : !time
    ? availableTimes.length === 0
      ? "Não há horários disponíveis para esta data."
      : "Selecione um horário disponível."
    : isSelectedPast
    ? `O horário das ${time} já passou. Selecione um horário futuro.`
    : isSelectedOccupied
    ? `O horário das ${time} já está agendado na agenda.`
    : isSelectedLunch
    ? `O horário das ${time} é pausa de almoço.`
    : isSelectedAfterClosing
    ? `O estúdio encerra às ${earlyClosingTime} nesta data.`
    : null;

  const isTimeValid = !loadingSlots && !validationError && Boolean(time);

  useEffect(() => {
    onValidityChange?.(isTimeValid);
  }, [isTimeValid, onValidityChange]);

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
            min={todayDate}
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
            <span>Horário Livre (Bloqueia na Agenda)</span>
          </label>
          {loadingSlots ? (
            <span className="text-[10px] text-[#DFBA73] font-mono">Consultando agenda...</span>
          ) : (
            <span className="text-[10px] text-gray-400 font-mono">
              {availableTimes.length} {availableTimes.length === 1 ? "livre" : "livres"}
            </span>
          )}
        </div>

        {isDayClosed || isPastDate ? (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>{closedReason || "Data fechada ou já encerrada para novos horários."}</span>
          </div>
        ) : orderedSlots.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-gray-400 text-xs font-mono text-center">
            Nenhum horário configurado para esta data.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
              {orderedSlots.map((slot) => {
                const isSelected = time === slot;
                const isPast =
                  pastSlots.includes(slot) ||
                  (date === todayDate && toMinutes(slot) < toMinutes(currentTime));
                const isOccupied = occupiedSlots.includes(slot);
                const isLunch = lunchBreakSlots.includes(slot);
                const isAfterClosing = Boolean(earlyClosingTime && slot > earlyClosingTime);
                const isDisabled = isPast || isOccupied || isLunch || isAfterClosing;

                const statusLabel = isOccupied
                  ? "Agendado"
                  : isPast
                  ? "Passou"
                  : isLunch
                  ? "Almoço"
                  : isAfterClosing
                  ? "Fechado"
                  : null;

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && onTimeChange(slot)}
                    title={
                      isOccupied
                        ? `${slot} já está agendado na agenda`
                        : isPast
                        ? `${slot} já passou`
                        : isLunch
                        ? `${slot} reservado para almoço`
                        : `Selecionar ${slot} e bloquear na agenda`
                    }
                    className={`py-2 px-1 rounded-xl text-xs font-mono border transition-all flex flex-col items-center justify-center ${
                      isDisabled
                        ? isOccupied
                          ? "bg-rose-500/[0.06] border-rose-500/20 text-rose-400/50 cursor-not-allowed opacity-60 line-through"
                          : "bg-white/[0.01] border-white/5 text-gray-600 cursor-not-allowed opacity-50 line-through"
                        : isSelected
                        ? "bg-[#DFBA73] border-[#DFBA73] text-black font-bold shadow-md shadow-[#DFBA73]/25 cursor-pointer"
                        : "bg-white/[0.03] border-white/10 text-gray-200 hover:border-[#DFBA73]/60 hover:text-white cursor-pointer"
                    }`}
                  >
                    <span>{slot}</span>
                    {statusLabel && (
                      <span
                        className={`text-[8px] uppercase tracking-tight leading-none mt-0.5 no-underline ${
                          isOccupied ? "text-rose-400/80" : "text-gray-500"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-3 bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2">
              <span className="text-[11px] text-gray-400 font-mono">
                Horário personalizado (livre):
              </span>
              <input
                type="time"
                min={date === todayDate ? currentTime : undefined}
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
                aria-label="Horário personalizado do cliente balcão"
                className="bg-transparent text-white text-xs font-mono font-bold outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          </>
        )}

        {validationError ? (
          <p className="mt-2 text-[11px] text-rose-400 font-mono flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{validationError}</span>
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-emerald-400/85 font-mono">
            O horário das {time} ficará indisponível na agenda online ao confirmar.
          </p>
        )}
      </div>
    </div>
  );
}
