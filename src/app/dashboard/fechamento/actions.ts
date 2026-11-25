"use server";

import prisma from "@/lib/prisma";
import { BARBERS } from "@/lib/barbers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getStoredClosingsForDate,
  addStoredClosing,
  getLocalDateString,
} from "@/lib/appointments-store";
import { getMonthlyFinancialSummary } from "@/lib/financial-summary";

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  if (!session || userRole !== "ADMIN") {
    return null;
  }
  return session;
}

export async function getFechamentoData(dateStr?: string) {
  try {
    if (!(await requireAdminSession())) {
      return { success: false as const, error: "Acesso restrito ao gestor." };
    }

    const targetDateStr = dateStr || getLocalDateString();
    const start = new Date(`${targetDateStr}T00:00:00-03:00`);
    const end = new Date(`${targetDateStr}T23:59:59.999-03:00`);

    const [summary, closings] = await Promise.all([
      getMonthlyFinancialSummary(targetDateStr.slice(0, 7), targetDateStr),
      prisma.cashClosing
        .findMany({
          where: {
            date: { gte: start, lte: end },
          },
          orderBy: { createdAt: "desc" },
        })
        .catch(() => getStoredClosingsForDate(targetDateStr)),
    ]);

    const dayRevenue = summary.selectedDay?.grossRevenue || 0;
    const dayExpenses = summary.selectedDay?.expenses || 0;
    const dayNet = summary.selectedDay?.netProfit ?? dayRevenue - dayExpenses;

    const masterBarber = BARBERS[0] || { id: "barbeiro-lucas", name: "Lucas Augusto" };

    // LAS Barber Studio possui modelo 100% exclusivo com o proprietário Lucas Augusto
    const barberRevenue = {
      id: masterBarber.id,
      name: masterBarber.name,
      total: dayRevenue,
      commission: dayNet,
      rate: 1.0,
      isOwner: true,
    };

    const sanitizedClosings = (closings || []).map((c: any) => ({
      ...c,
      closedBy:
        !c.closedBy || c.closedBy.includes("Bastos") || c.closedBy.includes("Mr.")
          ? "Lucas Augusto (Master Barber)"
          : c.closedBy,
    }));

    return {
      success: true as const,
      data: {
        totalRevenue: dayRevenue,
        totalExpenses: dayExpenses,
        netRevenue: dayNet,
        barberRevenues: [barberRevenue],
        closings: sanitizedClosings,
        monthlySummary: {
          month: summary.month,
          monthLabel: summary.monthLabel,
          grossRevenue: summary.grossRevenue,
          expenses: summary.expenses,
          netProfit: summary.netProfit,
          marginPercent: summary.marginPercent,
          completedCount: summary.completedCount,
          expensesCount: summary.expensesCount,
        },
      },
    };
  } catch (error: unknown) {
    console.error("Action error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false as const, error: msg };
  }
}

export async function closeCashRegister(data: {
  totalRevenue: number;
  totalExpenses?: number;
  barberRevenues: string;
  closedBy: string;
  dateStr: string;
}) {
  try {
    if (!(await requireAdminSession())) {
      return { success: false, error: "Acesso restrito ao gestor." };
    }

    const closingDate = new Date(`${data.dateStr}T23:59:59-03:00`);
    const expensesAmount = Number(data.totalExpenses || 0);

    try {
      const closing = await prisma.cashClosing.create({
        data: {
          date: closingDate,
          totalRevenue: data.totalRevenue,
          totalExpenses: expensesAmount,
          barberRevenues: data.barberRevenues,
          closedBy: data.closedBy,
        },
      });
      return { success: true, data: closing };
    } catch (dbErr) {
      const storedClosing = addStoredClosing({
        id: `closing-${Date.now()}`,
        date: data.dateStr,
        totalRevenue: data.totalRevenue,
        totalExpenses: expensesAmount,
        barberRevenues: data.barberRevenues,
        closedBy: data.closedBy,
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        data: storedClosing,
      };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}
