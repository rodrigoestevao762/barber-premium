import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BARBERS } from "@/lib/barbers";
import {
  getDayScheduleDB,
  setDateClosedDB,
  setEarlyClosingTimeDB,
  setLunchBreakTimeDB,
} from "@/lib/studio-schedule";
import { getBrazilNow } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date") || getBrazilNow().date;

  const schedule = await getDayScheduleDB(dateParam);

  // Lucas Augusto está sempre disponível na lista de profissionais.
  // O status de aberto/fechado é avaliado para a data consultada no banco PostgreSQL.
  const barbersWithStatus = BARBERS.map((b) => ({
    ...b,
    isAvailable: !schedule.isClosed,
    isDateClosed: schedule.isClosed,
    earlyClosingTime: schedule.earlyClosingTime,
    lunchBreakTime: schedule.lunchBreakTime,
    defaultLunchBreakTime: schedule.defaultLunchBreakTime,
    isLunchBreakFixed: schedule.isLunchBreakFixed,
    hasLunchDateOverride: schedule.hasLunchDateOverride,
    lunchBreakSlots: schedule.lunchBreakSlots,
    queryDate: dateParam,
  }));

  return NextResponse.json(barbersWithStatus, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (userRole !== "ADMIN" && userRole !== "BARBER")) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const body = await req.json();
    const {
      barberId,
      isAvailable,
      date,
      earlyClosingTime,
      lunchBreakTime,
      lunchBreakScope,
    } = body;
    const targetDate = (date || getBrazilNow().date).substring(0, 10);

    if (typeof isAvailable === "boolean") {
      // isAvailable: false -> fecha a data selecionada no banco
      // isAvailable: true -> abre a data selecionada no banco
      await setDateClosedDB(targetDate, !isAvailable);
    }

    if (earlyClosingTime !== undefined) {
      await setEarlyClosingTimeDB(targetDate, earlyClosingTime || null);
    }

    if (lunchBreakTime !== undefined) {
      const scope = lunchBreakScope === "date" ? "date" : "default";
      await setLunchBreakTimeDB(targetDate, lunchBreakTime || null, scope);
    }

    const schedule = await getDayScheduleDB(targetDate);

    return NextResponse.json({
      success: true,
      barberId: barberId || "barbeiro-lucas",
      date: targetDate,
      isAvailable: !schedule.isClosed,
      isDateClosed: schedule.isClosed,
      earlyClosingTime: schedule.earlyClosingTime,
      lunchBreakTime: schedule.lunchBreakTime,
      defaultLunchBreakTime: schedule.defaultLunchBreakTime,
      isLunchBreakFixed: schedule.isLunchBreakFixed,
      hasLunchDateOverride: schedule.hasLunchDateOverride,
      lunchBreakSlots: schedule.lunchBreakSlots,
      message: schedule.isClosed
        ? `Studio marcado como FECHADO para o dia ${targetDate.split("-").reverse().join("/")}. Os demais dias permanecem normais.`
        : `Escala do Studio atualizada com sucesso em ${targetDate.split("-").reverse().join("/")}.`,
    });
  } catch (error) {
    console.error("Erro ao atualizar escala do studio:", error);
    return NextResponse.json({ error: "Erro ao atualizar status do barbeiro" }, { status: 500 });
  }
}
