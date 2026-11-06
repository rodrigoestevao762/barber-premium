import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllStoredAppointments } from '@/lib/appointments-store';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userBarberId = (session?.user as any)?.barberId;

    if (!session || (userRole !== 'ADMIN' && userRole !== 'BARBER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    let dbApts: any[] = [];
    try {
      dbApts = await prisma.appointment.findMany({
        where: {
          ...(userRole === 'BARBER' && userBarberId ? { barberId: userBarberId } : {}),
        },
        include: { service: true, user: true, barber: true },
        orderBy: { date: 'asc' }
      });
    } catch (dbErr) {
      console.warn("DB offline ao carregar appointments/all, usando storage blindado.");
    }

    const memApts = getAllStoredAppointments().filter(
      (a) => !userBarberId || userRole === 'ADMIN' || a.barberId === userBarberId
    );

    const map = new Map<string, any>();
    memApts.forEach((a) => map.set(a.id, a));
    dbApts.forEach((a) => map.set(a.id, a));

    const combined = Array.from(map.values())
      .filter((a) => !a.id?.includes("almir") && !a.user?.name?.toLowerCase().includes("almir"))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const appointmentsWithDuration = combined.map(apt => {
       if (apt.status === 'COMPLETED' && apt.updatedAt) {
          const dur = Math.floor((new Date(apt.updatedAt).getTime() - new Date(apt.date).getTime()) / 60000);
          return { ...apt, durationSpent: dur > 0 ? dur : 1 };
       }
       return apt;
    });

    return NextResponse.json(appointmentsWithDuration);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar' }, { status: 500 });
  }
}
