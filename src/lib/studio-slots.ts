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
 * Se `bookedHHMM` for exato ("14:00") ou intermediário dentro da janela do slot ("14:25"),
 * bloqueia o slot correspondente na agenda sem afetar o slot seguinte.
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
 * Sugere o melhor horário inicial da grade para o Cliente Balcão com base no horário atual.
 */
export function getDefaultWalkInSlot(dateStr?: string): string {
  const d = new Date();
  const nowMinutes = d.getHours() * 60 + d.getMinutes();
  const slots = dateStr ? getBaseSlotsForDate(dateStr) : WEEKDAY_HOURS;
  if (slots.length === 0) return "09:00";

  // Encontra o slot cuja janela contém a hora atual, ou o próximo mais próximo
  const currentSlot = slots.find((slot) => {
    const start = toMinutes(slot);
    const end = getSlotWindowEndMinutes(slot, slots);
    return nowMinutes >= start && nowMinutes < end;
  });
  if (currentSlot) return currentSlot;

  const nextSlot = slots.find((slot) => toMinutes(slot) >= nowMinutes);
  return nextSlot || slots[slots.length - 1];
}
