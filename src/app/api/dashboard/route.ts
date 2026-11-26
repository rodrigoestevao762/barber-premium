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
import { getMonthlyFinancialSummary } from '@/lib/financial-summary';
import { getAddonsByAppointmentIds, enrichAppointmentsWithAddons, getAppointmentTotalPrice } from '@/lib/appointment-addons';

export const dynamic = 'force-dynamic';

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

        const appointments = await enrichAppointmentsWithAddons(
          dbApts
            .filter((a) => !a.id?.includes("almir") && !a.user?.name?.toLowerCase().includes("almir"))
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );

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

    let allDayAppointments: any[] = [];
    let upcomingAppointments: any[] = [];
    let dbOk = false;

    const monthlyPromise = getMonthlyFinancialSummary(dateParam.slice(0, 7), dateParam);

    try {
      const [dbAppointments, dbUpcoming] = await Promise.all([
        prisma.appointment.findMany({
          where: {
            date: { gte: startOfDay, lte: endOfDay },
          },
          include: { service: true, user: true, barber: true },
          orderBy: { date: "asc" },
        }),
        prisma.appointment.findMany({
          where: {
            date: { gte: new Date() },
            status: { in: ["PENDING", "CONFIRMED"] },
          },
          include: { service: true, user: true, barber: true },
          orderBy: { date: "asc" },
          take: 20,
        }),
      ]);

      allDayAppointments = (dbAppointments || []).filter(
        (a) => !a.id?.includes("almir") && !a.user?.name?.toLowerCase().includes("almir")
      );
      upcomingAppointments = (dbUpcoming || []).filter(
        (a) => !a.id?.includes("almir") && !a.user?.name?.toLowerCase().includes("almir")
      );

      dbOk = true;
    } catch (dbErr) {
      allDayAppointments = getAppointmentsForDate(dateParam, null).filter(
        (a) => !a.id?.includes("almir") && !a.user?.name?.toLowerCase().includes("almir")
      );
    }

    if (!dbOk) {
      const memAll = getAllStoredAppointments();
      const minTimestamp = Date.now() - 30 * 60 * 1000;
      upcomingAppointments = memAll
        .filter((a) =>
          (a.status === 'PENDING' || a.status === 'CONFIRMED') &&
          new Date(a.date).getTime() >= minTimestamp &&
          !a.id?.includes('almir') &&
          !a.user?.name?.toLowerCase().includes('almir')
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 20);
    }

    // Como Lucas Augusto trabalha sozinho, 100% da receita é dele / do Studio
    const soloBarber = BARBERS[0];
    const allIds = Array.from(
      new Set([...allDayAppointments, ...upcomingAppointments].map((a) => a.id).filter(Boolean))
    );
    const [addonsMap, monthlySummaryData] = await Promise.all([
      getAddonsByAppointmentIds(allIds),
      monthlyPromise,
    ]);

    const attachAddons = (list: any[]) =>
      list.map((apt) => {
        const addons = addonsMap.get(apt.id) || [];
        const basePrice = Number(apt.service?.price || 0);
        const extraPrice = addons.reduce((acc, a) => acc + Number(a.price || 0), 0);
        return {
          ...apt,
          addons,
          basePrice,
          extraPrice,
          totalPrice: basePrice + extraPrice,
        };
      });

    allDayAppointments = attachAddons(allDayAppointments);
    upcomingAppointments = attachAddons(upcomingAppointments);
    const bApts = allDayAppointments;

    const completedList = bApts.filter((apt) => apt.status === "COMPLETED");
    const totalGrossRevenue = completedList.reduce((acc, apt) => acc + getAppointmentTotalPrice(apt), 0);
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
      monthlySummary: {
        month: monthlySummaryData.month,
        monthLabel: monthlySummaryData.monthLabel,
        grossRevenue: monthlySummaryData.grossRevenue,
        expenses: monthlySummaryData.expenses,
        netProfit: monthlySummaryData.netProfit,
        marginPercent: monthlySummaryData.marginPercent,
        completedCount: monthlySummaryData.completedCount,
        expensesCount: monthlySummaryData.expensesCount,
        ticketMedio: monthlySummaryData.ticketMedio,
      },
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
