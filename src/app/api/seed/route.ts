import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { OFFICIAL_SERVICES } from '@/lib/services';

export async function GET(req: Request) {
  // Proteção de segurança: apenas requisições autenticadas podem executar o seed
  const authHeader = req.headers.get("authorization");
  const secretParam = new URL(req.url).searchParams.get("key");
  const expectedSecret = process.env.NEXTAUTH_SECRET || "super-secret-las-barber-key-2026";

  if (authHeader !== `Bearer ${expectedSecret}` && secretParam !== expectedSecret) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    for (const s of OFFICIAL_SERVICES) {
      try {
        await prisma.service.upsert({
          where: { id: s.id },
          update: {
            name: s.name,
            description: s.description,
            price: s.price,
            duration: s.duration,
          },
          create: {
            id: s.id,
            name: s.name,
            description: s.description,
            price: s.price,
            duration: s.duration,
          },
        });
      } catch (_) {}
    }

    return NextResponse.json({ success: true, message: "Banco Sincronizado e Serviços Oficiais Configurados!" });
  } catch (error) {
    console.error("SEED ERROR:", error);
    return NextResponse.json({ error: "Erro ao semear o banco" }, { status: 500 });
  }
}
