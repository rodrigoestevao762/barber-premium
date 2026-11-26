import prisma from "@/lib/prisma";
import { getAllStoredAppointments } from "@/lib/appointments-store";
import { enrichAppointmentsWithAddons, getAppointmentTotalPrice } from "@/lib/appointment-addons";
import { getBrazilDateAndTimeString } from "@/lib/timezone";
import {
  getDayRangeBrazil,
  getMonthRangeBrazil,
  listExpenses,
  NormalizedExpense,
} from "@/lib/expenses";

export interface DailyBreakdownItem {
  date: string;
  dayOfWeek: string;
  isSunday: boolean;
  completedCount: number;
  grossRevenue: number;
  expenses: number;
  netProfit: number;
  accumulatedGross: number;
  accumulatedExpenses: number;
  accumulatedNet: number;
}

export interface MonthlyFinancialSummary {
  month: string;
  monthLabel: string;
  grossRevenue: number;
  expenses: number;
  netProfit: number;
  marginPercent: number;
  completedCount: number;
  scheduledCount: number;
  pendingRevenue: number;
  pastPendingCount: number;
  pastPendingRevenue: number;
  ticketMedio: number;
  expensesCount: number;
  expensesByCategory: {
    INSUMOS: number;
    FIXO: number;
    OUTROS: number;
  };
  expensesList: NormalizedExpense[];
  dailyBreakdown: DailyBreakdownItem[];
  selectedDay?: {
    date: string;
    grossRevenue: number;
    expenses: number;
    netProfit: number;
    completedCount: number;
    ticketMedio: number;
    expensesList: NormalizedExpense[];
  };
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  timeZone: "America/Sao_Paulo",
});

function getWeekdayLabel(dateStr: string): { dayOfWeek: string; isSunday: boolean } {
  const d = new Date(`${dateStr}T12:00:00-03:00`);
  const raw = WEEKDAY_FORMATTER.format(d).replace(".", "");
  const formatted = raw.charAt(0).toUpperCase() + raw.slice(1);
  const isSunday = d.getUTCDay() === 0 && formatted.toLowerCase().startsWith("dom");
  return {
    dayOfWeek: formatted,
    isSunday: formatted.toLowerCase().startsWith("dom") || isSunday,
  };
}

function isValidAppointment(apt: any): boolean {
  const id = String(apt?.id || "");
  const name = String(apt?.user?.name || "").toLowerCase();
  return !id.includes("almir") && !name.includes("almir");
}

async function fetchAppointmentsForRange(
  start: Date,
  end: Date,
  filterFn: (brazilDateStr: string) => boolean
): Promise<any[]> {
  let dbOk = false;

  try {
    const dbAppointments = await prisma.appointment.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: { service: true, user: true, barber: true },
      orderBy: { date: "asc" },
    });
    dbOk = true;
    return (dbAppointments || []).filter((a) => isValidAppointment(a));
  } catch (err) {
    console.warn("Aviso ao consultar agendamentos mensais no Postgres:", err);
  }

  if (!dbOk) {
    return getAllStoredAppointments().filter((a) => {
      if (!isValidAppointment(a)) return false;
      const { date: brazilDateStr } = getBrazilDateAndTimeString(a.date);
      return filterFn(brazilDateStr);
    });
  }

  return [];
}

/**
 * Consolida produção bruta, despesas e lucro líquido mensal (com todos os dias do mês
 * do dia 01 ao último dia e acumulado progressivo) usando PostgreSQL + fallback em memória.
 */
export async function getMonthlyFinancialSummary(
  monthStr?: string,
  dayStr?: string
): Promise<MonthlyFinancialSummary> {
  const { monthStr: targetMonth, start, end, monthLabel } = getMonthRangeBrazil(monthStr);

  const [rawMonthAppointments, monthExpenses] = await Promise.all([
    fetchAppointmentsForRange(start, end, (d) => d.startsWith(targetMonth)),
    listExpenses({ monthStr: targetMonth }),
  ]);

  const monthAppointments = await enrichAppointmentsWithAddons(rawMonthAppointments);

  const [yearNum, monthNum] = targetMonth.split("-").map(Number);
  const lastDayNum = new Date(yearNum, monthNum, 0).getDate();

  const dayMap = new Map<
    string,
    {
      date: string;
      dayOfWeek: string;
      isSunday: boolean;
      completedCount: number;
      grossRevenue: number;
      expenses: number;
    }
  >();

  for (let d = 1; d <= lastDayNum; d++) {
    const dayKey = `${targetMonth}-${String(d).padStart(2, "0")}`;
    const { dayOfWeek, isSunday } = getWeekdayLabel(dayKey);
    dayMap.set(dayKey, {
      date: dayKey,
      dayOfWeek,
      isSunday,
      completedCount: 0,
      grossRevenue: 0,
      expenses: 0,
    });
  }

  let grossRevenue = 0;
  let completedCount = 0;
  let scheduledCount = 0;
  let pendingRevenue = 0;
  let pastPendingCount = 0;
  let pastPendingRevenue = 0;
  const nowMs = Date.now();

  for (const apt of monthAppointments) {
    const price = getAppointmentTotalPrice(apt);
    const { date: aptDay } = getBrazilDateAndTimeString(apt.date);
    if (!aptDay.startsWith(targetMonth)) continue;

    if (apt.status === "COMPLETED") {
      grossRevenue += price;
      completedCount += 1;
      scheduledCount += 1;

      const bucket = dayMap.get(aptDay);
      if (bucket) {
        bucket.completedCount += 1;
        bucket.grossRevenue += price;
      }
    } else if (
      apt.status === "PENDING" ||
      apt.status === "CONFIRMED" ||
      apt.status === "RESCHEDULE_REQUESTED"
    ) {
      scheduledCount += 1;
      pendingRevenue += price;
      if (new Date(apt.date).getTime() < nowMs) {
        pastPendingCount += 1;
        pastPendingRevenue += price;
      }
    }
  }

  let expensesTotal = 0;
  const expensesByCategory = {
    INSUMOS: 0,
    FIXO: 0,
    OUTROS: 0,
  };

  for (const exp of monthExpenses) {
    const amount = Number(exp.amount || 0);
    expensesTotal += amount;
    expensesByCategory[exp.category] += amount;

    if (exp.dateStr.startsWith(targetMonth)) {
      const bucket = dayMap.get(exp.dateStr);
      if (bucket) {
        bucket.expenses += amount;
      }
    }
  }

  let runningGross = 0;
  let runningExpenses = 0;
  const dailyBreakdown: DailyBreakdownItem[] = Array.from(dayMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => {
      runningGross += item.grossRevenue;
      runningExpenses += item.expenses;
      const netProfit = item.grossRevenue - item.expenses;
      return {
        ...item,
        netProfit,
        accumulatedGross: runningGross,
        accumulatedExpenses: runningExpenses,
        accumulatedNet: runningGross - runningExpenses,
      };
    });

  const netProfit = grossRevenue - expensesTotal;
  const marginPercent = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
  const ticketMedio = completedCount > 0 ? grossRevenue / completedCount : 0;

  const summary: MonthlyFinancialSummary = {
    month: targetMonth,
    monthLabel,
    grossRevenue,
    expenses: expensesTotal,
    netProfit,
    marginPercent,
    completedCount,
    scheduledCount,
    pendingRevenue,
    pastPendingCount,
    pastPendingRevenue,
    ticketMedio,
    expensesCount: monthExpenses.length,
    expensesByCategory,
    expensesList: monthExpenses,
    dailyBreakdown,
  };

  if (dayStr && /^\d{4}-\d{2}-\d{2}$/.test(dayStr)) {
    if (dayStr.startsWith(targetMonth)) {
      const dayExpenses = monthExpenses.filter((e) => e.dateStr === dayStr);
      const dayBucket = dayMap.get(dayStr);
      const dayGross = dayBucket?.grossRevenue || 0;
      const dayExpTotal = dayExpenses.reduce((acc, e) => acc + e.amount, 0);
      const dayCompleted = dayBucket?.completedCount || 0;

      summary.selectedDay = {
        date: dayStr,
        grossRevenue: dayGross,
        expenses: dayExpTotal,
        netProfit: dayGross - dayExpTotal,
        completedCount: dayCompleted,
        ticketMedio: dayCompleted > 0 ? dayGross / dayCompleted : 0,
        expensesList: dayExpenses,
      };
    } else {
      const { dateStr: safeDay, start: dStart, end: dEnd } = getDayRangeBrazil(dayStr);
      const [rawDayApts, dayExpenses] = await Promise.all([
        fetchAppointmentsForRange(dStart, dEnd, (d) => d === safeDay),
        listExpenses({ dateStr: safeDay }),
      ]);
      const dayApts = await enrichAppointmentsWithAddons(rawDayApts);
      const dayCompletedApts = dayApts.filter((a) => a.status === "COMPLETED");
      const dayGross = dayCompletedApts.reduce((acc, a) => acc + getAppointmentTotalPrice(a), 0);
      const dayExpTotal = dayExpenses.reduce((acc, e) => acc + e.amount, 0);

      summary.selectedDay = {
        date: safeDay,
        grossRevenue: dayGross,
        expenses: dayExpTotal,
        netProfit: dayGross - dayExpTotal,
        completedCount: dayCompletedApts.length,
        ticketMedio: dayCompletedApts.length > 0 ? dayGross / dayCompletedApts.length : 0,
        expensesList: dayExpenses,
      };
    }
  }

  return summary;
}
