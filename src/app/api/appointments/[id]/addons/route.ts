import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getServiceById } from "@/lib/services";
import {
  addAppointmentAddon,
  getAddonsByAppointmentIds,
  removeAppointmentAddon,
} from "@/lib/appointment-addons";

export const dynamic = "force-dynamic";

async function requireStaffSession() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  if (!session || (userRole !== "ADMIN" && userRole !== "BARBER")) {
    return null;
  }
  return session;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireStaffSession())) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    const { id } = await params;
    const map = await getAddonsByAppointmentIds([id]);
    return NextResponse.json(map.get(id) || []);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar serviços extras." }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireStaffSession())) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { serviceId, customName, customPrice } = body || {};

    let resolvedId = String(serviceId || "");
    let resolvedName = "";
    let resolvedPrice = 0;
    let resolvedDuration = 15;

    const catalogService = getServiceById(resolvedId);
    if (catalogService) {
      resolvedId = catalogService.id;
      resolvedName = catalogService.name;
      resolvedPrice = catalogService.price;
      resolvedDuration = catalogService.duration;
    } else if (customName && Number(customPrice) > 0) {
      resolvedId = `custom-${Date.now()}`;
      resolvedName = String(customName).trim().slice(0, 100);
      resolvedPrice = Number(customPrice);
    } else {
      return NextResponse.json(
        { error: "Selecione um serviço extra válido." },
        { status: 400 }
      );
    }

    const addon = await addAppointmentAddon({
      appointmentId: id,
      serviceId: resolvedId,
      serviceName: resolvedName,
      price: resolvedPrice,
      duration: resolvedDuration,
    });

    return NextResponse.json({ success: true, addon });
  } catch (error) {
    console.error("Erro ao adicionar serviço extra:", error);
    return NextResponse.json(
      { error: "Erro ao adicionar serviço extra." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await requireStaffSession())) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const addonId = searchParams.get("addonId") || "";
    if (!addonId) {
      return NextResponse.json({ error: "addonId é obrigatório." }, { status: 400 });
    }

    const deleted = await removeAppointmentAddon(addonId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Serviço extra não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao remover serviço extra:", error);
    return NextResponse.json(
      { error: "Erro ao remover serviço extra." },
      { status: 500 }
    );
  }
}
