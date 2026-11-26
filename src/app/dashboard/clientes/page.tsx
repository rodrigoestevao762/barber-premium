export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import { getAllStoredUsers } from '@/lib/users-store';
import { getAllStoredAppointments } from '@/lib/appointments-store';
import ClientesClientView, { ClientData } from './ClientesClientView';

export default async function ClientesPage() {
  const clientsMap = new Map<string, ClientData>();
  let dbOk = false;
  let dbClients: any[] = [];
  let dbAppointments: any[] = [];

  try {
    const [clientsRes, aptsRes] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: 'CLIENT',
          NOT: {
            email: { contains: 'almir', mode: 'insensitive' },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.appointment.findMany({
        select: {
          id: true,
          date: true,
          createdAt: true,
          service: { select: { name: true } },
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    dbClients = clientsRes || [];
    dbAppointments = aptsRes || [];
    dbOk = true;
  } catch (_) {}

  if (dbOk) {
    dbClients.forEach((dbU) => {
      if (dbU.id?.includes('almir') || dbU.name?.toLowerCase().includes('almir')) return;
      const key = dbU.email?.toLowerCase().trim() || dbU.phone?.replace(/\D/g, "") || dbU.id;
      if (key && !clientsMap.has(key)) {
        clientsMap.set(key, {
          id: dbU.id,
          name: dbU.name || 'Cliente VIP',
          email: dbU.email,
          phone: dbU.phone,
          createdAt: dbU.createdAt ? dbU.createdAt.toISOString() : new Date().toISOString(),
          totalAppointments: 0,
        });
      }
    });
  } else {
    const storedUsers = getAllStoredUsers().filter(
      (u) => u.role === 'CLIENT' && !u.id.includes('almir') && !u.name.toLowerCase().includes('almir')
    );

    storedUsers.forEach((u) => {
      const key = u.email?.toLowerCase().trim() || u.phone?.replace(/\D/g, "") || u.id;
      if (key) {
        clientsMap.set(key, {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          createdAt: u.createdAt,
          totalAppointments: 0,
        });
      }
    });
  }

  const effectiveAppointments = (dbOk ? dbAppointments : getAllStoredAppointments()).filter(
    (a) => !a.id?.includes('almir') && !a.user?.name?.toLowerCase().includes('almir')
  );

  effectiveAppointments.forEach((apt) => {
    if (!apt.user) return;
    const cleanPhone = apt.user.phone ? apt.user.phone.replace(/\D/g, "") : "";
    const email = apt.user.email ? apt.user.email.toLowerCase().trim() : "";
    const key = email || cleanPhone || apt.user.id || apt.user.name;

    if (!key) return;

    let client = clientsMap.get(key);
    if (!client && cleanPhone) {
      // Tenta achar por telefone em outro formato
      for (const [k, c] of clientsMap.entries()) {
        if (c.phone && c.phone.replace(/\D/g, "") === cleanPhone) {
          client = c;
          break;
        }
      }
    }

    if (!client) {
      const aptDateStr = apt.date ? (apt.date instanceof Date ? apt.date.toISOString() : String(apt.date)) : new Date().toISOString();
      client = {
        id: apt.user.id || `c-${Date.now()}`,
        name: apt.user.name || 'Cliente VIP',
        email: apt.user.email || null,
        phone: apt.user.phone || null,
        createdAt: apt.createdAt ? (apt.createdAt instanceof Date ? apt.createdAt.toISOString() : String(apt.createdAt)) : aptDateStr,
        totalAppointments: 0,
      };
      clientsMap.set(key, client);
    }

    client.totalAppointments += 1;

    // Atualiza para a data do último serviço mais recente
    const rawAptDate = apt.date ? (apt.date instanceof Date ? apt.date.toISOString() : String(apt.date)) : null;
    if (rawAptDate) {
      const currentLatestTime = client.lastAppointmentDate ? new Date(client.lastAppointmentDate).getTime() : 0;
      const aptTime = new Date(rawAptDate).getTime();
      if (!client.lastAppointmentDate || aptTime >= currentLatestTime) {
        client.lastAppointmentDate = rawAptDate;
        if (apt.service?.name) {
          client.lastServiceName = apt.service.name;
        }
      }
    } else if (!client.lastServiceName && apt.service?.name) {
      client.lastServiceName = apt.service.name;
    }
  });

  const finalClients: ClientData[] = Array.from(clientsMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="max-w-7xl mx-auto py-2">
      <ClientesClientView initialClients={finalClients} />
    </div>
  );
}
