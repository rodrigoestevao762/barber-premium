import crypto from "crypto";
import prisma from "@/lib/prisma";

export interface AppointmentAddonItem {
  id: string;
  appointmentId: string;
  serviceId: string;
  serviceName: string;
  price: number;
  duration: number;
  createdAt: string;
}

declare global {
  var __las_appointment_addons: AppointmentAddonItem[] | undefined;
  var __las_addon_table_ready: boolean | undefined;
}

function getMemoryAddons(): AppointmentAddonItem[] {
  if (!global.__las_appointment_addons) {
    global.__las_appointment_addons = [];
  }
  return global.__las_appointment_addons;
}

export async function ensureAddonTable(): Promise<void> {
  if (global.__las_addon_table_ready) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public."AppointmentAddon" (
        "id" TEXT NOT NULL,
        "appointmentId" TEXT NOT NULL,
        "serviceId" TEXT NOT NULL,
        "serviceName" TEXT NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "duration" INTEGER NOT NULL DEFAULT 15,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AppointmentAddon_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AppointmentAddon_appointmentId_idx"
      ON public."AppointmentAddon" ("appointmentId");
    `);
    global.__las_addon_table_ready = true;
  } catch (err) {
    console.warn("Aviso ao garantir tabela AppointmentAddon:", err);
  }
}

export async function getAddonsByAppointmentIds(
  appointmentIds: string[]
): Promise<Map<string, AppointmentAddonItem[]>> {
  const result = new Map<string, AppointmentAddonItem[]>();
  const uniqueIds = Array.from(new Set(appointmentIds.filter(Boolean)));
  if (uniqueIds.length === 0) return result;

  const seenIds = new Set<string>();
  const addToBucket = (item: AppointmentAddonItem) => {
    if (seenIds.has(item.id)) return;
    seenIds.add(item.id);
    const list = result.get(item.appointmentId) || [];
    list.push(item);
    result.set(item.appointmentId, list);
  };

  try {
    await ensureAddonTable();
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        appointmentId: string;
        serviceId: string;
        serviceName: string;
        price: number;
        duration: number;
        createdAt: Date | string;
      }>
    >(
      `SELECT "id", "appointmentId", "serviceId", "serviceName", "price", "duration", "createdAt"
       FROM public."AppointmentAddon"
       WHERE "appointmentId" = ANY($1::text[])
       ORDER BY "createdAt" ASC`,
      uniqueIds
    );

    for (const row of rows || []) {
      addToBucket({
        id: row.id,
        appointmentId: row.appointmentId,
        serviceId: row.serviceId,
        serviceName: row.serviceName,
        price: Number(row.price || 0),
        duration: Number(row.duration || 15),
        createdAt:
          row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : String(row.createdAt),
      });
    }
  } catch (err) {
    console.warn("Aviso ao consultar AppointmentAddon no Postgres:", err);
  }

  for (const mem of getMemoryAddons()) {
    if (uniqueIds.includes(mem.appointmentId)) {
      addToBucket(mem);
    }
  }

  return result;
}

export async function addAppointmentAddon(input: {
  appointmentId: string;
  serviceId: string;
  serviceName: string;
  price: number;
  duration: number;
}): Promise<AppointmentAddonItem> {
  const newItem: AppointmentAddonItem = {
    id: `addon-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    appointmentId: input.appointmentId,
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    price: Number(input.price),
    duration: Number(input.duration || 15),
    createdAt: new Date().toISOString(),
  };

  try {
    await ensureAddonTable();
    await prisma.$executeRawUnsafe(
      `INSERT INTO public."AppointmentAddon"
       ("id", "appointmentId", "serviceId", "serviceName", "price", "duration", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      newItem.id,
      newItem.appointmentId,
      newItem.serviceId,
      newItem.serviceName,
      newItem.price,
      newItem.duration,
      new Date(newItem.createdAt)
    );
  } catch (err) {
    console.warn("Aviso ao inserir AppointmentAddon no Postgres, gravando em memória:", err);
    getMemoryAddons().push(newItem);
  }

  return newItem;
}

export async function removeAppointmentAddon(addonId: string): Promise<boolean> {
  let removed = false;

  try {
    await ensureAddonTable();
    const affected = await prisma.$executeRawUnsafe(
      `DELETE FROM public."AppointmentAddon" WHERE "id" = $1`,
      addonId
    );
    if (affected > 0) removed = true;
  } catch (err) {
    console.warn("Aviso ao remover AppointmentAddon no Postgres:", err);
  }

  const mem = getMemoryAddons();
  const idx = mem.findIndex((a) => a.id === addonId);
  if (idx !== -1) {
    mem.splice(idx, 1);
    removed = true;
  }

  return removed;
}

export function getAppointmentTotalPrice(apt: any): number {
  if (typeof apt?.totalPrice === "number") return apt.totalPrice;
  const basePrice = Number(apt?.service?.price || 0);
  const extraPrice = Array.isArray(apt?.addons)
    ? apt.addons.reduce((acc: number, a: any) => acc + Number(a?.price || 0), 0)
    : 0;
  return basePrice + extraPrice;
}

export async function enrichAppointmentsWithAddons<T extends { id: string; service?: any }>(
  appointments: T[]
): Promise<(T & { addons: AppointmentAddonItem[]; basePrice: number; extraPrice: number; totalPrice: number })[]> {
  if (!appointments || appointments.length === 0) return [];
  const addonsMap = await getAddonsByAppointmentIds(appointments.map((a) => a.id));

  return appointments.map((apt) => {
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
}
