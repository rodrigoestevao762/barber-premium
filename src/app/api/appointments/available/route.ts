import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { BARBERS } from "@/lib/barbers";
import { getAppointmentsForDate } from "@/lib/appointments-store";
import { getBrazilNow, formatAptTimeToHHMM } from "@/lib/timezone";
import { checkDayStatus } from "@/lib/holidays";
import { getDayScheduleDB } from "@/lib/studio-schedule";

export const dynamic = "force-dynamic";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

// Horários Oficiais do LAS Barber Studio:
// - Segunda a Sexta: 08:30 às 20:00
// - Sábado: 08:30 às 18:00
// - Domingo: Fechado
const WEEKDAY_HOURS = [
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

const SATURDAY_HOURS = [
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const barberId = searchParams.get("barberId") || "barbeiro-lucas";

    if (!dateParam) {
      return NextResponse.json({ error: "Data não informada" }, { status: 400 });
    }

    const cleanDateStr = dateParam.substring(0, 10);

    // 1. Verificação de Domingo e data no passado
    const dayStatus = checkDayStatus(cleanDateStr);
    if (dayStatus.isSunday) {
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

    // 2. Se a data for no passado (antes de hoje no Brasil), não há horários livres
    if (cleanDateStr < brazilNow.date) {
      return jsonNoStore({ availableTimes: [] });
    }

    // 2.1 Busca configuração oficial da escala e pausa para almoço no PostgreSQL
    const schedule = await getDayScheduleDB(cleanDateStr);
    if (schedule.isClosed) {
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
    // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const [yStr, mStr, dStr] = cleanDateStr.split("-");
    const dateObj = new Date(Date.UTC(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10), 12, 0, 0));
    const dayOfWeek = dateObj.getUTCDay();

    let baseHours = dayOfWeek === 6 ? [...SATURDAY_HOURS] : [...WEEKDAY_HOURS];

    // 4. Verificação de Encerramento Antecipado (Caso o barbeiro precise sair mais cedo neste dia)
    const earlyClosingTime = schedule.earlyClosingTime;
    if (earlyClosingTime) {
      baseHours = baseHours.filter((time) => time <= earlyClosingTime);
    }

    // 4.1 Verificação de Pausa para Almoço do Barbeiro (Fixa diária ou específica desta data)
    const lunchBreakTime = schedule.lunchBreakTime;
    const lunchBreakSlots = schedule.lunchBreakSlots;
    if (lunchBreakSlots.length > 0) {
      baseHours = baseHours.filter((time) => !lunchBreakSlots.includes(time));
    }

    // 5. Se for o dia de hoje, remove horários que já passaram
    if (cleanDateStr === brazilNow.date) {
      baseHours = baseHours.filter((time) => time > brazilNow.time);
    }

    // Intervalo do dia no fuso horário do Brasil (UTC-3)
    const startOfDay = new Date(`${cleanDateStr}T00:00:00-03:00`);
    const endOfDay = new Date(`${cleanDateStr}T23:59:59-03:00`);

    try {
      // 6. Busca agendamentos ocupados no banco de dados
      const bookedAppointments = await prisma.appointment.findMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          status: { notIn: ["CANCELLED"] },
        },
      });

      const bookedTimes = (bookedAppointments || []).map((apt) => formatAptTimeToHHMM(apt.date));

      // Também verifica no store em memória para contingência
      const storedApts = getAppointmentsForDate(cleanDateStr, null);
      storedApts
        .filter((apt) => apt.status !== "CANCELLED")
        .forEach((apt) => {
          const t = formatAptTimeToHHMM(apt.date);
          if (!bookedTimes.includes(t)) {
            bookedTimes.push(t);
          }
        });

      const availableTimes = baseHours.filter((time) => !bookedTimes.includes(time));

      return jsonNoStore({
        availableTimes,
        isSaturday: dayOfWeek === 6,
        earlyClosingTime: earlyClosingTime || null,
        lunchBreakTime: lunchBreakTime || null,
        lunchBreakSlots,
      });
    } catch (dbErr) {
      // Fallback em memória
      const storedApts = getAppointmentsForDate(cleanDateStr, null);
      const bookedTimes = storedApts
        .filter((apt) => apt.status !== "CANCELLED")
        .map((apt) => formatAptTimeToHHMM(apt.date));

      const availableTimes = baseHours.filter((time) => !bookedTimes.includes(time));

      return jsonNoStore({
        availableTimes,
        isSaturday: dayOfWeek === 6,
        earlyClosingTime: earlyClosingTime || null,
        lunchBreakTime: lunchBreakTime || null,
        lunchBreakSlots,
      });
    }
  } catch (error) {
    console.error("Erro ao buscar horários disponíveis:", error);
    return NextResponse.json({ error: "Erro ao buscar horários" }, { status: 500 });
  }
}
