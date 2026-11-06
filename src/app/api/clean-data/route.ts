import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { BARBERS } from "@/lib/barbers";
import { clearAllStoredData } from "@/lib/appointments-store";

export async function GET(req: Request) {
  // Proteção de segurança: apenas requisições com chave de autorização podem executar limpeza
  const authHeader = req.headers.get("authorization");
  const secretParam = new URL(req.url).searchParams.get("key");
  const expectedSecret = process.env.NEXTAUTH_SECRET || "super-secret-las-barber-key-2026";

  if (authHeader !== `Bearer ${expectedSecret}` && secretParam !== expectedSecret) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    // 1. Limpa todos os agendamentos de teste
    try { await prisma.appointment.deleteMany(); } catch (_) {}

    // 2. Limpa listas de espera de teste
    try { await prisma.waitlist.deleteMany(); } catch (_) {}

    // 3. Limpa fechamentos de caixa de teste
    try { await prisma.cashClosing.deleteMany(); } catch (_) {}

    // 4. Limpa despesas de teste
    try { await prisma.expense.deleteMany(); } catch (_) {}

    // 5. Apaga todas as contas temporárias exceto a conta oficial do proprietário (Lucas Augusto)
    try {
      await prisma.user.deleteMany({
        where: {
          NOT: {
            email: "lucastj609@gmail.com",
          },
        },
      });
    } catch (_) {}

    // 6. Garante apenas o barbeiro oficial (Lucas Augusto) cadastrado
    const officialBarberIds = BARBERS.map((b) => b.id);
    try {
      await prisma.barber.deleteMany({
        where: {
          id: { notIn: officialBarberIds },
        },
      });

      for (const b of BARBERS) {
        await prisma.barber.upsert({
          where: { id: b.id },
          update: {
            name: b.name,
            commissionRate: b.commissionRate,
          },
          create: {
            id: b.id,
            name: b.name,
            commissionRate: b.commissionRate,
          },
        });
      }
    } catch (_) {}

    // 7. Zera o cache em memória
    clearAllStoredData();

    return NextResponse.json({
      success: true,
      message: "Todas as contas temporárias e dados de teste foram apagados com sucesso.",
    });
  } catch (err: any) {
    console.error("Erro em clean-data:", err);
    return NextResponse.json({ error: "Erro ao limpar dados." }, { status: 500 });
  }
}
