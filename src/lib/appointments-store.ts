import { BARBERS } from "@/lib/barbers";
import { OFFICIAL_SERVICES } from "@/lib/services";
import { getBrazilDateAndTimeString } from "@/lib/timezone";
import fs from "fs";
import path from "path";

export interface StoredAppointment {
  id: string;
  date: string; // ISO string ou com offset -03:00
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "RESCHEDULE_REQUESTED" | "CANCEL_REQUESTED";
  requestedDate?: string;
  barberId: string;
  barber: { id: string; name: string; phone?: string; role?: string };
  service: { id: string; name: string; price: number; duration: number };
  user: { id: string; name: string; phone?: string; email?: string };
  durationSpent?: number;
  paymentMethod?: string;
  createdAt?: string;
}

export interface StoredClosing {
  id: string;
  date: string;
  totalRevenue: number;
  totalExpenses: number;
  barberRevenues: string;
  closedBy: string;
  createdAt: string;
}

export interface StoredExpense {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: "FIXO" | "VALE";
  barberId?: string;
}

// Arquivo de persistência em disco
const DISK_FILE =
  process.env.VERCEL || process.env.NODE_ENV === "production"
    ? path.join("/tmp", "las_appointments.json")
    : path.join(process.cwd(), "src", "data", "appointments.json");

// Helper para obter a data local no formato YYYY-MM-DD (fuso Brasil UTC-3)
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Inicia com lista limpa (somente futuros agendamentos reais feitos pelos clientes)
const INITIAL_APPOINTMENTS: StoredAppointment[] = [];

// Singleton global para persistência em memória entre chamadas de API
declare global {
  var __las_appointments: StoredAppointment[] | undefined;
  var __las_closings: StoredClosing[] | undefined;
  var __las_expenses: StoredExpense[] | undefined;
}

function loadAppointmentsFromDisk(): StoredAppointment[] {
  try {
    if (fs.existsSync(DISK_FILE)) {
      const raw = fs.readFileSync(DISK_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Remove apenas resquícios legados de almir
        return parsed.filter(
          (a) => !a.id?.includes("almir") && 
                 !a.user?.name?.toLowerCase().includes("almir")
        );
      }
    }
  } catch (_) {}
  return [];
}

function saveAppointmentsToDisk(apts: StoredAppointment[]): void {
  try {
    const dir = path.dirname(DISK_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DISK_FILE, JSON.stringify(apts, null, 2), "utf-8");
  } catch (_) {}
}

export function getAllStoredAppointments(): StoredAppointment[] {
  if (!global.__las_appointments) {
    const fromDisk = loadAppointmentsFromDisk();
    global.__las_appointments = fromDisk.filter(
      (a) => !a.id?.includes("almir") && 
             !a.user?.name?.toLowerCase().includes("almir")
    );
  }
  return (global.__las_appointments || []).filter(
    (a) => !a.id?.includes("almir") && 
           !a.user?.name?.toLowerCase().includes("almir")
  );
}

export function getStoredAppointmentById(id: string): StoredAppointment | undefined {
  const all = getAllStoredAppointments();
  return all.find((a) => a.id === id);
}

export function getAppointmentsForDate(dateStr: string, barberId?: string | null): StoredAppointment[] {
  const all = getAllStoredAppointments();
  return all.filter((apt) => {
    const { date: aptDay } = getBrazilDateAndTimeString(apt.date);
    const matchesDate = aptDay === dateStr;
    const matchesBarber = !barberId || barberId === "all" || apt.barberId === barberId;
    return matchesDate && matchesBarber;
  });
}

export function addStoredAppointment(aptData: Partial<StoredAppointment>): StoredAppointment {
  const all = getAllStoredAppointments();

  const barber = BARBERS.find((b) => b.id === aptData.barberId) || BARBERS[0];

  const service =
    OFFICIAL_SERVICES.find((s) => s.id === aptData.service?.id) ||
    OFFICIAL_SERVICES.find((s) => s.id === "corte-cabelo") ||
    OFFICIAL_SERVICES[0];

  const newApt: StoredAppointment = {
    id: aptData.id || `apt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: aptData.date || `${getLocalDateString()}T10:00:00-03:00`,
    status: aptData.status || "CONFIRMED",
    requestedDate: aptData.requestedDate,
    barberId: barber.id,
    barber: { id: barber.id, name: barber.name, phone: barber.phone, role: barber.role },
    service: { id: service.id, name: service.name, price: service.price, duration: service.duration },
    user: aptData.user || {
      id: `u-${Date.now()}`,
      name: "Cliente VIP",
      phone: "(69) 99378-3204",
      email: "cliente@teste.com",
    },
    paymentMethod: aptData.paymentMethod || "PIX",
    durationSpent: aptData.durationSpent,
    createdAt: aptData.createdAt || new Date().toISOString(),
  };

  all.unshift(newApt);
  global.__las_appointments = all;
  saveAppointmentsToDisk(all);
  return newApt;
}

export function updateStoredAppointment(id: string, updates: Partial<StoredAppointment>): boolean {
  const all = getAllStoredAppointments();
  const apt = all.find((a) => a.id === id);
  if (apt) {
    Object.assign(apt, updates);
    if (updates.barberId) {
      const barber = BARBERS.find((b) => b.id === updates.barberId);
      if (barber) {
        apt.barber = { id: barber.id, name: barber.name, phone: barber.phone, role: barber.role };
      }
    }
    if (updates.service?.id) {
      const service = OFFICIAL_SERVICES.find((s) => s.id === updates.service?.id);
      if (service) {
        apt.service = { id: service.id, name: service.name, price: service.price, duration: service.duration };
      }
    }
    saveAppointmentsToDisk(all);
    return true;
  }
  return false;
}

export function updateStoredAppointmentStatus(
  id: string,
  newStatus: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "RESCHEDULE_REQUESTED" | "CANCEL_REQUESTED"
): boolean {
  return updateStoredAppointment(id, { status: newStatus });
}

export function getStoredClosingsForDate(dateStr: string): StoredClosing[] {
  const all = global.__las_closings || [];
  return all.filter((c) => c.date.substring(0, 10) === dateStr);
}

export function addStoredClosing(closingData: StoredClosing): StoredClosing {
  if (!global.__las_closings) {
    global.__las_closings = [];
  }
  global.__las_closings.unshift(closingData);
  return closingData;
}

export function clearAllStoredData(): void {
  global.__las_appointments = [];
  global.__las_closings = [];
  global.__las_expenses = [];
  saveAppointmentsToDisk([]);
}
