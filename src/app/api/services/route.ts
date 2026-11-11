import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { OFFICIAL_SERVICES } from '@/lib/services';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    try {
      const dbServices = await prisma.service.findMany({
        orderBy: { price: 'asc' }
      });

      if (dbServices && dbServices.length > 0) {
        const dbById = new Map(dbServices.map((s) => [s.id, s]));
        const syncedServices = OFFICIAL_SERVICES.map((official) => {
          const existing = dbById.get(official.id);
          return existing
            ? {
                ...existing,
                name: official.name,
                description: official.description,
                price: official.price,
                duration: official.duration,
              }
            : official;
        });
        return NextResponse.json(syncedServices, {
          headers: { 'Cache-Control': 'no-store' },
        });
      }
    } catch (dbErr) {
      console.warn("DB offline, retornando serviços oficiais padrão");
    }

    // Retorna todos os serviços e combos oficiais
    return NextResponse.json(OFFICIAL_SERVICES, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json(OFFICIAL_SERVICES, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
