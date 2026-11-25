import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAppointmentsForDate } from "@/lib/appointments-store";
import { getBrazilNow, formatAptTimeToHHMM } from "@/lib/timezone";
import { checkDayStatus } from "@/lib/holidays";
import { getDayScheduleDB } from "@/lib/studio-schedule";
import {
  WEEKDAY_HOURS,
  SATURDAY_HOURS,
  doesBookingOccupySlot,
} from "@/lib/studio-slots";

export const dynamic = "force-dynamic";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const includePast = searchParams.get("includePast") === "1";

    if (!dateParam) {
      return NextResponse.json({ error: "Data não informada" }, { status: 400 });
    }

    const cleanDateStr = dateParam.substring(0, 10);

    // 1. Verificação de Domingo
    const dayStatus = checkDayStatus(cleanDateStr);
    if (dayStatus.isSunday && !includePast) {
      return jsonNoStore({
        availableTimes: [],
        isClosed: true,
        isSunday: true,
        isHoliday: false,
        isStudioClosed: false,
        reason: dayStatus.reason,
      });
    }

    const brazilNow = getBrazilNow();

    // 2. Se a data for no passado (antes de hoje no Brasil), não há horários livres para clientes online
    if (cleanDateStr < brazilNow.date && !includePast) {
      return jsonNoStore({ availableTimes: [] });
    }

    // 2.1 Busca configuração oficial da escala e pausa para almoço no PostgreSQL
    const schedule = await getDayScheduleDB(cleanDateStr);
    if (schedule.isClosed && !includePast) {
      return jsonNoStore({
        availableTimes: [],
        isClosed: true,
        isSunday: false,
        isHoliday: false,
        isStudioClosed: true,
        reason: "O estúdio estará fechado nesta data pelo Master Barber Lucas Augusto.",
      });
    }

    // 3. Determina os horários base de acordo com o dia da semana
    const [yStr, mStr, dStr] = cleanDateStr.split("-");
    const dateObj = new Date(
      Date.UTC(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10), 12, 0, 0)
    );
    const dayOfWeek = dateObj.getUTCDay();

    const orderedDaySlots = dayOfWeek === 6 ? [...SATURDAY_HOURS] : [...WEEKDAY_HOURS];
    let baseHours = [...orderedDaySlots];

    // 4. Verificação de Encerramento Antecipado
    const earlyClosingTime = schedule.earlyClosingTime;
    if (earlyClosingTime && !includePast) {
      baseHours = baseHours.filter((time) => time <= earlyClosingTime);
    }

    // 4.1 Verificação de Pausa para Almoço do Barbeiro
    const lunchBreakTime = schedule.lunchBreakTime;
    const lunchBreakSlots = schedule.lunchBreakSlots;
    if (lunchBreakSlots.length > 0 && !includePast) {
      baseHours = baseHours.filter((time) => !lunchBreakSlots.includes(time));
    }

    // 5. Se for o dia de hoje, remove horários que já passaram (apenas para visão pública)
    if (cleanDateStr === brazilNow.date && !includePast) {
      baseHours = baseHours.filter((time) => time > brazilNow.time);
    }

    // Intervalo do dia no fuso horário do Brasil (UTC-3)
    const startOfDay = new Date(`${cleanDateStr}T00:00:00-03:00`);
    const endOfDay = new Date(`${cleanDateStr}T23:59:59-03:00`);

    const bookedTimes: string[] = [];

    try {
      const bookedAppointments = await prisma.appointment.findMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          status: { notIn: ["CANCELLED"] },
        },
      });

      (bookedAppointments || []).forEach((apt) => {
        const t = formatAptTimeToHHMM(apt.date);
        if (!bookedTimes.includes(t)) bookedTimes.push(t);
      });
    } catch (_) {
      // fallback segue abaixo com store em memória
    }

    const storedApts = getAppointmentsForDate(cleanDateStr, null);
    storedApts
      .filter((apt) => apt.status !== "CANCELLED")
      .forEach((apt) => {
        const t = formatAptTimeToHHMM(apt.date);
        if (!bookedTimes.includes(t)) {
          bookedTimes.push(t);
        }
      });

    const availableTimes = baseHours.filter(
      (slot) => !bookedTimes.some((bt) => doesBookingOccupySlot(bt, slot, orderedDaySlots))
    );

    const occupiedSlots = orderedDaySlots.filter((slot) =>
      bookedTimes.some((bt) => doesBookingOccupySlot(bt, slot, orderedDaySlots))
    );

    return jsonNoStore({
      availableTimes,
      ...(includePast
        ? {
            baseSlots: orderedDaySlots,
            occupiedSlots,
            bookedTimes,
            isClosed: dayStatus.isSunday || schedule.isClosed,
          }
        : {}),
      isSaturday: dayOfWeek === 6,
      earlyClosingTime: earlyClosingTime || null,
      lunchBreakTime: lunchBreakTime || null,
      lunchBreakSlots,
    });
  } catch (error) {
    console.error("Erro ao buscar horários disponíveis:", error);
    return NextResponse.json({ error: "Erro ao buscar horários" }, { status: 500 });
  }
}
