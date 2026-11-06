import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BARBERS } from "@/lib/barbers";
import { 
  isDateClosed, 
  setDateClosed, 
  getEarlyClosingTime, 
  setEarlyClosingTime,
  getLunchBreakTime,
  setLunchBreakTime
} from "@/lib/barber-availability";
import { getBrazilNow } from "@/lib/timezone";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date") || getBrazilNow().date;

  const closedThisDate = isDateClosed(dateParam);
  const earlyClosing = getEarlyClosingTime(dateParam);
  const lunchBreak = getLunchBreakTime(dateParam);

  // Lucas Augusto está sempre disponível na lista de profissionais.
  // O status de aberto/fechado é avaliado para a data consultada.
  const barbersWithStatus = BARBERS.map((b) => ({
    ...b,
    isAvailable: !closedThisDate,
    isDateClosed: closedThisDate,
    earlyClosingTime: earlyClosing,
    lunchBreakTime: lunchBreak,
    queryDate: dateParam,
  }));

  return NextResponse.json(barbersWithStatus);
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (userRole !== "ADMIN" && userRole !== "BARBER")) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const body = await req.json();
    const { barberId, isAvailable, date, earlyClosingTime, lunchBreakTime } = body;
    const targetDate = date || getBrazilNow().date;

    if (typeof isAvailable === "boolean") {
      // isAvailable: false -> fecha a data selecionada
      // isAvailable: true -> abre a data selecionada
      setDateClosed(targetDate, !isAvailable);
    }

    if (earlyClosingTime !== undefined) {
      setEarlyClosingTime(targetDate, earlyClosingTime || null);
    }

    if (lunchBreakTime !== undefined) {
      setLunchBreakTime(targetDate, lunchBreakTime || null);
    }

    const currentClosed = isDateClosed(targetDate);
    const currentEarly = getEarlyClosingTime(targetDate);
    const currentLunch = getLunchBreakTime(targetDate);

    return NextResponse.json({
      success: true,
      barberId: barberId || "barbeiro-lucas",
      date: targetDate,
      isAvailable: !currentClosed,
      isDateClosed: currentClosed,
      earlyClosingTime: currentEarly,
      lunchBreakTime: currentLunch,
      message: currentClosed
        ? `Studio marcado como FECHADO para o dia ${targetDate.split("-").reverse().join("/")}. Os demais dias permanecem normais.`
        : `Studio ABERTO para o dia ${targetDate.split("-").reverse().join("/")}.`,
    });
  } catch (error) {
    console.error("Erro ao atualizar escala do studio:", error);
    return NextResponse.json({ error: "Erro ao atualizar status do barbeiro" }, { status: 500 });
  }
}
