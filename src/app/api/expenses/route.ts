import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createExpenseRecord,
  deleteExpenseRecord,
  listExpenses,
} from "@/lib/expenses";

export const dynamic = "force-dynamic";

async function requireStaffSession() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  if (!session || (userRole !== "ADMIN" && userRole !== "BARBER")) {
    return null;
  }
  return session;
}

export async function GET(req: Request) {
  try {
    if (!(await requireStaffSession())) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date") || undefined;
    const monthStr = searchParams.get("month") || undefined;

    const expenses = await listExpenses({ dateStr, monthStr });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Erro ao buscar despesas:", error);
    return NextResponse.json({ error: "Erro ao buscar despesas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireStaffSession())) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const { description, amount, category, date } = await req.json();
    const numericAmount = typeof amount === "number" ? amount : parseFloat(String(amount).replace(",", "."));

    if (!description || !String(description).trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "Descrição e valor válido são obrigatórios." }, { status: 400 });
    }

    const expense = await createExpenseRecord({
      description: String(description).trim(),
      amount: numericAmount,
      category,
      dateStr: typeof date === "string" ? date.slice(0, 10) : undefined,
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error("Erro ao criar despesa:", error);
    return NextResponse.json({ error: "Erro ao criar despesa" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await requireStaffSession())) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id") || "";

    if (!id) {
      try {
        const body = await req.json();
        id = String(body?.id || "");
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ error: "ID da despesa é obrigatório." }, { status: 400 });
    }

    const deleted = await deleteExpenseRecord(id);
    if (!deleted) {
      return NextResponse.json({ error: "Despesa não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir despesa:", error);
    return NextResponse.json({ error: "Erro ao excluir despesa" }, { status: 500 });
  }
}
