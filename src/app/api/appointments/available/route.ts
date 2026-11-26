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
  toMinutes,
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
    const brazilNow = getBrazilNow();
    const dayStatus = checkDayStatus(cleanDateStr);
    const schedule = await getDayScheduleDB(cleanDateStr);

    const [yStr, mStr, dStr] = cleanDateStr.split("-");
    const dateObj = new Date(
      Date.UTC(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10), 12, 0, 0)
    );
    const dayOfWeek = dateObj.getUTCDay();
    const orderedDaySlots = dayOfWeek === 6 ? [...SATURDAY_HOURS] : [...WEEKDAY_HOURS];

    // Se for Domingo ou fechado (quando não é modo admin includePast), retorna vazio imediatamente
    if (dayStatus.isSunday) {
      return jsonNoStore({
        availableTimes: [],
        isClosed: true,
        isSunday: true,
        isHoliday: false,
        isStudioClosed: false,
        reason: dayStatus.reason,
        ...(includePast
          ? {
              baseSlots: [],
              occupiedSlots: [],
              pastSlots: [],
              bookedTimes: [],
              todayDate: brazilNow.date,
              currentTime: brazilNow.time,
              lunchBreakSlots: [],
            }
          : {}),
      });
    }

    if (cleanDateStr < brazilNow.date) {
      return jsonNoStore({
        availableTimes: [],
        ...(includePast
          ? {
              baseSlots: orderedDaySlots,
              occupiedSlots: [],
              pastSlots: orderedDaySlots,
              bookedTimes: [],
              todayDate: brazilNow.date,
              currentTime: brazilNow.time,
              isClosed: false,
              lunchBreakSlots: schedule.lunchBreakSlots,
            }
          : {}),
      });
    }

    if (schedule.isClosed) {
      return jsonNoStore({
        availableTimes: [],
        isClosed: true,
        isSunday: false,
        isHoliday: false,
        isStudioClosed: true,
        reason: "O estúdio estará fechado nesta data pelo Master Barber Lucas Augusto.",
        ...(includePast
          ? {
              baseSlots: orderedDaySlots,
              occupiedSlots: [],
              pastSlots: [],
              bookedTimes: [],
              todayDate: brazilNow.date,
              currentTime: brazilNow.time,
              lunchBreakSlots: schedule.lunchBreakSlots,
            }
          : {}),
      });
    }

    const earlyClosingTime = schedule.earlyClosingTime;
    const lunchBreakTime = schedule.lunchBreakTime;
    const lunchBreakSlots = schedule.lunchBreakSlots;

    const startOfDay = new Date(`${cleanDateStr}T00:00:00-03:00`);
    const endOfDay = new Date(`${cleanDateStr}T23:59:59-03:00`);
    const bookedTimes: string[] = [];
    let dbOk = false;

    try {
      const bookedAppointments = await prisma.appointment.findMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          status: { notIn: ["CANCELLED"] },
        },
        include: { user: { select: { name: true } } },
      });

      (bookedAppointments || [])
        .filter(
          (apt) =>
            !apt.id?.includes("almir") &&
            !apt.user?.name?.toLowerCase().includes("almir")
        )
        .forEach((apt) => {
          const t = formatAptTimeToHHMM(apt.date);
          if (!bookedTimes.includes(t)) bookedTimes.push(t);
        });
      dbOk = true;
    } catch (_) {}

    if (!dbOk) {
      const storedApts = getAppointmentsForDate(cleanDateStr, null);
      storedApts
        .filter(
          (apt) =>
            apt.status !== "CANCELLED" &&
            !apt.id?.includes("almir") &&
            !apt.user?.name?.toLowerCase().includes("almir")
        )
        .forEach((apt) => {
          const t = formatAptTimeToHHMM(apt.date);
          if (!bookedTimes.includes(t)) {
            bookedTimes.push(t);
          }
        });
    }

    const pastSlots =
      cleanDateStr === brazilNow.date
        ? orderedDaySlots.filter((slot) => toMinutes(slot) <= toMinutes(brazilNow.time))
        : [];

    const occupiedSlots = orderedDaySlots.filter((slot) =>
      bookedTimes.some((bt) => doesBookingOccupySlot(bt, slot, orderedDaySlots))
    );

    const availableTimes = orderedDaySlots.filter((slot) => {
      if (earlyClosingTime && slot > earlyClosingTime) return false;
      if (lunchBreakSlots.includes(slot)) return false;
      if (pastSlots.includes(slot)) return false;
      if (occupiedSlots.includes(slot)) return false;
      return true;
    });

    return jsonNoStore({
      availableTimes,
      ...(includePast
        ? {
            baseSlots: orderedDaySlots,
            occupiedSlots,
            pastSlots,
            bookedTimes,
            todayDate: brazilNow.date,
            currentTime: brazilNow.time,
            isClosed: false,
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
