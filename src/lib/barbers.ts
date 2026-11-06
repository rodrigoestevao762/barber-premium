export interface BarberData {
  id: string;
  name: string;
  email: string;
  phone: string; // WhatsApp com DDI e DDD (ex: 5569993783204)
  phoneDisplay: string;
  role: "ADMIN" | "BARBER";
  specialty: string;
  avatar: string;
  bio: string;
  commissionRate: number;
}

export const BARBERS: BarberData[] = [
  {
    id: "barbeiro-lucas",
    name: "Lucas Augusto",
    email: "lucastj609@gmail.com",
    phone: "5569993783204",
    phoneDisplay: "(69) 99378-3204",
    role: "ADMIN",
    specialty: "Corte de Alta Precisão, Barboterapia & Barbearia Clássica",
    avatar: "/barbers/lucas-augusto.jpg",
    bio: "Fundador e Master Barber do LAS Barber Studio. Atendimento privativo individual de alto padrão em Comodoro - MT.",
    commissionRate: 1.0,
  },
];

export function getBarberById(id?: string | null): BarberData {
  if (!id) return BARBERS[0];
  const found = BARBERS.find((b) => b.id === id);
  return found || BARBERS[0];
}

export function getBarberByEmail(email?: string | null): BarberData {
  if (!email) return BARBERS[0];
  const lower = email.toLowerCase().trim();
  const found = BARBERS.find((b) => b.email.toLowerCase() === lower);
  return found || BARBERS[0];
}
