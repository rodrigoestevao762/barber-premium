"use server"

import prisma from "@/lib/prisma";
import { BARBERS } from "@/lib/barbers";
import { 
  getAppointmentsForDate, 
  getStoredClosingsForDate, 
  addStoredClosing,
  getLocalDateString 
} from "@/lib/appointments-store";

export async function getFechamentoData(dateStr?: string) {
  try {
    const targetDateStr = dateStr || getLocalDateString();
    const start = new Date(`${targetDateStr}T00:00:00-03:00`);
    const end = new Date(`${targetDateStr}T23:59:59.999-03:00`);

    let appointments: any[] = [];
    let closings: any[] = [];

    try {
      appointments = await prisma.appointment.findMany({
        where: {
          date: {
            gte: start,
            lte: end,
          },
          status: "COMPLETED",
        },
        include: {
          service: true,
          barber: true,
        }
      });

      closings = await prisma.cashClosing.findMany({
        where: {
          date: {
            gte: start,
            lte: end,
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (dbErr) {
      const storedApts = getAppointmentsForDate(targetDateStr, null);
      appointments = storedApts.filter(a => a.status === "COMPLETED" || a.status === "CONFIRMED");
      closings = getStoredClosingsForDate(targetDateStr);
    }

    let totalRevenue = 0;
    const masterBarber = BARBERS[0] || { id: "barbeiro-lucas", name: "Lucas Augusto" };
    
    // LAS Barber Studio possui modelo 100% exclusivo com o proprietário Lucas Augusto
    const barberRevenue = {
      id: masterBarber.id,
      name: masterBarber.name,
      total: 0,
      commission: 0,
      rate: 1.0,
      isOwner: true,
    };

    appointments.forEach(app => {
      const price = app.service?.price || 0;
      totalRevenue += price;
      barberRevenue.total += price;
      barberRevenue.commission += price;
    });

    const sanitizedClosings = closings.map((c: any) => ({
      ...c,
      closedBy: (!c.closedBy || c.closedBy.includes("Bastos") || c.closedBy.includes("Mr."))
        ? "Lucas Augusto (Master Barber)"
        : c.closedBy,
    }));

    return {
      success: true as const,
      data: {
        totalRevenue,
        barberRevenues: [barberRevenue],
        closings: sanitizedClosings
      }
    };
  } catch (error: unknown) {
    console.error("Action error:", error);
    const targetDateStr = dateStr || getLocalDateString();
    const storedApts = getAppointmentsForDate(targetDateStr, null);
    const completedApts = storedApts.filter(a => a.status === "COMPLETED" || a.status === "CONFIRMED");
    const rawClosings = getStoredClosingsForDate(targetDateStr);

    let totalRevenue = 0;
    const masterBarber = BARBERS[0] || { id: "barbeiro-lucas", name: "Lucas Augusto" };
    const barberRevenue = {
      id: masterBarber.id,
      name: masterBarber.name,
      total: 0,
      commission: 0,
      rate: 1.0,
      isOwner: true,
    };

    completedApts.forEach(app => {
      const price = app.service?.price || 0;
      totalRevenue += price;
      barberRevenue.total += price;
      barberRevenue.commission += price;
    });

    const sanitizedClosings = rawClosings.map((c: any) => ({
      ...c,
      closedBy: (!c.closedBy || c.closedBy.includes("Bastos") || c.closedBy.includes("Mr."))
        ? "Lucas Augusto (Master Barber)"
        : c.closedBy,
    }));

    return {
      success: true as const,
      data: {
        totalRevenue,
        barberRevenues: [barberRevenue],
        closings: sanitizedClosings
      }
    };
  }
}

export async function closeCashRegister(data: { totalRevenue: number, barberRevenues: string, closedBy: string, dateStr: string }) {
  try {
    const parsedRevenues = JSON.parse(data.barberRevenues);
    const totalCommissions = parsedRevenues.reduce((acc: number, b: any) => acc + b.commission, 0);

    const closingDate = new Date(`${data.dateStr}T23:59:59-03:00`);

    try {
      const closing = await prisma.cashClosing.create({
        data: {
          date: closingDate,
          totalRevenue: data.totalRevenue,
          totalExpenses: 0,
          barberRevenues: data.barberRevenues,
          closedBy: data.closedBy,
        }
      });
      return { success: true, data: closing };
    } catch (dbErr) {
      const storedClosing = addStoredClosing({
        id: `closing-${Date.now()}`,
        date: data.dateStr,
        totalRevenue: data.totalRevenue,
        totalExpenses: 0,
        barberRevenues: data.barberRevenues,
        closedBy: data.closedBy,
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        data: storedClosing
      };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}
