import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BARBERS, getBarberById } from '@/lib/barbers';
import { 
  getAppointmentsForDate, 
  getAllStoredAppointments, 
  updateStoredAppointmentStatus, 
  updateStoredAppointment,
  getStoredAppointmentById,
  getLocalDateString 
} from '@/lib/appointments-store';
import { parseBrazilDateTime } from '@/lib/timezone';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Acesso não autorizado. Faça login para continuar." }, { status: 401 });
    }

    const userRole = (session.user as any)?.role || "CLIENT";
    const userBarberId = (session.user as any)?.barberId;
    const userId = (session.user as any)?.id;

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || getLocalDateString();

    // 1. FLUXO DO CLIENTE
    if (userRole === "CLIENT") {
      const userEmail = session?.user?.email?.trim().toLowerCase();
      const userPhone = (session?.user as any)?.phone?.replace(/\D/g, "");

      try {
        const clientUser: any = await prisma.user.findFirst({
          where: {
            OR: [
              ...(userId ? [{ id: userId }] : []),
              ...(userEmail ? [{ email: { equals: userEmail, mode: "insensitive" as const } }] : []),
              ...(userPhone ? [
                { phone: userPhone },
                { phone: userPhone.startsWith("55") ? userPhone.slice(2) : `55${userPhone}` },
              ] : []),
            ],
          },
          include: {
            appointments: {
              include: { service: true, barber: true },
              orderBy: { date: "desc" },
            },
          },
        });

        const dbApts: any[] = clientUser?.appointments || [];

        const memApts: any[] = getAllStoredAppointments().filter(
          (a: any) =>
            (clientUser && a.user?.id === clientUser.id) ||
            (userId && a.user?.id === userId) ||
            (userEmail && a.user?.email?.toLowerCase() === userEmail) ||
            (userPhone && a.user?.phone?.replace(/\D/g, "").includes(userPhone)) ||
            (userPhone && a.user?.phone && userPhone.includes(a.user.phone.replace(/\D/g, "")))
        );

        const map = new Map<string, any>();
        dbApts.forEach((a: any) => map.set(a.id, a));
        memApts.forEach((a: any) => {
          if (!map.has(a.id)) map.set(a.id, a);
        });

        const appointments = Array.from(map.values())
          .filter((a) => !a.id?.includes("almir") && !a.user?.name?.toLowerCase().includes("almir"))
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const effectiveClient = {
          id: clientUser?.id || userId || "client-id",
          name: clientUser?.name || session?.user?.name || "Cliente VIP",
          email: clientUser?.email || session?.user?.email || "",
          phone: clientUser?.phone || (session?.user as any)?.phone || "",
        };

        return NextResponse.json({
          isClient: true,
          client: effectiveClient,
          appointments,
        });
      } catch (dbErr) {
        const allApts = getAllStoredAppointments();
        const clientApts = allApts.filter(
          (a) =>
            (userId && a.user?.id === userId) ||
            (userEmail && a.user?.email?.toLowerCase() === userEmail) ||
            (userPhone && a.user?.phone?.replace(/\D/g, "").includes(userPhone)) ||
            (userPhone && a.user?.phone && userPhone.includes(a.user.phone.replace(/\D/g, "")))
        ).filter((a) => !a.id?.includes("almir") && !a.user?.name?.toLowerCase().includes("almir"));

        return NextResponse.json({
          isClient: true,
          client: {
            id: userId || "client-fallback",
            name: session?.user?.name || "Cliente VIP",
            email: session?.user?.email || "",
            phone: (session?.user as any)?.phone || "",
          },
          appointments: clientApts,
        });
      }
    }

    // 2. FLUXO DO DONO / ADMINISTRADOR (LUCAS AUGUSTO TRABALHA SOZINHO - 100% STUDIO)
    const startOfDay = new Date(`${dateParam}T00:00:00-03:00`);
    const endOfDay = new Date(`${dateParam}T23:59:59-03:00`);
    const queryStart = new Date(`${dateParam}T00:00:00Z`);

    let allDayAppointments: any[] = [];
    let upcomingAppointments: any[] = [];

    try {
      const dbAppointments = await prisma.appointment.findMany({
        where: {
          date: { gte: queryStart, lte: endOfDay },
        },
        include: { service: true, user: true, barber: true },
        orderBy: { date: "asc" },
      });

      const memAppointments = getAppointmentsForDate(dateParam, null);
      
      const map = new Map<string, any>();
      (dbAppointments || []).forEach((a) => map.set(a.id, a));
      (memAppointments || []).forEach((a) => {
        if (!map.has(a.id)) map.set(a.id, a);
      });
      allDayAppointments = Array.from(map.values()).filter(
        (a) => !a.id?.includes("almir") && !a.user?.name?.toLowerCase().includes("almir")
      );

      upcomingAppointments = await prisma.appointment.findMany({
        where: {
          date: { gte: new Date() },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        include: { service: true, user: true, barber: true },
        orderBy: { date: "asc" },
        take: 10,
      });

    } catch (dbErr) {
      allDayAppointments = getAppointmentsForDate(dateParam, null).filter(
        (a) => !a.id?.includes("almir") && !a.user?.name?.toLowerCase().includes("almir")
      );
    }

    // Garante que agendamentos confirmados em memória também alimentem os próximos agendamentos (merge completo)
    const memAll = getAllStoredAppointments();
    const minTimestamp = Date.now() - 30 * 60 * 1000;
    const memUpcoming = memAll
      .filter((a) => 
        (a.status === 'PENDING' || a.status === 'CONFIRMED') && 
        new Date(a.date).getTime() >= minTimestamp &&
        !a.id?.includes('almir') && 
        !a.user?.name?.toLowerCase().includes('almir')
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const upcomingMap = new Map<string, any>();
    (upcomingAppointments || []).forEach((a: any) => upcomingMap.set(a.id, a));
    memUpcoming.forEach((a: any) => {
      if (!upcomingMap.has(a.id)) upcomingMap.set(a.id, a);
    });
    upcomingAppointments = Array.from(upcomingMap.values())
      .filter((a: any) => !a.id?.includes('almir') && !a.user?.name?.toLowerCase().includes('almir'))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 20);

    // Como Lucas Augusto trabalha sozinho, 100% da receita é dele / do Studio
    const soloBarber = BARBERS[0];
    const bApts = allDayAppointments;
    const completedList = bApts.filter((apt) => apt.status === "COMPLETED");
    const totalGrossRevenue = completedList.reduce((acc, apt) => acc + (apt.service?.price || 0), 0);
    const ticketMedio = completedList.length > 0 ? totalGrossRevenue / completedList.length : 0;

    const breakdown = [
      {
        id: soloBarber.id,
        name: soloBarber.name,
        role: soloBarber.role,
        avatar: soloBarber.avatar,
        phone: soloBarber.phone,
        phoneDisplay: soloBarber.phoneDisplay,
        commissionRate: 1.0, // 100% Dono / Barbeiro Solo
        totalApts: bApts.length,
        completedApts: completedList.length,
        revenue: totalGrossRevenue,
        commission: totalGrossRevenue, // 100% receita retida
        houseShare: 0,
      }
    ];

    return NextResponse.json({
      isClient: false,
      userRole,
      currentBarber: soloBarber,
      activeFilter: "all",
      selectedDate: dateParam,
      
      // Faturamento Oficial do Studio (100% retido pelo Dono)
      revenue: totalGrossRevenue,
      totalGrossShop: totalGrossRevenue,
      houseNetProfit: totalGrossRevenue,
      totalEmployeeCommissions: 0, // Sem funcionários / trabalha sozinho
      myCommission: totalGrossRevenue,
      houseShare: 0,
      ticketMedio,
      
      // Contadores
      todayCount: bApts.length,
      completedCount: completedList.length,
      clientsCount: bApts.length,
      appointments: bApts,
      upcomingAppointments,
      barberBreakdown: breakdown,
      barbersList: [soloBarber],
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar dados do dashboard" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, date, time, serviceId, action } = body;

    if (!id) {
      return NextResponse.json({ error: "ID do agendamento é obrigatório" }, { status: 400 });
    }

    if (action === "APPROVE_RESCHEDULE") {
      let currentApt: any = null;
      try {
        currentApt = await prisma.appointment.findUnique({ where: { id } });
      } catch (_) {
        currentApt = getStoredAppointmentById(id);
      }

      if (!currentApt || !currentApt.requestedDate) {
        return NextResponse.json({ error: "Nenhuma solicitação de reagendamento encontrada." }, { status: 400 });
      }

      const newDate = new Date(currentApt.requestedDate);

      try {
        const updated = await prisma.appointment.update({
          where: { id },
          data: {
            date: newDate,
            status: "CONFIRMED",
          } as any,
        });
        updateStoredAppointment(id, { status: "CONFIRMED", date: newDate.toISOString(), requestedDate: undefined });
        return NextResponse.json({ success: true, appointment: updated });
      } catch (dbErr) {
        updateStoredAppointment(id, { status: "CONFIRMED", date: newDate.toISOString(), requestedDate: undefined });
        return NextResponse.json({ success: true, message: "Reagendamento aprovado em contingência." });
      }
    }

    if (action === "REJECT_RESCHEDULE") {
      try {
        const updated = await prisma.appointment.update({
          where: { id },
          data: {
            status: "CONFIRMED",
          } as any,
        });
        updateStoredAppointment(id, { status: "CONFIRMED", requestedDate: undefined });
        return NextResponse.json({ success: true, appointment: updated });
      } catch (dbErr) {
        updateStoredAppointment(id, { status: "CONFIRMED", requestedDate: undefined });
        return NextResponse.json({ success: true, message: "Reagendamento recusado." });
      }
    }

    if (date && time) {
      const parsedNewDate = parseBrazilDateTime(date, time);
      try {
        const updated = await prisma.appointment.update({
          where: { id },
          data: {
            date: parsedNewDate,
            ...(serviceId ? { serviceId } : {}),
            status: status || "CONFIRMED",
          } as any,
        });
        updateStoredAppointment(id, {
          date: parsedNewDate.toISOString(),
          status: status || "CONFIRMED",
        });
        return NextResponse.json({ success: true, appointment: updated });
      } catch (dbErr) {
        updateStoredAppointment(id, {
          date: parsedNewDate.toISOString(),
          status: status || "CONFIRMED",
        });
        return NextResponse.json({ success: true, message: "Agendamento alterado com sucesso." });
      }
    }

    if (status) {
      try {
        const updated = await prisma.appointment.update({
          where: { id },
          data: { status },
        });
        updateStoredAppointmentStatus(id, status);
        return NextResponse.json({ success: true, appointment: updated });
      } catch (dbErr) {
        updateStoredAppointmentStatus(id, status);
        return NextResponse.json({ success: true, message: "Status atualizado." });
      }
    }

    return NextResponse.json({ error: "Ação não informada" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar agendamento" }, { status: 500 });
  }
}
