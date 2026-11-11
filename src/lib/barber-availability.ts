/**
 * Gerenciador Oficial de Disponibilidade, Escala e Pausa para Almoço do LAS Barber Studio.
 * Gerencia o status por DATA ESPECÍFICA com persistência em disco (/tmp em produção).
 */

declare global {
  var __studio_closed_dates: Record<string, boolean> | undefined;
  var __studio_early_closings: Record<string, string> | undefined; // ex: { "2026-11-05": "17:00" }
  var __studio_lunch_breaks: Record<string, string> | undefined;   // ex: { "DEFAULT": "12:00", "2026-11-05": "13:00" }
}

function getAvailabilityFilePath(): string | null {
  if (typeof window !== "undefined") return null;
  try {
    const path = require("path");
    return process.env.VERCEL || process.env.NODE_ENV === "production"
      ? path.join("/tmp", "las_availability.json")
      : path.join(process.cwd(), "src", "data", "availability.json");
  } catch (_) {
    return null;
  }
}

function loadAvailabilityFromDisk(): void {
  if (typeof window !== "undefined") return;
  try {
    const fs = require("fs");
    const filePath = getAvailabilityFilePath();
    if (filePath && fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (data && typeof data === "object") {
        if (data.closedDates) global.__studio_closed_dates = data.closedDates;
        if (data.earlyClosings) global.__studio_early_closings = data.earlyClosings;
        if (data.lunchBreaks) global.__studio_lunch_breaks = data.lunchBreaks;
      }
    }
  } catch (_) {}
}

function saveAvailabilityToDisk(): void {
  if (typeof window !== "undefined") return;
  try {
    const fs = require("fs");
    const path = require("path");
    const filePath = getAvailabilityFilePath();
    if (!filePath) return;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          closedDates: global.__studio_closed_dates || {},
          earlyClosings: global.__studio_early_closings || {},
          lunchBreaks: global.__studio_lunch_breaks || {},
        },
        null,
        2
      ),
      "utf-8"
    );
  } catch (_) {}
}

if (!global.__studio_closed_dates) {
  global.__studio_closed_dates = {};
  global.__studio_early_closings = {};
  global.__studio_lunch_breaks = {};
  loadAvailabilityFromDisk();
}

/**
 * Verifica se uma data específica ("YYYY-MM-DD") está marcada como Fechada por Lucas Augusto.
 */
export function isDateClosed(dateStr: string): boolean {
  if (!global.__studio_closed_dates) global.__studio_closed_dates = {};
  return !!global.__studio_closed_dates[dateStr];
}

/**
 * Marca uma data específica ("YYYY-MM-DD") como Fechada ou Aberta.
 */
export function setDateClosed(dateStr: string, closed: boolean): boolean {
  if (!global.__studio_closed_dates) global.__studio_closed_dates = {};
  global.__studio_closed_dates[dateStr] = closed;
  saveAvailabilityToDisk();
  return closed;
}

/**
 * Obtém o horário limite caso o barbeiro precise sair mais cedo em uma data ("YYYY-MM-DD").
 * Exemplo: "16:00" -> horários após as 16:00 ficam bloqueados naquele dia.
 */
export function getEarlyClosingTime(dateStr: string): string | null {
  if (!global.__studio_early_closings) global.__studio_early_closings = {};
  return global.__studio_early_closings[dateStr] || null;
}

/**
 * Define horário limite para encerramento antecipado do expediente em uma data.
 */
export function setEarlyClosingTime(dateStr: string, time: string | null): void {
  if (!global.__studio_early_closings) global.__studio_early_closings = {};
  if (!time) {
    delete global.__studio_early_closings[dateStr];
  } else {
    global.__studio_early_closings[dateStr] = time;
  }
  saveAvailabilityToDisk();
}

export const DEFAULT_SCHEDULE_ID = "DEFAULT";
export const NO_LUNCH_OVERRIDE = "NONE";

/**
 * Converte uma string de pausa de almoço em slots HH:MM bloqueados.
 * Suporta formatos:
 * - "13:00" -> ["13:00"]
 * - "12:00-14:00" -> ["12:00", "13:00"]
 * - "13:00-15:00" -> ["13:00", "14:00"]
 * - "12:00,13:00" -> ["12:00", "13:00"]
 * - "NONE" / null -> []
 */
export function parseLunchBreakSlots(lunchTime: string | null | undefined): string[] {
  if (!lunchTime || lunchTime === NO_LUNCH_OVERRIDE) return [];

  if (lunchTime.includes("-")) {
    const [start, end] = lunchTime.split("-");
    const startHour = parseInt(start.split(":")[0], 10);
    const endHour = parseInt(end.split(":")[0], 10);
    if (Number.isNaN(startHour) || Number.isNaN(endHour)) return [];
    const slots: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
    }
    return slots;
  }

  if (lunchTime.includes(",")) {
    return lunchTime.split(",").map((s) => s.trim()).filter(Boolean);
  }

  return [lunchTime];
}

/**
 * Obtém o horário de pausa para almoço cadastrado para uma data ("YYYY-MM-DD"),
 * considerando herança automática da pausa fixa diária ("DEFAULT").
 */
export function getLunchBreakTime(dateStr: string): string | null {
  if (!global.__studio_lunch_breaks) global.__studio_lunch_breaks = {};
  const dayVal = global.__studio_lunch_breaks[dateStr];
  if (dayVal === NO_LUNCH_OVERRIDE) return null;
  if (dayVal) return dayVal;
  return global.__studio_lunch_breaks[DEFAULT_SCHEDULE_ID] || null;
}

/**
 * Define ou remove a pausa para almoço no store em memória/disco (contingência).
 */
export function setLunchBreakTime(
  key: string,
  time: string | null
): void {
  if (!global.__studio_lunch_breaks) global.__studio_lunch_breaks = {};
  if (!time) {
    delete global.__studio_lunch_breaks[key];
  } else {
    global.__studio_lunch_breaks[key] = time;
  }
  saveAvailabilityToDisk();
}

/**
 * Retorna lista de slots de horário bloqueados para almoço na data informada.
 */
export function getLunchBreakSlots(dateStr: string): string[] {
  return parseLunchBreakSlots(getLunchBreakTime(dateStr));
}

/**
 * Retorna o mapa de todas as pausas de almoço cadastradas.
 */
export function getAllLunchBreaks(): Record<string, string> {
  return global.__studio_lunch_breaks || {};
}

/**
 * Retorna o mapa de todas as datas fechadas.
 */
export function getAllClosedDates(): Record<string, boolean> {
  return global.__studio_closed_dates || {};
}

/**
 * Compatibilidade legada: Lucas Augusto é sempre elegível para agendamentos.
 * A disponibilidade diária real é checada por data via isDateClosed(dateStr).
 */
export function isBarberAvailable(barberId: string, dateStr?: string): boolean {
  if (dateStr) {
    return !isDateClosed(dateStr);
  }
  return true;
}

export function setBarberAvailable(barberId: string, available: boolean, dateStr?: string): boolean {
  if (dateStr) {
    setDateClosed(dateStr, !available);
  }
  return available;
}

export function getAllBarberAvailabilities(): Record<string, boolean> {
  return {
    "barbeiro-lucas": true,
  };
}
