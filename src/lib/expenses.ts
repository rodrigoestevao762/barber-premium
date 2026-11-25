import prisma from "@/lib/prisma";
import { getBrazilDateAndTimeString, getBrazilNow, parseBrazilDateTime } from "@/lib/timezone";

export type ExpenseCategory = "INSUMOS" | "FIXO" | "OUTROS";

export interface NormalizedExpense {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  dateStr: string;
  createdAt: string;
}

declare global {
  var __las_expenses_v2: NormalizedExpense[] | undefined;
}

const VALID_CATEGORIES = new Set<ExpenseCategory>(["INSUMOS", "FIXO", "OUTROS"]);
const CATEGORY_PREFIX_RE = /^\[(INSUMOS|FIXO|OUTROS)\]\s*/i;

export function normalizeCategory(cat?: unknown): ExpenseCategory {
  if (typeof cat === "string") {
    const upper = cat.trim().toUpperCase() as ExpenseCategory;
    if (VALID_CATEGORIES.has(upper)) return upper;
  }
  return "OUTROS";
}

export function parseExpenseDescription(rawDescription: string): {
  category: ExpenseCategory;
  description: string;
} {
  const safeRaw = String(rawDescription || "").trim();
  const match = safeRaw.match(CATEGORY_PREFIX_RE);
  if (match) {
    return {
      category: normalizeCategory(match[1]),
      description: safeRaw.slice(match[0].length).trim() || safeRaw,
    };
  }
  return { category: "OUTROS", description: safeRaw };
}

export function encodeExpenseDescription(description: string, category: ExpenseCategory): string {
  const stripped = String(description || "").replace(CATEGORY_PREFIX_RE, "").trim();
  return `[${category}] ${stripped.slice(0, 185)}`;
}

export function getDayRangeBrazil(dateStr?: string): {
  dateStr: string;
  start: Date;
  end: Date;
} {
  const safeDate =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : getBrazilNow().date;
  return {
    dateStr: safeDate,
    start: new Date(`${safeDate}T00:00:00-03:00`),
    end: new Date(`${safeDate}T23:59:59.999-03:00`),
  };
}

export function getMonthRangeBrazil(monthStr?: string): {
  monthStr: string;
  start: Date;
  end: Date;
  monthLabel: string;
} {
  const fallbackMonth = getBrazilNow().date.slice(0, 7);
  const safeMonth =
    monthStr && /^\d{4}-\d{2}$/.test(monthStr) ? monthStr : fallbackMonth;
  const [yearStr, mStr] = safeMonth.split("-");
  const year = Number(yearStr);
  const month = Number(mStr);
  const lastDayNum = new Date(year, month, 0).getDate();
  const lastDay = String(lastDayNum).padStart(2, "0");

  const start = new Date(`${safeMonth}-01T00:00:00-03:00`);
  const end = new Date(`${safeMonth}-${lastDay}T23:59:59.999-03:00`);

  const rawLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${safeMonth}-15T12:00:00-03:00`));
  const monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  return { monthStr: safeMonth, start, end, monthLabel };
}

function toNormalizedExpense(row: {
  id: string;
  description: string;
  amount: number;
  date: Date | string;
  createdAt?: Date | string;
}): NormalizedExpense {
  const parsed = parseExpenseDescription(row.description);
  const dateObj = typeof row.date === "string" ? new Date(row.date) : row.date;
  const createdObj = row.createdAt
    ? typeof row.createdAt === "string"
      ? new Date(row.createdAt)
      : row.createdAt
    : dateObj;

  return {
    id: row.id,
    description: parsed.description,
    category: parsed.category,
    amount: Number(row.amount || 0),
    date: dateObj.toISOString(),
    dateStr: getBrazilDateAndTimeString(dateObj).date,
    createdAt: createdObj.toISOString(),
  };
}

function getFallbackExpenses(): NormalizedExpense[] {
  if (!global.__las_expenses_v2) {
    global.__las_expenses_v2 = [];
  }
  return global.__las_expenses_v2;
}

export async function listExpenses(options?: {
  dateStr?: string;
  monthStr?: string;
}): Promise<NormalizedExpense[]> {
  let start: Date | undefined;
  let end: Date | undefined;

  if (options?.dateStr && /^\d{4}-\d{2}-\d{2}$/.test(options.dateStr)) {
    const range = getDayRangeBrazil(options.dateStr);
    start = range.start;
    end = range.end;
  } else if (options?.monthStr && /^\d{4}-\d{2}$/.test(options.monthStr)) {
    const range = getMonthRangeBrazil(options.monthStr);
    start = range.start;
    end = range.end;
  }

  const map = new Map<string, NormalizedExpense>();

  try {
    const rows = await prisma.expense.findMany({
      where: start && end ? { date: { gte: start, lte: end } } : undefined,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    rows.forEach((r) => {
      const normalized = toNormalizedExpense(r);
      map.set(normalized.id, normalized);
    });
  } catch (err) {
    console.warn("Aviso ao consultar despesas no Postgres, usando fallback em memória:", err);
  }

  getFallbackExpenses().forEach((item) => {
    if (options?.dateStr && item.dateStr !== options.dateStr) return;
    if (!options?.dateStr && options?.monthStr && !item.dateStr.startsWith(options.monthStr)) return;
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function createExpenseRecord(input: {
  description: string;
  amount: number;
  category?: unknown;
  dateStr?: string;
}): Promise<NormalizedExpense> {
  const category = normalizeCategory(input.category);
  const encoded = encodeExpenseDescription(input.description, category);
  const nowBr = getBrazilNow();
  const targetDateStr =
    input.dateStr && /^\d{4}-\d{2}-\d{2}$/.test(input.dateStr)
      ? input.dateStr
      : nowBr.date;
  const timeToUse = targetDateStr === nowBr.date ? nowBr.time : "12:00";
  const parsedDate = parseBrazilDateTime(targetDateStr, timeToUse);

  try {
    const created = await prisma.expense.create({
      data: {
        description: encoded,
        amount: input.amount,
        date: parsedDate,
      },
    });
    return toNormalizedExpense(created);
  } catch (err) {
    console.warn("Aviso ao salvar despesa no Postgres, gravando em memória:", err);
    const fallback: NormalizedExpense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: parseExpenseDescription(encoded).description,
      category,
      amount: input.amount,
      date: parsedDate.toISOString(),
      dateStr: targetDateStr,
      createdAt: new Date().toISOString(),
    };
    const list = getFallbackExpenses();
    list.unshift(fallback);
    return fallback;
  }
}

export async function deleteExpenseRecord(id: string): Promise<boolean> {
  let deleted = false;
  try {
    await prisma.expense.delete({ where: { id } });
    deleted = true;
  } catch (err) {
    console.warn("Aviso ao excluir despesa no Postgres:", err);
  }

  const list = getFallbackExpenses();
  const idx = list.findIndex((item) => item.id === id);
  if (idx !== -1) {
    list.splice(idx, 1);
    deleted = true;
  }

  return deleted;
}
