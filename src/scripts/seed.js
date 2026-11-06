const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const OFFICIAL_SERVICES = [
  { id: "corte-social", name: "Corte Tradicional / Social", description: "Alinhamento com tesoura e máquina, acabamento refinado com navalhete e finalização com pomada premium.", price: 45, duration: 30 },
  { id: "degrade-navalhado", name: "Degradê Navalhado (Fade)", description: "Transição perfeita do zero à altura desejada, raspagem navalhada com lâmina descartável e hidratação de couro cabeludo.", price: 50, duration: 40 },
  { id: "barba-terapia", name: "Barba Clássica & Barboterapia", description: "Toalha quente com óleos essenciais, massagem facial, modelagem com navalhete e pós-barba refrescante.", price: 40, duration: 30 },
  { id: "combo-corte-barba", name: "Combo Completo: Corte & Barba", description: "Experiência completa LAS: Corte personalizado + Barboterapia completa com toalha quente e finalização VIP.", price: 80, duration: 60 },
  { id: "acabamento-pezinho", name: "Pezinho & Acabamento", description: "Alinhamento de contornos do cabelo e nuca com navalhete e loção calmante.", price: 20, duration: 15 },
  { id: "sobrancelha-navalha", name: "Design de Sobrancelha na Navalha", description: "Alinhamento geométrico e limpeza dos pelos com navalhete esterilizado.", price: 15, duration: 15 },
  { id: "pigmentacao-barba", name: "Pigmentação de Barba", description: "Correção de falhas e realce de densidade dos fios com tinta antialérgica especial.", price: 35, duration: 25 },
  { id: "platinado-nevou", name: "Nevou / Platinado Global", description: "Descoloração profissional com protetor térmico capilar, matização sem amarelados e hidratação profunda.", price: 130, duration: 90 },
  { id: "selagem-alisamento", name: "Selagem & Redução de Volume", description: "Tratamento para alinhamento dos fios, brilho intenso e redução de frizz com produtos nobres.", price: 90, duration: 60 }
];

async function seed() {
  console.log("Seeding Lucas Augusto...");
  await prisma.barber.upsert({
    where: { id: "barbeiro-lucas" },
    update: { name: "Lucas Augusto", commissionRate: 0.5 },
    create: { id: "barbeiro-lucas", name: "Lucas Augusto", commissionRate: 0.5 }
  });

  const pwd = await bcrypt.hash("123", 10);
  await prisma.user.upsert({
    where: { email: "lucastj609@gmail.com" },
    update: {
      name: "Lucas Augusto",
      phone: "5569993783204",
      role: "ADMIN",
      password: pwd
    },
    create: {
      id: "barbeiro-lucas",
      name: "Lucas Augusto",
      email: "lucastj609@gmail.com",
      phone: "5569993783204",
      role: "ADMIN",
      password: pwd
    }
  });

  console.log("Seeding services...");
  for (const s of OFFICIAL_SERVICES) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: { name: s.name, description: s.description, price: s.price, duration: s.duration },
      create: { id: s.id, name: s.name, description: s.description, price: s.price, duration: s.duration }
    });
  }

  const uCount = await prisma.user.count();
  const sCount = await prisma.service.count();
  const bCount = await prisma.barber.count();
  console.log("✅ Seed successfully finished! Users:", uCount, "Services:", sCount, "Barbers:", bCount);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
