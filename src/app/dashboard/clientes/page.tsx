export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import { getAllStoredUsers } from '@/lib/users-store';
import { getAllStoredAppointments } from '@/lib/appointments-store';
import ClientesClientView, { ClientData } from './ClientesClientView';

export default async function ClientesPage() {
  const clientsMap = new Map<string, ClientData>();

  // 1. Carrega todos os agendamentos para mapear histórico
  const allAppointments = getAllStoredAppointments();

  // 2. Carrega usuários registrados no storage resiliente (role: CLIENT)
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

  // 3. Carrega clientes do banco de dados relacional (Postgres / Supabase)
  try {
    const dbClients = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        NOT: {
          email: { contains: 'almir', mode: 'insensitive' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    dbClients.forEach((dbU) => {
      const key = dbU.email?.toLowerCase().trim() || dbU.phone?.replace(/\D/g, "") || dbU.id;
      if (key) {
        const existing = clientsMap.get(key);
        if (!existing) {
          clientsMap.set(key, {
            id: dbU.id,
            name: dbU.name || 'Cliente VIP',
            email: dbU.email,
            phone: dbU.phone,
            createdAt: dbU.createdAt ? dbU.createdAt.toISOString() : new Date().toISOString(),
            totalAppointments: 0,
          });
        }
      }
    });
  } catch (_) {}

  // 4. Integra agendamentos para contabilizar visitas e incluir clientes que agendaram sem conta prévia
  allAppointments.forEach((apt) => {
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
      client = {
        id: apt.user.id || `c-${Date.now()}`,
        name: apt.user.name || 'Cliente VIP',
        email: apt.user.email || null,
        phone: apt.user.phone || null,
        createdAt: apt.createdAt || apt.date || new Date().toISOString(),
        totalAppointments: 0,
      };
      clientsMap.set(key, client);
    }

    client.totalAppointments += 1;
    if (!client.lastServiceName && apt.service?.name) {
      client.lastServiceName = apt.service.name;
      client.lastAppointmentDate = apt.date;
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
