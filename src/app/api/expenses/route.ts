import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (userRole !== "ADMIN" && userRole !== "BARBER")) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar despesas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (userRole !== "ADMIN" && userRole !== "BARBER")) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const { description, amount } = await req.json();
    if (!description || !amount || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        description: String(description).slice(0, 200),
        amount: parseFloat(amount)
      }
    });
    return NextResponse.json({ success: true, expense });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar despesa' }, { status: 500 });
  }
}
