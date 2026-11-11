import prisma from "@/lib/prisma";
import {
  DEFAULT_SCHEDULE_ID,
  NO_LUNCH_OVERRIDE,
  parseLunchBreakSlots,
  isDateClosed,
  setDateClosed,
  getEarlyClosingTime,
  setEarlyClosingTime,
  setLunchBreakTime,
} from "@/lib/barber-availability";
import { checkDayStatus, type DayStatus } from "@/lib/holidays";

export interface ResolvedDaySchedule {
  date: string;
  isClosed: boolean;
  earlyClosingTime: string | null;
  lunchBreakTime: string | null;
  defaultLunchBreakTime: string | null;
  dayOverrideLunchBreakTime: string | null;
  isLunchBreakFixed: boolean;
  hasLunchDateOverride: boolean;
  lunchBreakSlots: string[];
}

function resolveScheduleValues(
  cleanDate: string,
  isClosed: boolean,
  earlyClosingTime: string | null,
  defaultLunch: string | null,
  dayOverrideLunch: string | null
): ResolvedDaySchedule {
  const cleanDefaultLunch =
    defaultLunch && defaultLunch !== NO_LUNCH_OVERRIDE ? defaultLunch : null;
  const hasLunchDateOverride = Boolean(dayOverrideLunch);

  let effectiveLunch: string | null = null;
  if (dayOverrideLunch === NO_LUNCH_OVERRIDE) {
    effectiveLunch = null;
  } else if (dayOverrideLunch) {
    effectiveLunch = dayOverrideLunch;
  } else {
    effectiveLunch = cleanDefaultLunch;
  }

  return {
    date: cleanDate,
    isClosed,
    earlyClosingTime,
    lunchBreakTime: effectiveLunch,
    defaultLunchBreakTime: cleanDefaultLunch,
    dayOverrideLunchBreakTime: dayOverrideLunch,
    isLunchBreakFixed: Boolean(!hasLunchDateOverride && cleanDefaultLunch),
    hasLunchDateOverride,
    lunchBreakSlots: parseLunchBreakSlots(effectiveLunch),
  };
}

/**
 * Busca a escala e pausa para almoço oficial da data diretamente no PostgreSQL (Supabase),
 * garantindo persistência permanente entre sessões, dispositivos e lambdas serverless.
 */
export async function getDayScheduleDB(dateStr: string): Promise<ResolvedDaySchedule> {
  const cleanDate = (dateStr || "").substring(0, 10);

  try {
    const rows = await prisma.studioSchedule.findMany({
      where: { id: { in: [cleanDate, DEFAULT_SCHEDULE_ID] } },
    });

    const defaultRow = rows.find((r) => r.id === DEFAULT_SCHEDULE_ID);
    const dateRow = rows.find((r) => r.id === cleanDate);

    // Sincroniza cache em memória com os valores oficiais do banco
    setDateClosed(cleanDate, Boolean(dateRow?.isClosed));
    setEarlyClosingTime(cleanDate, dateRow?.earlyClosingTime || null);
    setLunchBreakTime(DEFAULT_SCHEDULE_ID, defaultRow?.lunchBreakTime || null);
    setLunchBreakTime(cleanDate, dateRow?.lunchBreakTime || null);

    return resolveScheduleValues(
      cleanDate,
      Boolean(dateRow?.isClosed),
      dateRow?.earlyClosingTime || null,
      defaultRow?.lunchBreakTime || null,
      dateRow?.lunchBreakTime || null
    );
  } catch (err) {
    console.warn("Aviso: Fallback de escala em memória acionado:", err);
    const closed = isDateClosed(cleanDate);
    const early = getEarlyClosingTime(cleanDate);
    const memDefault = global.__studio_lunch_breaks?.[DEFAULT_SCHEDULE_ID] || null;
    const memDay = global.__studio_lunch_breaks?.[cleanDate] || null;
    return resolveScheduleValues(cleanDate, closed, early, memDefault, memDay);
  }
}

/**
 * Verifica no banco se a data está fechada (Domingo ou "Studio Fechado" por Lucas Augusto).
 */
export async function checkDayStatusDB(dateStr: string): Promise<DayStatus> {
  const baseStatus = checkDayStatus(dateStr);
  if (baseStatus.isSunday || !dateStr || dateStr.length < 10) {
    return baseStatus;
  }

  const schedule = await getDayScheduleDB(dateStr);
  if (schedule.isClosed) {
    return {
      isClosed: true,
      isSunday: false,
      isHoliday: false,
      isStudioClosed: true,
      reason: "O estúdio estará fechado nesta data pelo Master Barber Lucas Augusto.",
    };
  }

  return {
    isClosed: false,
    isSunday: false,
    isHoliday: false,
    reason: "",
  };
}

/**
 * Marca/desmarca uma data específica ("YYYY-MM-DD") como fechada no PostgreSQL.
 */
export async function setDateClosedDB(dateStr: string, closed: boolean): Promise<boolean> {
  const cleanDate = dateStr.substring(0, 10);
  setDateClosed(cleanDate, closed);

  try {
    await prisma.studioSchedule.upsert({
      where: { id: cleanDate },
      update: { isClosed: closed },
      create: { id: cleanDate, isClosed: closed },
    });
  } catch (err) {
    console.error("Erro ao persistir isClosed no PostgreSQL:", err);
  }

  return closed;
}

/**
 * Salva/remove encerramento antecipado para uma data específica no PostgreSQL.
 */
export async function setEarlyClosingTimeDB(
  dateStr: string,
  time: string | null
): Promise<string | null> {
  const cleanDate = dateStr.substring(0, 10);
  const value = time || null;
  setEarlyClosingTime(cleanDate, value);

  try {
    await prisma.studioSchedule.upsert({
      where: { id: cleanDate },
      update: { earlyClosingTime: value },
      create: { id: cleanDate, earlyClosingTime: value },
    });
  } catch (err) {
    console.error("Erro ao persistir earlyClosingTime no PostgreSQL:", err);
  }

  return value;
}

/**
 * Salva/remove a pausa para almoço no PostgreSQL.
 * - scope = "default": salva como pausa FIXA (direta, todos os dias) e limpa override do dia selecionado.
 * - scope = "date": salva uma exceção apenas para a data especificada ("NONE" se remover só naquela data).
 */
export async function setLunchBreakTimeDB(
  dateStr: string,
  time: string | null,
  scope: "default" | "date" = "default"
): Promise<ResolvedDaySchedule> {
  const cleanDate = dateStr.substring(0, 10);
  const cleanTime = time ? time.trim() : null;

  if (scope === "default") {
    setLunchBreakTime(DEFAULT_SCHEDULE_ID, cleanTime);
    setLunchBreakTime(cleanDate, null);

    try {
      await prisma.studioSchedule.upsert({
        where: { id: DEFAULT_SCHEDULE_ID },
        update: { lunchBreakTime: cleanTime },
        create: { id: DEFAULT_SCHEDULE_ID, lunchBreakTime: cleanTime },
      });

      // Garante que a data visualizada siga imediatamente o padrão fixo atualizado
      const existingDay = await prisma.studioSchedule.findUnique({
        where: { id: cleanDate },
      });
      if (existingDay && existingDay.lunchBreakTime !== null) {
        await prisma.studioSchedule.update({
          where: { id: cleanDate },
          data: { lunchBreakTime: null },
        });
      }
    } catch (err) {
      console.error("Erro ao persistir pausa de almoço fixa no PostgreSQL:", err);
    }
  } else {
    try {
      const defaultRow = await prisma.studioSchedule.findUnique({
        where: { id: DEFAULT_SCHEDULE_ID },
      });
      const hasDefaultLunch = Boolean(
        defaultRow?.lunchBreakTime && defaultRow.lunchBreakTime !== NO_LUNCH_OVERRIDE
      );

      // Se houver pausa fixa ativa e o barbeiro selecionar "Sem pausa" apenas para este dia,
      // gravamos "NONE" nessa data para destravar somente esse dia sem apagar o padrão fixo.
      const dayValue = cleanTime || (hasDefaultLunch ? NO_LUNCH_OVERRIDE : null);
      setLunchBreakTime(cleanDate, dayValue);

      await prisma.studioSchedule.upsert({
        where: { id: cleanDate },
        update: { lunchBreakTime: dayValue },
        create: { id: cleanDate, lunchBreakTime: dayValue },
      });
    } catch (err) {
      console.error("Erro ao persistir pausa de almoço da data no PostgreSQL:", err);
      const hasMemDefault = Boolean(global.__studio_lunch_breaks?.[DEFAULT_SCHEDULE_ID]);
      setLunchBreakTime(cleanDate, cleanTime || (hasMemDefault ? NO_LUNCH_OVERRIDE : null));
    }
  }

  return getDayScheduleDB(cleanDate);
}
