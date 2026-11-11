const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const OFFICIAL_SERVICES = [
  { id: "combo-corte-barba-sobrancelha", name: "Combo Completo: Corte + Barba + Sobrancelha", description: "Alinhamento estético completo com corte refinado, barba desenhada na navalha e sobrancelha harmonizada.", price: 100, duration: 75 },
  { id: "combo-corte-barba", name: "Corte + Barba", description: "Corte personalizado aliado à barba modelada com acabamento na navalha e hidratação.", price: 95, duration: 65 },
  { id: "combo-corte-sobrancelha", name: "Corte + Sobrancelha", description: "Corte de precisão combinado ao alinhamento discreto de sobrancelha na navalha.", price: 65, duration: 45 },
  { id: "corte-cabelo", name: "Corte de Cabelo", description: "Corte personalizado com máquina e tesoura, acabamento na navalha e finalização premium.", price: 45, duration: 35 },
  { id: "corte-tesoura", name: "Corte em Tesoura", description: "Execução artesanal em tesoura para caimento natural, textura e precisão.", price: 50, duration: 45 },
  { id: "corte-infantil", name: "Corte Infantil", description: "Atendimento cuidadoso e estilo sob medida para o público infantil.", price: 45, duration: 30 },
  { id: "barba", name: "Barba", description: "Modelagem, alinhamento na navalha e hidratação para a barba.", price: 45, duration: 35 },
  { id: "pigmentacao-barba", name: "Pigmentação de Barba", description: "Preenchimento e realce natural dos contornos e densidade da barba.", price: 30, duration: 25 },
  { id: "sobrancelha", name: "Sobrancelha", description: "Limpeza e alinhamento masculino na navalha mantendo a naturalidade.", price: 20, duration: 15 },
  { id: "depilacao-nariz-orelha", name: "Depilação de Nariz e Orelha", description: "Remoção higiênica e confortável dos excessos nas regiões do nariz e orelha.", price: 20, duration: 15 },
  { id: "hidratacao", name: "Hidratação", description: "Tratamento revitalizante para maciez, brilho e saúde dos fios.", price: 30, duration: 25 }
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
