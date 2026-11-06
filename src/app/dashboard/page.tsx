"use client";

import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { 
  TrendingUp, Users, UserPlus, Clock, ChevronRight, CheckCircle, Clock3, X, 
  Shield, DollarSign, Wallet, Award, ArrowUpRight, Lock, CreditCard, Banknote, 
  Sparkles, Calendar, Power, CheckCircle2, MessageCircle, AlertCircle, Edit3, 
  Send, UserCheck, ShieldCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { BARBERS, BarberData } from "@/lib/barbers";
import { OFFICIAL_SERVICES, ServiceItem } from "@/lib/services";
import { getDisplayTime } from "@/lib/timezone";

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Lucas Augusto";

  const [dashboardData, setDashboardData] = useState<any>({
    revenue: 0,
    totalGrossShop: 0,
    houseNetProfit: 0,
    todayCount: 0,
    completedCount: 0,
    ticketMedio: 0,
    appointments: [] as any[],
  });
  const [loading, setLoading] = useState(true);
  
  // Modal de cliente balcão
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [services] = useState<ServiceItem[]>(OFFICIAL_SERVICES);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("corte");
  const [walkInClientName, setWalkInClientName] = useState<string>("Cliente Balcão");
  const [walkInClientPhone, setWalkInClientPhone] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("PIX");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Filtro por Data
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Disponibilidade de Lucas Augusto no Site (por data específica)
  const [isOwnerAvailable, setIsOwnerAvailable] = useState(true);
  const [earlyClosing, setEarlyClosing] = useState<string | null>(null);
  const [lunchBreak, setLunchBreak] = useState<string | null>(null);
  const [isTogglingOwner, setIsTogglingOwner] = useState(false);

  // Modal de Cancelamento por Imprevisto com WhatsApp
  const [cancellingApt, setCancellingApt] = useState<any | null>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState<"imprevisto" | "ajuste" | "cliente">("imprevisto");
  const [customCancelMsg, setCustomCancelMsg] = useState("");
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);
  const [cancelSuccessWhatsappUrl, setCancelSuccessWhatsappUrl] = useState<string | null>(null);

  // Carrega status da disponibilidade no site para a data selecionada
  useEffect(() => {
    fetch(`/api/barbers?date=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.barbers || []);
        const owner = list.find((b: any) => b.id === "barbeiro-lucas" || b.id === "barbeiro-dono");
        if (owner) {
          setIsOwnerAvailable(owner.isAvailable !== false);
          setEarlyClosing(owner.earlyClosingTime || null);
          setLunchBreak(owner.lunchBreakTime || null);
        }
      })
      .catch(() => {});
  }, [selectedDate]);

  const toggleOwnerAvailability = async () => {
    setIsTogglingOwner(true);
    const newStatus = !isOwnerAvailable;
    const formattedDate = selectedDate.split("-").reverse().join("/");
    try {
      const res = await fetch('/api/barbers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          barberId: "barbeiro-lucas", 
          isAvailable: newStatus,
          date: selectedDate 
        })
      });
      if (res.ok) {
        setIsOwnerAvailable(newStatus);
        setToastMessage(newStatus 
          ? `Studio ABERTO para agendamentos no dia ${formattedDate}.`
          : `Studio FECHADO apenas para o dia ${formattedDate}. Os demais dias permanecem normais.`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTogglingOwner(false);
    }
  };

  const handleSetEarlyClosing = async (time: string | null) => {
    const formattedDate = selectedDate.split("-").reverse().join("/");
    try {
      const res = await fetch('/api/barbers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          barberId: "barbeiro-lucas", 
          date: selectedDate, 
          earlyClosingTime: time 
        })
      });
      if (res.ok) {
        setEarlyClosing(time);
        setToastMessage(time 
          ? `Expediente de ${formattedDate} encerrará mais cedo às ${time}. Horários posteriores bloqueados.`
          : `Horário normal restabelecido para o dia ${formattedDate}.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetLunchBreak = async (time: string | null) => {
    const formattedDate = selectedDate.split("-").reverse().join("/");
    try {
      const res = await fetch('/api/barbers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          barberId: "barbeiro-lucas", 
          date: selectedDate, 
          lunchBreakTime: time 
        })
      });
      if (res.ok) {
        setLunchBreak(time);
        setToastMessage(time 
          ? `Pausa para almoço travada às ${time} em ${formattedDate}. Horário bloqueado no site.`
          : `Pausa para almoço removida em ${formattedDate}. Horário liberado para agendamentos.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getCancelMessage = (apt: any, preset: "imprevisto" | "ajuste" | "cliente") => {
    const barberName = "Lucas Augusto";
    const aptTime = getDisplayTime(apt.date);
    const aptDate = apt.date ? apt.date.substring(0, 10).split("-").reverse().join("/") : "";
    const clientName = apt.user?.name || "Cliente";

    if (preset === "imprevisto") {
      return `Olá, ${clientName}! Sou o ${barberName} da LAS Barber Studio. Tive um imprevisto urgente hoje e precisei cancelar o seu horário das ${aptTime} (${aptDate}). Peço sinceras desculpas pelo ocorrido! Poderíamos reagendar para um outro horário ou dia que fique bom para você?`;
    } else if (preset === "ajuste") {
      return `Olá, ${clientName}! Informamos que seu horário das ${aptTime} (${aptDate}) na LAS Barber Studio precisou ser cancelado para ajuste da nossa agenda. O horário já está liberado caso queira remarcar pelo site ou por aqui!`;
    } else {
      return `Olá, ${clientName}! Confirmamos o cancelamento do seu agendamento no LAS Barber Studio para o dia ${aptDate} às ${aptTime}. Estamos à disposição para quando desejar agendar um novo atendimento!`;
    }
  };

  const openCancelModal = (apt: any) => {
    setCancellingApt(apt);
    setCancelReasonPreset("imprevisto");
    setCustomCancelMsg(getCancelMessage(apt, "imprevisto"));
    setCancelSuccessWhatsappUrl(null);
  };

  const handleChangeCancelPreset = (preset: "imprevisto" | "ajuste" | "cliente") => {
    setCancelReasonPreset(preset);
    if (cancellingApt) {
      setCustomCancelMsg(getCancelMessage(cancellingApt, preset));
    }
  };

  const handleConfirmCancelWithWhatsApp = async (openWhatsApp: boolean = true) => {
    if (!cancellingApt) return;
    setIsProcessingCancel(true);
    try {
      await updateStatus(cancellingApt.id, "CANCELLED");
      setToastMessage(`Agendamento de ${cancellingApt.user?.name || "Cliente"} cancelado. Horário liberado na agenda!`);
      
      const phoneDigits = (cancellingApt.user?.phone || "").replace(/\D/g, "");
      if (phoneDigits && openWhatsApp) {
        const cleanPhone = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customCancelMsg)}`;
        setCancelSuccessWhatsappUrl(whatsappUrl);
        try {
          window.open(whatsappUrl, "_blank");
        } catch (_) {}
      } else {
        setCancellingApt(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingCancel(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`/api/dashboard?date=${selectedDate}`);
      if (res.ok) {
        const json = await res.json();
        setDashboardData(json);
      }
    } catch (e) {
      console.error("Erro ao carregar dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedDate]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch('/api/dashboard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      fetchDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const submitWalkIn = async (overrideServiceId?: string) => {
    setIsSubmitting(true);
    try {
      const serviceToUse = OFFICIAL_SERVICES.find(s => s.id === (overrideServiceId || selectedServiceId)) || OFFICIAL_SERVICES[0];
      
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          serviceId: serviceToUse.id, 
          barberId: "barbeiro-lucas", 
          date: `${selectedDate}T${timeStr}-03:00`, 
          isWalkIn: true,
          status: "COMPLETED",
          clientName: walkInClientName.trim() || "Cliente Balcão",
          clientPhone: walkInClientPhone.trim() || "69993783204",
          paymentMethod,
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setWalkInClientName("Cliente Balcão");
        setWalkInClientPhone("");
        await fetchDashboard();
        setToastMessage(`Atendimento de R$ ${serviceToUse.price.toFixed(2)} registrado com sucesso no caixa de Lucas Augusto!`);
      }
    } catch (e) {
      console.error("Erro ao registrar balcão:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <div className="animate-pulse text-[#DFBA73] font-serif text-lg tracking-widest uppercase">
          Carregando Painel do Studio...
        </div>
      </div>
    );
  }

  const activeChosenService = OFFICIAL_SERVICES.find(s => s.id === selectedServiceId) || OFFICIAL_SERVICES[0];

  // Agendamentos futuros confirmados ou pendentes (ordenados cronologicamente)
  const minActiveTime = Date.now() - 30 * 60 * 1000;
  const upcomingList = (dashboardData.upcomingAppointments || []).filter(
    (a: any) =>
      (a.status === 'CONFIRMED' || a.status === 'PENDING') &&
      new Date(a.date).getTime() >= minActiveTime &&
      !a.id?.includes('almir') &&
      !a.user?.name?.toLowerCase().includes('almir')
  ).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const nextApt = upcomingList[0] || null;
  const confirmedCount = upcomingList.length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12 relative">
      {/* Toast de Confirmação */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 right-6 z-[160] bg-[#080A0E] border-2 border-[#DFBA73] text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-md backdrop-blur-md"
          >
            <div className="w-10 h-10 rounded-full bg-[#DFBA73]/20 text-[#F5D799] flex items-center justify-center shrink-0 border border-[#DFBA73]/40">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#F5D799] text-sm flex items-center gap-1.5 font-mono">
                <Sparkles className="w-4 h-4" /> Caixa do Studio Atualizado
              </p>
              <p className="text-gray-200 text-xs mt-0.5 leading-snug">{toastMessage}</p>
            </div>
            <button 
              onClick={() => setToastMessage(null)} 
              className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━ CABEÇALHO DO DASHBOARD (ESTÚDIO PRIVATIVO • GESTÃO SOLO) ━━━ */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black flex items-center gap-1.5 shadow-md shadow-[#DFBA73]/20 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" /> Gestão Solo • 100% Studio
            </span>
            <span className="text-gray-400 text-xs font-light">
              Master Barber: <strong className="text-white">{userName}</strong>
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-serif text-white tracking-tight">
            Painel do Studio • <span className="text-[#F5D799] italic">Lucas Augusto</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Acompanhamento em tempo real do faturamento integral do studio, clientes atendidos e agenda.
          </p>
        </div>

        {/* Controles de Filtro: Data e Botão Balcão */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[#080A0E] border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-[#DFBA73] transition-colors [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>

          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold hover:brightness-110 px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-[#DFBA73]/25 flex items-center gap-2 cursor-pointer font-mono"
          >
            <UserPlus className="w-4 h-4" /> + Cliente Balcão
          </button>
        </div>
      </div>

      {/* ━━━ CARD DO MASTER BARBER COM FOTO REAL DE LUCAS AUGUSTO ━━━ */}
      <div className="p-5 md:p-6 bg-[#080A0E] border border-[#DFBA73]/30 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-[#DFBA73] shadow-lg shadow-[#DFBA73]/25 shrink-0">
            <Image
              src="/barbers/lucas-augusto.jpg"
              alt="Lucas Augusto"
              fill
              className="object-cover object-top"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#F5D799] bg-[#DFBA73]/20 border border-[#DFBA73]/30 px-2.5 py-0.5 rounded-full font-mono">
                Proprietário & Solo Studio
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono ${
                isOwnerAvailable 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}>
                {isOwnerAvailable 
                  ? `Studio Aberto em ${selectedDate.split("-").reverse().join("/")}` 
                  : `Studio Fechado em ${selectedDate.split("-").reverse().join("/")}`}
              </span>
              {earlyClosing && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono bg-[#DFBA73]/20 text-[#F5D799] border border-[#DFBA73]/40">
                  Saída antecipada às {earlyClosing}
                </span>
              )}
              {lunchBreak && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  🍽️ Almoço às {lunchBreak} (travado)
                </span>
              )}
            </div>
            <h3 className="text-xl font-serif text-white mt-1">
              Lucas Augusto — LAS Barber Studio
            </h3>
            <p className="text-xs text-gray-300 mt-0.5 max-w-xl leading-relaxed font-light">
              {isOwnerAvailable 
                ? `Disponível para agendamentos online em ${selectedDate.split("-").reverse().join("/")}. Os demais dias do ano continuam abertos.` 
                : `Studio fechado nesta data específica (${selectedDate.split("-").reverse().join("/")}). Os outros dias continuam normais.`}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Controle Pausa para Almoço nesta data */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
            <span className="text-xs">🍽️</span>
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider whitespace-nowrap">Almoço:</span>
            <select
              value={lunchBreak || ""}
              onChange={(e) => handleSetLunchBreak(e.target.value || null)}
              className="bg-transparent text-white text-xs font-mono outline-none cursor-pointer"
            >
              <option value="" className="bg-[#080A0E] text-white">Sem pausa</option>
              <option value="11:00" className="bg-[#080A0E] text-white">11:00 às 12:00</option>
              <option value="12:00" className="bg-[#080A0E] text-white">12:00 às 13:00</option>
              <option value="13:00" className="bg-[#080A0E] text-white">13:00 às 14:00</option>
              <option value="14:00" className="bg-[#080A0E] text-white">14:00 às 15:00</option>
              <option value="15:00" className="bg-[#080A0E] text-white">15:00 às 16:00</option>
              <option value="12:00-14:00" className="bg-[#080A0E] text-white">12:00 às 14:00 (2h)</option>
              <option value="13:00-15:00" className="bg-[#080A0E] text-white">13:00 às 15:00 (2h)</option>
            </select>
          </div>

          {/* Controle Sair Mais Cedo nesta data */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
            <Clock className="w-3.5 h-3.5 text-[#DFBA73]" />
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider whitespace-nowrap">Sair antes:</span>
            <select
              value={earlyClosing || ""}
              onChange={(e) => handleSetEarlyClosing(e.target.value || null)}
              className="bg-transparent text-white text-xs font-mono outline-none cursor-pointer"
            >
              <option value="" className="bg-[#080A0E] text-white">Horário normal</option>
              <option value="14:00" className="bg-[#080A0E] text-white">Encerrar às 14:00</option>
              <option value="15:00" className="bg-[#080A0E] text-white">Encerrar às 15:00</option>
              <option value="16:00" className="bg-[#080A0E] text-white">Encerrar às 16:00</option>
              <option value="17:00" className="bg-[#080A0E] text-white">Encerrar às 17:00</option>
              <option value="18:00" className="bg-[#080A0E] text-white">Encerrar às 18:00</option>
              <option value="19:00" className="bg-[#080A0E] text-white">Encerrar às 19:00</option>
            </select>
          </div>

          <button
            onClick={toggleOwnerAvailability}
            disabled={isTogglingOwner}
            className={`px-5 py-3 rounded-2xl font-bold uppercase tracking-wider text-xs font-mono transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md ${
              isOwnerAvailable
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black"
                : "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500 hover:text-white"
            }`}
          >
            <Power className="w-4 h-4" />
            <span>
              {isTogglingOwner 
                ? "Atualizando..." 
                : isOwnerAvailable 
                  ? "Studio Aberto" 
                  : "Studio Fechado"}
            </span>
          </button>
        </div>
      </div>

      {/* ━━━ PRÓXIMOS AGENDAMENTOS CONFIRMADOS (PADRÃO MR BASTOS / LAS STUDIO) ━━━ */}
      {nextApt ? (
        <div className="bg-gradient-to-r from-[#DFBA73]/15 via-[#080A0E] to-[#050608] border-2 border-[#DFBA73]/40 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(ellipse_at_center,_rgba(223,186,115,0.15)_0%,_transparent_70%)] pointer-events-none rounded-full" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-[#DFBA73] font-bold">
                  Próximos Agendamentos Confirmados
                </h3>
                <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#DFBA73]/20 border border-[#DFBA73]/40 text-[#F5D799] font-bold">
                  {confirmedCount} {confirmedCount === 1 ? 'agendado' : 'agendados'}
                </span>
              </div>

              {/* Linha Principal Solicitada pelo Usuário */}
              <div className="pt-1">
                <p className="text-lg sm:text-xl md:text-2xl font-serif text-white leading-relaxed">
                  <span className="text-gray-400 font-sans text-sm md:text-base font-normal">Próximo cliente: </span>
                  <strong className="text-[#F5D799] font-bold">
                    {nextApt.user?.name || nextApt.clientName || 'Cliente'}
                  </strong>
                  <span className="text-gray-200 font-light">
                    {' '}em {new Date(nextApt.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às {getDisplayTime(nextApt.date)} ({nextApt.service?.name})
                  </span>
                </p>
                
                <div className="flex items-center gap-4 text-xs text-gray-400 font-mono mt-2 flex-wrap">
                  {nextApt.paymentMethod && (
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                      <CreditCard className="w-3.5 h-3.5 text-[#DFBA73]" /> Pagamento: <strong className="text-white">{nextApt.paymentMethod}</strong>
                    </span>
                  )}
                  {nextApt.user?.phone && (
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> {nextApt.user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex flex-wrap items-center gap-3">
              {nextApt.user?.phone && (
                <a
                  href={`https://wa.me/${nextApt.user.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Olá ${nextApt.user.name || 'Cliente'}! Aqui é o Lucas Augusto do LAS Barber Studio. Confirmando seu horário de ${nextApt.service?.name} às ${getDisplayTime(nextApt.date)} no estúdio privativo.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-black transition-all text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              )}

              <button
                onClick={() => updateStatus(nextApt.id, 'COMPLETED')}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold text-xs uppercase font-mono tracking-wider shadow-lg shadow-[#DFBA73]/30 hover:brightness-110 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Concluir Atendimento
              </button>

              <a
                href="/dashboard/agenda"
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#DFBA73]/40 text-gray-300 hover:text-white transition-all text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                Ver na Agenda <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#080A0E] border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
              <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-gray-400 font-bold">
                Próximos Agendamentos Confirmados
              </h3>
              <span className="text-[11px] font-mono px-3 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 font-bold">
                0 agendados
              </span>
            </div>
            <a
              href="/dashboard/agenda"
              className="text-xs text-[#DFBA73] hover:underline font-mono uppercase tracking-wider flex items-center gap-1"
            >
              Abrir Agenda <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-light">
            Nenhum cliente agendado aguardando atendimento no momento.
          </p>
        </div>
      )}

      {/* ━━━ BENTO GRID: MÉTRICAS DO ESTÚDIO SOLO (100% RETIDO) ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Faturamento Total */}
        <div className="bg-gradient-to-br from-[#DFBA73]/15 via-[#080A0E] to-[#050608] border border-[#DFBA73]/40 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#DFBA73]/10 blur-2xl rounded-full pointer-events-none" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <span className="text-[10px] bg-[#DFBA73]/20 text-[#F5D799] border border-[#DFBA73]/30 px-2.5 py-0.5 rounded-full uppercase font-bold tracking-wider font-mono">
                100% Studio
              </span>
              <p className="text-gray-300 text-xs tracking-wider uppercase font-semibold mt-2 font-mono">
                Faturamento do Dia
              </p>
              <h3 className="text-3xl sm:text-4xl font-serif text-white mt-1 font-bold">
                R$ {Number(dashboardData.revenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F5D799] to-[#DFBA73] text-black flex items-center justify-center font-bold shadow-lg shadow-[#DFBA73]/20">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-gray-400 relative z-10 font-light">
            Receita total de atendimentos concluídos na data.
          </p>
        </div>

        {/* Card 2: Atendimentos Concluídos */}
        <div className="bg-[#080A0E] border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-400 text-xs tracking-wider uppercase font-semibold font-mono">
              Atendimentos
            </p>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#DFBA73]">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-serif text-white font-bold">
              {dashboardData.completedCount || 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              De {dashboardData.todayCount || 0} horários agendados
            </p>
          </div>
        </div>

        {/* Card 3: Ticket Médio */}
        <div className="bg-[#080A0E] border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-400 text-xs tracking-wider uppercase font-semibold font-mono">
              Ticket Médio
            </p>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#DFBA73]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-serif text-white font-bold">
              R$ {Number(dashboardData.ticketMedio || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Média por cliente atendido
            </p>
          </div>
        </div>

        {/* Card 4: Total de Agendamentos */}
        <div className="bg-[#080A0E] border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-400 text-xs tracking-wider uppercase font-semibold font-mono">
              Agendamentos
            </p>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#DFBA73]">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-serif text-white font-bold">
              {dashboardData.todayCount || 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Horários marcados para {selectedDate.split("-").reverse().join("/")}
            </p>
          </div>
        </div>

      </div>

      {/* ━━━ TABELA DE ATENDIMENTOS DO DIA ━━━ */}
      <div className="bg-[#080A0E] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
          <div>
            <h3 className="text-xl font-serif text-white">
              Atendimentos do Studio • {selectedDate.split("-").reverse().join("/")}
            </h3>
            <p className="text-xs text-gray-400 font-light mt-0.5">
              Horários agendados e atendidos exclusivamente por Lucas Augusto.
            </p>
          </div>
          <span className="text-xs text-[#DFBA73] font-mono">
            {dashboardData.appointments?.length || 0} registros
          </span>
        </div>

        {dashboardData.appointments?.length === 0 ? (
          <div className="py-16 text-center text-gray-500 italic font-light">
            Nenhum atendimento registrado para esta data.
          </div>
        ) : (
          <div className="grid gap-3.5">
            {dashboardData.appointments.map((apt: any) => {
              const aptTime = getDisplayTime(apt.date);
              const cutPrice = Number(apt.service?.price || 0);

              return (
                <div 
                  key={apt.id} 
                  className={`flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 bg-white/[0.02] border rounded-2xl transition-all gap-4 overflow-hidden ${
                    apt.status === 'CANCELLED' 
                      ? 'border-red-500/20 opacity-50' 
                      : apt.status === 'RESCHEDULE_REQUESTED'
                      ? 'border-[#DFBA73]/50 bg-[#DFBA73]/[0.04]'
                      : 'border-white/5 hover:border-[#DFBA73]/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#050608] border border-[#DFBA73]/30 flex flex-col items-center justify-center font-mono shrink-0 shadow-md">
                      <span className="text-[9px] text-gray-400 font-light">HORA</span>
                      <span className="text-xs sm:text-sm font-bold text-[#F5D799]">{aptTime}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-white font-medium text-base sm:text-lg truncate">
                          {apt.user?.name || "Cliente"}
                        </h4>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-[#DFBA73]/15 border border-[#DFBA73]/30 text-[#F5D799] shrink-0 font-mono">
                          Lucas Augusto
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                        <span className="text-gray-200 font-medium">{apt.service?.name}</span>
                        <span>•</span>
                        <span className="text-[#DFBA73] font-mono font-bold">R$ {cutPrice}</span>
                        <span>•</span>
                        <span className="text-gray-500 font-mono">{apt.user?.phone || "Sem tel"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 shrink-0">
                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg border ${
                        apt.status === 'CONFIRMED' ? 'border-[#DFBA73]/40 text-[#F5D799] bg-[#DFBA73]/10' : 
                        apt.status === 'COMPLETED' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 
                        apt.status === 'CANCELLED' ? 'border-red-500/30 text-red-400 bg-red-500/10' : 
                        apt.status === 'RESCHEDULE_REQUESTED' ? 'border-[#DFBA73]/40 text-[#F5D799] bg-[#DFBA73]/10' :
                        'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                      }`}>
                        {apt.status === 'CONFIRMED' ? 'Confirmado' : 
                         apt.status === 'COMPLETED' ? 'Concluído' : 
                         apt.status === 'CANCELLED' ? 'Cancelado' : 
                         apt.status === 'RESCHEDULE_REQUESTED' ? 'Reagendamento' :
                         'Pendente'}
                      </span>

                      {/* WhatsApp do cliente */}
                      {apt.user?.phone && (
                        <a
                          href={`https://wa.me/55${apt.user.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, ${apt.user.name}! Sou o Lucas da LAS Barber Studio. Confirmando seu horário para hoje às ${aptTime}!`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all shrink-0 cursor-pointer"
                          title="Enviar WhatsApp ao cliente"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {apt.status === 'PENDING' && (
                        <button 
                          onClick={() => updateStatus(apt.id, 'CONFIRMED')} 
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#DFBA73]/20 hover:bg-[#DFBA73] hover:text-black text-[#F5D799] transition-all shrink-0 cursor-pointer"
                        >
                          Confirmar
                        </button>
                      )}
                      
                      {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                        <button 
                          onClick={() => updateStatus(apt.id, 'COMPLETED')} 
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black transition-all shrink-0 cursor-pointer"
                        >
                          Finalizar
                        </button>
                      )}

                      {apt.status !== 'CANCELLED' && (
                        <button 
                          onClick={() => openCancelModal(apt)} 
                          className="px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm shrink-0 cursor-pointer" 
                          title="Cancelar atendimento"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ━━━ MODAL: CLIENTE BALCÃO ━━━ */}
      {mounted && isModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-lg bg-[#080A0E] border border-[#DFBA73]/40 rounded-3xl p-6 sm:p-8 z-10 shadow-2xl max-h-[90vh] flex flex-col text-white"
          >
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-2xl font-serif text-white">Lançar Cliente Balcão</h3>
                <p className="text-xs text-gray-400 mt-0.5">Registre um atendimento presencial no estúdio.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">
                  Nome do Cliente
                </label>
                <input 
                  type="text" 
                  value={walkInClientName}
                  onChange={(e) => setWalkInClientName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:border-[#DFBA73] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">
                  WhatsApp (opcional)
                </label>
                <input 
                  type="text" 
                  value={walkInClientPhone}
                  onChange={(e) => setWalkInClientPhone(e.target.value)}
                  placeholder="Ex: (69) 99378-3204"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:border-[#DFBA73] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">
                  Barbeiro Responsável
                </label>
                <div className="p-3 bg-white/[0.03] border border-[#DFBA73]/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-[#DFBA73]/50 shrink-0">
                      <Image src="/barbers/lucas-augusto.jpg" alt="Lucas Augusto" fill className="object-cover object-top" />
                    </div>
                    <div>
                      <h5 className="text-white text-sm font-medium">Lucas Augusto</h5>
                      <p className="text-[10px] text-[#DFBA73] font-mono">Master Barber & Proprietário</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#DFBA73]/20 text-[#F5D799] border border-[#DFBA73]/30 px-2.5 py-0.5 rounded-full font-bold font-mono">
                    100% Studio
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">
                  Ritual / Serviço Prestado
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full bg-[#050608] border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:border-[#DFBA73] focus:outline-none font-mono"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} - R$ {s.price} ({s.duration} min) {s.badge ? `• ${s.badge}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["PIX", "CRÉDITO", "DÉBITO", "DINHEIRO"].map((pm) => (
                    <button
                      type="button"
                      key={pm}
                      onClick={() => setPaymentMethod(pm)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                        paymentMethod === pm
                          ? "border-[#DFBA73] bg-[#DFBA73] text-black shadow-md"
                          : "border-white/10 text-gray-300 hover:text-white bg-white/[0.02]"
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => submitWalkIn()}
                className="w-full py-4 bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold uppercase tracking-widest text-xs rounded-xl mt-4 transition-all shadow-lg shadow-[#DFBA73]/25 cursor-pointer hover:brightness-110"
              >
                {isSubmitting ? "Lançando..." : `Confirmar R$ ${activeChosenService.price} no Caixa`}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ━━━ MODAL DE CANCELAMENTO ━━━ */}
      <AnimatePresence>
        {cancellingApt && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCancellingApt(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#080A0E] border border-red-500/40 rounded-3xl p-6 sm:p-8 z-10 shadow-2xl text-white space-y-5"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5 text-red-400">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/40">
                    <X className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-white">Cancelar Atendimento</h3>
                    <p className="text-xs text-gray-400">
                      Cliente: <strong className="text-white">{cancellingApt.user?.name || "Cliente"}</strong>
                    </p>
                  </div>
                </div>
                <button onClick={() => setCancellingApt(null)} className="text-gray-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cancelSuccessWhatsappUrl ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-200">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span>Agendamento cancelado com sucesso!</span>
                    </div>
                    <p className="text-gray-300">
                      O horário foi liberado na agenda do estúdio.
                    </p>
                  </div>

                  <a
                    href={cancelSuccessWhatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 bg-[#25D366] text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#128C7E] transition-all shadow-lg cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Avisar Cliente no WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setCancellingApt(null)}
                    className="w-full py-2.5 text-xs text-gray-400 hover:text-white text-center cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2 font-mono">
                      Motivo do Cancelamento
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleChangeCancelPreset("imprevisto")}
                        className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                          cancelReasonPreset === "imprevisto"
                            ? "bg-red-500/20 text-red-300 border-red-500/50"
                            : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                        }`}
                      >
                        Imprevisto
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeCancelPreset("ajuste")}
                        className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                          cancelReasonPreset === "ajuste"
                            ? "bg-red-500/20 text-red-300 border-red-500/50"
                            : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                        }`}
                      >
                        Ajuste Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeCancelPreset("cliente")}
                        className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                          cancelReasonPreset === "cliente"
                            ? "bg-red-500/20 text-red-300 border-red-500/50"
                            : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                        }`}
                      >
                        A Pedido
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2 font-mono">
                      Mensagem que será enviada no WhatsApp:
                    </label>
                    <textarea
                      rows={4}
                      value={customCancelMsg}
                      onChange={(e) => setCustomCancelMsg(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-white text-xs leading-relaxed focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isProcessingCancel}
                      onClick={() => handleConfirmCancelWithWhatsApp(true)}
                      className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{isProcessingCancel ? "Cancelando..." : "Cancelar e Notificar WhatsApp"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingCancel}
                      onClick={() => handleConfirmCancelWithWhatsApp(false)}
                      className="px-4 py-3.5 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Sem WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
