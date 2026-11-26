import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { BARBERS, getBarberById } from '@/lib/barbers';
import { OFFICIAL_SERVICES } from '@/lib/services';
import { getServiceById } from '@/lib/services';
import { addStoredAppointment, getAllStoredAppointments, getAppointmentsForDate } from '@/lib/appointments-store';
import { enrichAppointmentsWithAddons } from '@/lib/appointment-addons';
import { upsertStoredUser } from '@/lib/users-store';
import { getBrazilNow, getBrazilDateAndTimeString, parseBrazilDateTime, formatAptTimeToHHMM } from '@/lib/timezone';
import { checkDayStatusDB, getDayScheduleDB } from '@/lib/studio-schedule';
import { isBarberAvailable } from '@/lib/barber-availability';
import { sendAppointmentConfirmationEmail, sendNewBookingNotificationToBarber } from '@/lib/resend';
import { getBaseSlotsForDate, doesBookingOccupySlot } from '@/lib/studio-slots';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { 
      serviceId, 
      barberId, 
      date, 
      isWalkIn, 
      clientName, 
      clientEmail, 
      clientPhone, 
      clientPassword, 
      status: reqStatus, 
      paymentMethod 
    } = body;

    const appointmentStatus = reqStatus || (isWalkIn ? "COMPLETED" : "PENDING");

    // 1. Identifica e valida o Barbeiro Oficial
    let assignedBarber = getBarberById(barberId);
    if (!assignedBarber) {
      assignedBarber = BARBERS[0];
      barberId = assignedBarber.id;
    }

    // 2. Identifica o serviço oficial correspondente
    const matchedService = getServiceById(serviceId) || OFFICIAL_SERVICES[0];

    // Validação estrita contra agendamentos no passado, horários fechados ou já ocupados (online e balcão)
    const appointmentDate = parseBrazilDateTime(date);
    const requestedBrazil = getBrazilDateAndTimeString(appointmentDate);

    // 2.1 Validação de Domingo e Studio Fechado no Banco PostgreSQL
    const dayCheck = await checkDayStatusDB(requestedBrazil.date);
    if (dayCheck.isClosed) {
      return NextResponse.json({ error: dayCheck.reason }, { status: 400 });
    }

    // 2.2 Validação de Escala Flexível, Saída Antecipada e Pausa para Almoço no Banco PostgreSQL
    if (!isBarberAvailable(assignedBarber.id, requestedBrazil.date)) {
      return NextResponse.json(
        { error: "Este profissional não está disponível para agendamentos nesta data." },
        { status: 400 }
      );
    }

    const daySchedule = await getDayScheduleDB(requestedBrazil.date);
    if (daySchedule.earlyClosingTime && requestedBrazil.time > daySchedule.earlyClosingTime) {
      return NextResponse.json(
        { error: `O estúdio encerrará o expediente às ${daySchedule.earlyClosingTime} nesta data.` },
        { status: 400 }
      );
    }

    if (daySchedule.lunchBreakSlots.includes(requestedBrazil.time)) {
      return NextResponse.json(
        { error: `O horário das ${requestedBrazil.time} está reservado para pausa de almoço.` },
        { status: 400 }
      );
    }

    const brazilNow = getBrazilNow();
    const isPast =
      requestedBrazil.date < brazilNow.date ||
      (requestedBrazil.date === brazilNow.date && requestedBrazil.time <= brazilNow.time);

    if (isPast) {
      return NextResponse.json(
        { error: "Não é possível selecionar um horário que já passou. Escolha um horário futuro disponível." },
        { status: 400 }
      );
    }

    // 2.3 Garante que o horário não tenha sido ocupado por outro cliente ou Cliente Balcão
    const daySlots = getBaseSlotsForDate(requestedBrazil.date);
    const startOfDay = new Date(`${requestedBrazil.date}T00:00:00-03:00`);
    const endOfDay = new Date(`${requestedBrazil.date}T23:59:59-03:00`);
    const existingTimes: string[] = [];
    let dbCheckOk = false;

    try {
      const dbExisting = await prisma.appointment.findMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          status: { notIn: ["CANCELLED"] },
        },
        select: { id: true, date: true, user: { select: { name: true } } },
      });
      dbExisting
        .filter((a) => !a.id?.includes("almir") && !a.user?.name?.toLowerCase().includes("almir"))
        .forEach((a) => existingTimes.push(formatAptTimeToHHMM(a.date)));
      dbCheckOk = true;
    } catch (_) {}

    if (!dbCheckOk) {
      getAppointmentsForDate(requestedBrazil.date, null)
        .filter((a) => a.status !== "CANCELLED")
        .forEach((a) => existingTimes.push(formatAptTimeToHHMM(a.date)));
    }

    const isConflict = existingTimes.some(
      (bt) =>
        doesBookingOccupySlot(bt, requestedBrazil.time, daySlots) ||
        doesBookingOccupySlot(requestedBrazil.time, bt, daySlots)
    );

    if (isConflict) {
      return NextResponse.json(
        { error: "Este horário já foi ocupado na agenda. Por favor, escolha outro horário disponível." },
        { status: 409 }
      );
    }

    const rawPhone = (clientPhone || "").trim();
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const formattedEmail = clientEmail ? clientEmail.trim().toLowerCase() : null;
    const finalPassword = clientPassword?.trim() || Math.random().toString(36).slice(-8);
    const resolvedName = clientName?.trim() || "Cliente VIP";
    const newAppointmentId = `apt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 3. PERSISTÊNCIA PRIMÁRIA NO BANCO POSTGRESQL (evita sujeira em /tmp quando DB está online)
    let dbSuccess = false;
    let dbClient: any = null;
    let dbAppointment: any = null;
    let persistentClient: any = null;
    let storedAppointment: any = null;

    try {
      // 3.1 Sincroniza Barbeiro
      try {
        await prisma.barber.upsert({
          where: { id: assignedBarber.id },
          update: { 
            name: assignedBarber.name,
            commissionRate: assignedBarber.commissionRate,
          },
          create: {
            id: assignedBarber.id,
            name: assignedBarber.name,
            commissionRate: assignedBarber.commissionRate,
          },
        });
      } catch (_) {}

      // 3.2 Sincroniza Serviço (sempre garante nome/preço/duração oficiais)
      let finalServiceId: string = matchedService.id;
      try {
        const newService = await prisma.service.upsert({
          where: { id: matchedService.id },
          update: {
            name: matchedService.name,
            description: matchedService.description,
            price: matchedService.price,
            duration: matchedService.duration,
          },
          create: {
            id: matchedService.id,
            name: matchedService.name,
            description: matchedService.description,
            price: matchedService.price,
            duration: matchedService.duration,
          },
        });
        finalServiceId = newService.id;
      } catch (_) {}

      // 3.3 Cria/Atualiza Usuário no Banco
      const hashedPassword = await bcrypt.hash(finalPassword, 10);
      const existingDbClient = await prisma.user.findFirst({
        where: {
          OR: [
            ...(formattedEmail ? [{ email: formattedEmail }] : []),
            ...(cleanPhone ? [{ phone: cleanPhone }] : []),
          ],
        },
      });

      if (existingDbClient) {
        dbClient = await prisma.user.update({
          where: { id: existingDbClient.id },
          data: {
            name: resolvedName,
            email: formattedEmail || existingDbClient.email,
            phone: cleanPhone || existingDbClient.phone,
            password: hashedPassword,
          },
        });
      } else {
        dbClient = await prisma.user.create({
          data: {
            id: `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: resolvedName,
            phone: cleanPhone || null,
            email: formattedEmail || null,
            password: hashedPassword,
            role: "CLIENT",
          },
        });
      }

      // 3.4 Cria Agendamento no Banco
      dbAppointment = await prisma.appointment.create({
        data: {
          id: newAppointmentId,
          date: appointmentDate,
          serviceId: finalServiceId,
          userId: dbClient.id,
          barberId: assignedBarber.id,
          status: appointmentStatus,
        },
      });

      dbSuccess = true;
    } catch (dbErr) {
      // Postgres indisponível — apenas em contingência persiste no storage local
      console.warn("Aviso: Banco relacional em contingência, dados persistidos no storage blindado.");
      persistentClient = upsertStoredUser({
        name: resolvedName,
        email: formattedEmail,
        phone: cleanPhone || rawPhone,
        password: finalPassword,
        role: "CLIENT",
      });

      storedAppointment = addStoredAppointment({
        id: newAppointmentId,
        date: appointmentDate.toISOString(),
        barberId: assignedBarber.id,
        service: {
          id: matchedService.id,
          name: matchedService.name,
          price: matchedService.price,
          duration: matchedService.duration,
        },
        user: {
          id: persistentClient.id,
          name: persistentClient.name,
          phone: persistentClient.phone || rawPhone || "(69) 99999-9999",
          email: persistentClient.email || formattedEmail || undefined,
        },
        status: appointmentStatus,
        paymentMethod: paymentMethod || "PIX",
        durationSpent: appointmentStatus === "COMPLETED" ? matchedService.duration : undefined,
      });
    }

    const effectiveClient = dbClient || persistentClient || {
      id: `u-${Date.now()}`,
      name: resolvedName,
      email: formattedEmail,
      phone: cleanPhone || rawPhone,
    };

    // 4. DISPARO DE NOTIFICAÇÕES POR E-MAIL RESEND (CLIENTE VIP + BARBEIRO)
    try {
      const requestedBrazilEmail = getBrazilDateAndTimeString(appointmentDate);
      const [year, month, day] = requestedBrazilEmail.date.split("-");
      const displayDate = `${day}/${month}/${year}`;
      const displayTime = requestedBrazilEmail.time;

      // 4.1 Envia confirmação com credenciais de acesso VIP para o cliente
      if (formattedEmail) {
        sendAppointmentConfirmationEmail({
          to: formattedEmail,
          clientName: effectiveClient.name,
          barberName: assignedBarber.name,
          serviceName: matchedService.name,
          servicePrice: matchedService.price,
          serviceDuration: matchedService.duration,
          appointmentDate: displayDate,
          appointmentTime: displayTime,
          paymentMethod: paymentMethod || "PIX",
          clientEmail: formattedEmail,
          clientPassword: clientPassword || undefined,
        }).catch((err) => console.error("Erro assíncrono envio e-mail cliente:", err));
      }

      // 4.2 Envia alerta imediato de novo agendamento para o Barbeiro Mestre Lucas
      const barberEmail = assignedBarber.email || "lucastj609@gmail.com";
      sendNewBookingNotificationToBarber({
        barberEmail,
        barberName: assignedBarber.name,
        clientName: effectiveClient.name,
        clientPhone: effectiveClient.phone || rawPhone,
        clientEmail: formattedEmail || undefined,
        serviceName: matchedService.name,
        servicePrice: matchedService.price,
        appointmentDate: displayDate,
        appointmentTime: displayTime,
        paymentMethod: paymentMethod || "PIX",
      }).catch((err) => console.error("Erro assíncrono envio e-mail barbeiro:", err));
    } catch (emailErr) {
      console.error("Aviso: Falha não-bloqueante no envio de notificações:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Agendamento e conta de cliente VIP criados com sucesso!",
      appointment: {
        ...(dbAppointment || storedAppointment),
        barber: assignedBarber,
        service: matchedService,
      },
      barber: assignedBarber,
      client: {
        id: effectiveClient.id,
        name: effectiveClient.name,
        email: effectiveClient.email,
        phone: effectiveClient.phone,
      },
      dbPersisted: dbSuccess,
    });

  } catch (error: any) {
    console.error("ERRO GERAL AO AGENDAR:", error);
    return NextResponse.json({ error: error.message || "Erro ao processar agendamento" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    let dbApts: any[] = [];
    let dbOk = false;
    try {
      dbApts = await prisma.appointment.findMany({
        take: limit,
        orderBy: { date: "desc" },
        include: { service: true, user: true, barber: true },
      });
      dbOk = true;
    } catch (_) {}

    const rawApts = dbOk ? dbApts : getAllStoredAppointments();
    const finalApts = (rawApts || [])
      .filter((a) => !a.id?.includes("almir") && !a.user?.name?.toLowerCase().includes("almir"))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    const enriched = await enrichAppointmentsWithAddons(finalApts);
    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Erro ao listar agendamentos:", error);
    return NextResponse.json({ error: "Erro ao buscar agendamentos" }, { status: 500 });
  }
}
