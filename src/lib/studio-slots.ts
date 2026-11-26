import { getBrazilNow } from "@/lib/timezone";

export const WEEKDAY_HOURS = [
  "08:30",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

export const SATURDAY_HOURS = [
  "08:30",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

export function toMinutes(hhmm: string): number {
  const [h, m] = String(hhmm || "00:00")
    .split(":")
    .map((n) => parseInt(n, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function getBaseSlotsForDate(dateStr: string): string[] {
  const clean = dateStr.substring(0, 10);
  const [yStr, mStr, dStr] = clean.split("-");
  const dateObj = new Date(
    Date.UTC(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10), 12, 0, 0)
  );
  const dayOfWeek = dateObj.getUTCDay();
  if (dayOfWeek === 0) return [];
  return dayOfWeek === 6 ? [...SATURDAY_HOURS] : [...WEEKDAY_HOURS];
}

export function getSlotWindowEndMinutes(slot: string, orderedSlots: string[]): number {
  const idx = orderedSlots.indexOf(slot);
  if (idx !== -1 && idx < orderedSlots.length - 1) {
    return toMinutes(orderedSlots[idx + 1]);
  }
  return toMinutes(slot) + 60;
}

/**
 * Verifica se um agendamento/balcão registrado às `bookedHHMM` ocupa o slot oficial `slot`.
 */
export function doesBookingOccupySlot(
  bookedHHMM: string,
  slot: string,
  orderedSlots: string[]
): boolean {
  if (!bookedHHMM || !slot) return false;
  if (bookedHHMM === slot) return true;

  const bookedMin = toMinutes(bookedHHMM);
  const slotStart = toMinutes(slot);
  const slotEnd = getSlotWindowEndMinutes(slot, orderedSlots);

  return bookedMin >= slotStart && bookedMin < slotEnd;
}

/**
 * Para o Cliente Balcão (presencial), um horário só é considerado passado após o fim
 * da janela daquele atendimento (ex.: às 15:43, o horário das 15:00 vai até 16:00 e
 * permanece liberado para o barbeiro registrar no balcão).
 */
export function hasWalkInSlotEnded(
  timeHHMM: string,
  currentHHMM: string,
  orderedSlots: string[]
): boolean {
  if (!timeHHMM || !currentHHMM) return false;
  const targetMin = toMinutes(timeHHMM);
  const nowMin = toMinutes(currentHHMM);

  const matchingSlot = orderedSlots.find((s) =>
    doesBookingOccupySlot(timeHHMM, s, orderedSlots)
  );
  const windowEndMin = matchingSlot
    ? getSlotWindowEndMinutes(matchingSlot, orderedSlots)
    : targetMin + 60;

  return windowEndMin <= nowMin;
}

/**
 * Sugere o primeiro horário livre e ativo/futuro da grade para o Cliente Balcão.
 */
export function getDefaultWalkInSlot(dateStr?: string, availableTimes?: string[]): string {
  if (availableTimes) {
    return availableTimes[0] || "";
  }

  const nowBr = getBrazilNow();
  const targetDate = dateStr ? dateStr.substring(0, 10) : nowBr.date;
  const slots = getBaseSlotsForDate(targetDate);
  if (slots.length === 0) return "";

  if (targetDate < nowBr.date) return "";
  if (targetDate === nowBr.date) {
    const activeOrFutureSlot = slots.find((slot) => !hasWalkInSlotEnded(slot, nowBr.time, slots));
    return activeOrFutureSlot || "";
  }

  return slots[0];
}
