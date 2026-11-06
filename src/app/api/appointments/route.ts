import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { BARBERS, getBarberById } from '@/lib/barbers';
import { OFFICIAL_SERVICES } from '@/lib/services';
import { addStoredAppointment, getAllStoredAppointments } from '@/lib/appointments-store';
import { upsertStoredUser } from '@/lib/users-store';
import { getBrazilNow, getBrazilDateAndTimeString, parseBrazilDateTime } from '@/lib/timezone';
import { checkDayStatus } from '@/lib/holidays';
import { isBarberAvailable } from '@/lib/barber-availability';

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
    const matchedService = OFFICIAL_SERVICES.find(
      (s) => s.id === serviceId || s.name.toLowerCase() === String(serviceId).toLowerCase()
    ) || OFFICIAL_SERVICES[0];

    // Validação estrita contra agendamentos no passado (fuso horário do Brasil)
    const appointmentDate = parseBrazilDateTime(date);

    if (!isWalkIn) {
      // 2.1 Validação de Domingo e Feriados (Cacoal - RO + Nacionais)
      const dayCheck = checkDayStatus(date);
      if (dayCheck.isClosed) {
        return NextResponse.json({ error: dayCheck.reason }, { status: 400 });
      }

      // 2.2 Validação de Escala Flexível do Barbeiro
      if (!isBarberAvailable(assignedBarber.id)) {
        return NextResponse.json(
          { error: "Este profissional não está disponível para agendamentos hoje (escala flexível)." },
          { status: 400 }
        );
      }

      const brazilNow = getBrazilNow();
      const requestedBrazil = getBrazilDateAndTimeString(appointmentDate);

      const isPast =
        requestedBrazil.date < brazilNow.date ||
        (requestedBrazil.date === brazilNow.date && requestedBrazil.time <= brazilNow.time);

      if (isPast) {
        return NextResponse.json(
          { error: "Não é possível agendar um horário que já passou. Por favor, escolha um horário futuro." },
          { status: 400 }
        );
      }
    }

    const rawPhone = (clientPhone || "").trim();
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const formattedEmail = clientEmail ? clientEmail.trim().toLowerCase() : null;
    const finalPassword = clientPassword ? clientPassword.trim() : "123";

    // 3. PERSISTÊNCIA GARANTIDA NO STORE RESILIENTE (Conta de Usuário + Agendamento)
    // Garante que o cliente SEMPRE tenha conta criada e possa fazer login imediatamente
    const persistentClient = upsertStoredUser({
      name: clientName?.trim() || "Cliente VIP",
      email: formattedEmail,
      phone: cleanPhone || rawPhone,
      password: finalPassword,
      role: "CLIENT",
    });

    const storedAppointment = addStoredAppointment({
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

    // 4. PERSISTÊNCIA ADICIONAL NO BANCO DE DADOS (Quando Postgres estiver acessível)
    let dbSuccess = false;
    let dbClient: any = null;
    let dbAppointment: any = null;

    try {
      // 4.1 Sincroniza Barbeiro
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

      // 4.2 Sincroniza Serviço
      let finalServiceId: string = serviceId;
      try {
        const existingService = await prisma.service.findFirst({
          where: {
            OR: [
              { id: serviceId },
              { name: { equals: matchedService.name, mode: "insensitive" } },
            ],
          },
        });

        if (existingService) {
          finalServiceId = existingService.id;
        } else {
          const newService = await prisma.service.upsert({
            where: { id: matchedService.id },
            update: {
              name: matchedService.name,
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
        }
      } catch (_) {}

      // 4.3 Cria/Atualiza Usuário no Banco
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
            name: persistentClient.name,
            email: formattedEmail || existingDbClient.email,
            phone: cleanPhone || existingDbClient.phone,
            password: hashedPassword,
          },
        });
      } else {
        dbClient = await prisma.user.create({
          data: {
            id: persistentClient.id,
            name: persistentClient.name,
            phone: cleanPhone || null,
            email: formattedEmail || null,
            password: hashedPassword,
            role: "CLIENT",
          },
        });
      }

      // 4.4 Cria Agendamento no Banco
      dbAppointment = await prisma.appointment.create({
        data: {
          id: storedAppointment.id,
          date: appointmentDate,
          serviceId: finalServiceId,
          userId: dbClient.id,
          barberId: assignedBarber.id,
          status: appointmentStatus,
        },
      });

      dbSuccess = true;
    } catch (dbErr) {
      // Postgres indisponível — o fluxo segue protegido pelo store resiliente
      console.warn("Aviso: Banco relacional em contingência, dados persistidos no storage blindado.");
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
        id: persistentClient.id,
        name: persistentClient.name,
        email: persistentClient.email,
        phone: persistentClient.phone,
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
    try {
      dbApts = await prisma.appointment.findMany({
        take: limit,
        orderBy: { date: "desc" },
        include: { service: true, user: true, barber: true },
      });
    } catch (_) {}

    const memApts = getAllStoredAppointments();
    const map = new Map<string, any>();
    memApts.forEach((a) => map.set(a.id, a));
    (dbApts || []).forEach((a) => map.set(a.id, a));

    const finalApts = Array.from(map.values())
      .filter((a) => !a.id?.includes("almir") && !a.user?.name?.toLowerCase().includes("almir"))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    return NextResponse.json(finalApts);
  } catch (error) {
    console.error("Erro ao listar agendamentos:", error);
    return NextResponse.json({ error: "Erro ao buscar agendamentos" }, { status: 500 });
  }
}
