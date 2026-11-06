import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { OFFICIAL_SERVICES } from "@/lib/services";
import { BARBERS } from "@/lib/barbers";

export async function GET(req: Request) {
  // Proteção de segurança: apenas requisições autenticadas podem executar setup do banco
  const authHeader = req.headers.get("authorization");
  const secretParam = new URL(req.url).searchParams.get("key");
  const expectedSecret = process.env.NEXTAUTH_SECRET || "super-secret-las-barber-key-2026";

  if (authHeader !== `Bearer ${expectedSecret}` && secretParam !== expectedSecret) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public."CashClosing" (
          "id" TEXT NOT NULL,
          "date" TIMESTAMP(3) NOT NULL,
          "totalRevenue" DOUBLE PRECISION NOT NULL,
          "totalExpenses" DOUBLE PRECISION,
          "closedBy" TEXT,
          "notes" TEXT,
          "barberRevenues" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "CashClosing_pkey" PRIMARY KEY ("id")
      );
    `);

    // Sincroniza todos os 9 serviços e combos oficiais
    for (const s of OFFICIAL_SERVICES) {
      try {
        await prisma.service.upsert({
          where: { id: s.id },
          update: {
            name: s.name,
            price: s.price,
            duration: s.duration,
            description: s.description,
          },
          create: {
            id: s.id,
            name: s.name,
            description: s.description,
            price: s.price,
            duration: s.duration,
          },
        });
      } catch (err) {
        console.warn(`Erro ao sincronizar serviço ${s.id}:`, err);
      }
    }

    // Sincroniza o barbeiro oficial (Lucas Augusto)
    for (const b of BARBERS) {
      try {
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
      } catch (err) {
        console.warn(`Erro ao sincronizar barbeiro ${b.id}:`, err);
      }
    }

    const servicesCount = await prisma.service.count();
    const barbersCount = await prisma.barber.count();
    const closingsCount = await prisma.cashClosing.count();

    return NextResponse.json({
      success: true,
      message: "Banco de dados sincronizado e atualizado!",
      servicesCount,
      barbersCount,
      closingsCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
