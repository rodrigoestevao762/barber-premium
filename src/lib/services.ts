export interface ServiceItem {
  id: string;
  name: string;
  category: "combo" | "corte" | "barba" | "estetica";
  categoryLabel: string;
  description: string;
  price: number;
  duration: number; // minutos
  image: string;
  badge?: string;
  isCombo?: boolean;
  highlight?: boolean;
  index: string;
  tags?: string[];
  ritualSteps?: string[];
}

export const OFFICIAL_SERVICES: ServiceItem[] = [
  // ── COMBOS & RITUAIS EXCLUSIVOS ──
  {
    id: "combo-corte-barba-sobrancelha",
    index: "01",
    name: "Corte + Barba + Sobrancelha",
    category: "combo",
    categoryLabel: "Rituais Exclusivos",
    description: "Alinhamento estético de impacto. Transforma e define seus traços com corte refinado, barba desenhada na navalha e sobrancelha harmonizada com discrição masculina.",
    price: 100,
    duration: 75,
    image: "/services/studio-privativo.jpg",
    badge: "HARMONIZAÇÃO TOTAL",
    isCombo: true,
    highlight: true,
    tags: ["Harmonização Total", "Navalha de Precisão", "Toalha Quente", "Privativo 1 a 1"],
    ritualSteps: [
      "Análise de estilo e proporções faciais",
      "Corte capilar com acabamento de precisão",
      "Emoliência com toalha aquecida e desenho na navalha",
      "Alinhamento de sobrancelha com discrição masculina",
      "Finalização com pomada matte e óleo nobre"
    ]
  },
  {
    id: "combo-corte-barba",
    index: "02",
    name: "Corte + Barba",
    category: "combo",
    categoryLabel: "Rituais Exclusivos",
    description: "A assinatura essencial para sua imagem pessoal. Harmonização facial completa com corte estruturado e barba modelada na navalha com toalha aquecida e bálsamo nobre.",
    price: 95,
    duration: 65,
    image: "/services/corte-barba-real.jpg",
    badge: "MAIS ESCOLHIDO",
    isCombo: true,
    highlight: true,
    tags: ["Assinatura Clássica", "Toalha Quente", "Modelagem Navalha"],
    ritualSteps: [
      "Análise de proporção do rosto e barba",
      "Corte e texturização capilar",
      "Emoliência com toalha quente e espuma densa",
      "Navalha clássica e bálsamo hidratante"
    ]
  },
  {
    id: "combo-corte-sobrancelha",
    index: "03",
    name: "Corte + Sobrancelha",
    category: "combo",
    categoryLabel: "Rituais Exclusivos",
    description: "Alinhamento capilar de alta precisão somado ao design e limpeza cirúrgica de sobrancelha na lâmina, valorizando o olhar e a harmonia facial.",
    price: 65,
    duration: 45,
    image: "/services/sobrancelha.jpg",
    badge: "HARMONIZAÇÃO FACIAL",
    isCombo: true,
    highlight: true,
    tags: ["Corte Sob Medida", "Sobrancelha na Lâmina", "Harmonização Facial"],
    ritualSteps: [
      "Consultoria de visagismo e harmonia facial",
      "Corte capilar de alta precisão milimétrica sob medida",
      "Alinhamento e limpeza cirúrgica de sobrancelha na lâmina",
      "Lavagem refrescante e styling final com pomada matte"
    ]
  },

  // ── CORTES DE PRECISÃO ──
  {
    id: "corte-cabelo",
    index: "04",
    name: "Corte de Cabelo",
    category: "corte",
    categoryLabel: "Cortes de Precisão",
    description: "Corte contemporâneo ou clássico executado com técnica milimétrica na tesoura e máquina. Inclui lavagem refrescante e styling final com pomada matte nobre.",
    price: 45,
    duration: 35,
    image: "/services/corte-tesoura.jpg",
    badge: "ALTA PRECISÃO",
    highlight: true,
    tags: ["Corte Sob Medida", "Lavagem Nobre", "Styling Matte"],
  },
  {
    id: "corte-tesoura",
    index: "05",
    name: "Corte em Tesoura",
    category: "corte",
    categoryLabel: "Cortes de Precisão",
    description: "Alfaiataria capilar artesanal 100% na tesoura. Garante caimento natural, fluidez milimétrica e texturização personalizada sem o uso de máquinas agressivas.",
    price: 50,
    duration: 45,
    image: "/services/corte-cabelo.jpg",
    badge: "100% ARTESANAL",
    tags: ["Tesoura Fio Navalha", "Caimento Natural", "Texturização"],
  },
  {
    id: "corte-infantil",
    index: "06",
    name: "Corte Infantil",
    category: "corte",
    categoryLabel: "Cortes de Precisão",
    description: "Atendimento acolhedor, calmo e seguro em ambiente privativo sem ruídos. Respeito ao tempo e conforto da criança com acabamento impecável.",
    price: 45,
    duration: 30,
    image: "/services/corte-infantil.jpg",
    badge: "CONFORTO & CALMA",
    tags: ["Estúdio Privativo", "Sem Ruídos", "Paciência e Cuidado"],
  },

  // ── BARBA ──
  {
    id: "barba",
    index: "07",
    name: "Barba",
    category: "barba",
    categoryLabel: "Barba & Cuidados",
    description: "Alinhamento, simetria e desenho cirúrgico da barba com navalhete descartável, toalha aquecida e massagem relaxante com óleos essenciais.",
    price: 45,
    duration: 35,
    image: "/services/barba-clipper-gold.jpg",
    badge: "ALINHAMENTO & TOALHA",
    highlight: true,
    tags: ["Toalha Quente", "Navalha Clássica", "Óleos Essenciais"],
  },
  {
    id: "pigmentacao-barba",
    index: "08",
    name: "Pigmentação de Barba",
    category: "barba",
    categoryLabel: "Barba & Cuidados",
    description: "Camuflagem estética e preenchimento de falhas capilares. Proporciona densidade visual uniforme, contorno nítido e visual marcante com pigmento hipoalergênico.",
    price: 30,
    duration: 25,
    image: "/services/pigmentacao.jpg",
    badge: "DENSIDADE & DEFINIÇÃO",
    tags: ["Preenchimento", "Contorno Nítido", "Pigmento Hipoalergênico"],
  },

  // ── ESTÉTICA & CUIDADO ──
  {
    id: "sobrancelha",
    index: "09",
    name: "Sobrancelha",
    category: "estetica",
    categoryLabel: "Estética & Cuidado",
    description: "Limpeza cirúrgica do excesso de fios na navalha e pinça, respeitando o formato natural masculino para abrir o olhar com sobriedade e sofisticação.",
    price: 20,
    duration: 15,
    image: "/services/navalha-gel.jpg",
    badge: "DESIGN CIRÚRGICO",
    tags: ["Design Masculino", "Navalha de Precisão", "Expressão Serena"],
  },
  {
    id: "depilacao-nariz-orelha",
    index: "10",
    name: "Depilação de Nariz e Orelha",
    category: "estetica",
    categoryLabel: "Estética & Cuidado",
    description: "Remoção higiênica e indolor com cera morna hipoalergênica. Higiene imediata e assepsia profunda em minutos, garantindo acabamento polido.",
    price: 20,
    duration: 15,
    image: "/services/depilacao.jpg",
    badge: "HIGIENE & ASSEPSIA",
    tags: ["Cera Hipoalergênica", "Rápido & Indolor", "Assepsia Total"],
  },
  {
    id: "hidratacao",
    index: "11",
    name: "Hidratação",
    category: "estetica",
    categoryLabel: "Estética & Cuidado",
    description: "Tratamento reconstrutor intensivo para fios opacos ou ressecados. Repõe a massa capilar, conferindo maciez, brilho saudável e sensação de frescor duradouro.",
    price: 30,
    duration: 25,
    image: "/services/hidratacao.jpg",
    badge: "NUTRIÇÃO PROFUNDA",
    tags: ["Reposição Capilar", "Brilho Saudável", "Massagem no Lavatório"],
  },
];

export function getServiceById(id?: string | null): ServiceItem | undefined {
  if (!id) return undefined;
  const lower = id.toLowerCase().trim();

  // Compatibilidade com IDs legados
  if (lower === "corte") return OFFICIAL_SERVICES.find((s) => s.id === "corte-cabelo");
  if (lower === "combo-corte-barba") return OFFICIAL_SERVICES.find((s) => s.id === "combo-corte-barba");
  if (lower === "combo-completo") return OFFICIAL_SERVICES.find((s) => s.id === "combo-corte-barba-sobrancelha");

  return OFFICIAL_SERVICES.find(
    (s) => s.id === id || s.name.toLowerCase() === lower || s.id === lower
  );
}
