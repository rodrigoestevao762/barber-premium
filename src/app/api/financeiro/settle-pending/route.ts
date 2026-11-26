import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getMonthRangeBrazil } from "@/lib/expenses";
import { getBrazilDateAndTimeString, getBrazilNow } from "@/lib/timezone";
import { getAllStoredAppointments, updateStoredAppointmentStatus } from "@/lib/appointments-store";
import { getMonthlyFinancialSummary } from "@/lib/financial-summary";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (userRole !== "ADMIN" && userRole !== "BARBER")) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const todayBrazil = getBrazilNow().date;
    const targetMonth =
      typeof body?.month === "string" && /^\d{4}-\d{2}$/.test(body.month)
        ? body.month
        : todayBrazil.slice(0, 7);

    const { start, end } = getMonthRangeBrazil(targetMonth);
    const now = new Date();
    const cutoff = now.getTime() < end.getTime() ? now : end;

    let settledDbCount = 0;
    try {
      const pendingDb = await prisma.appointment.findMany({
        where: {
          date: { gte: start, lt: cutoff },
          status: { in: ["PENDING", "CONFIRMED", "RESCHEDULE_REQUESTED"] },
        },
        include: { user: { select: { name: true } } },
      });

      const validIds = pendingDb
        .filter(
          (a) =>
            !String(a.id).includes("almir") &&
            !String(a.user?.name || "").toLowerCase().includes("almir")
        )
        .map((a) => a.id);

      if (validIds.length > 0) {
        const updated = await prisma.appointment.updateMany({
          where: { id: { in: validIds } },
          data: { status: "COMPLETED" },
        });
        settledDbCount = updated.count;
      }
    } catch (err) {
      console.warn("Aviso ao concluir pendentes passados no Postgres:", err);
    }

    let settledMemCount = 0;
    const nowMs = now.getTime();
    for (const apt of getAllStoredAppointments()) {
      const { date: brazilDateStr } = getBrazilDateAndTimeString(apt.date);
      if (!brazilDateStr.startsWith(targetMonth)) continue;
      if (new Date(apt.date).getTime() >= nowMs) continue;
      if (
        apt.status === "PENDING" ||
        apt.status === "CONFIRMED" ||
        apt.status === "RESCHEDULE_REQUESTED"
      ) {
        if (updateStoredAppointmentStatus(apt.id, "COMPLETED")) {
          settledMemCount += 1;
        }
      }
    }

    const summary = await getMonthlyFinancialSummary(
      targetMonth,
      typeof body?.date === "string" ? body.date : undefined
    );

    return NextResponse.json({
      settledCount: Math.max(settledDbCount, settledMemCount) || settledDbCount + settledMemCount,
      summary,
    });
  } catch (error) {
    console.error("Erro ao concluir agendamentos pendentes:", error);
    return NextResponse.json(
      { error: "Erro ao concluir agendamentos pendentes" },
      { status: 500 }
    );
  }
}
