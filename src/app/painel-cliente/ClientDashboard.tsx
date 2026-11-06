"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Calendar, Clock, RotateCcw, User, LogOut, Award, Star, 
  CheckCircle, CheckCircle2, MessageCircle, MapPin, ChevronRight, Home, 
  AlertTriangle, AlertCircle, X, Check, Edit2, Crown
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import BookingModal from "@/components/BookingModal";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogoLasBarber } from "@/components/LogoLasBarber";
import { BARBERS, getBarberById } from "@/lib/barbers";
import { getDisplayTime } from "@/lib/timezone";
import { checkDayStatus } from "@/lib/holidays";

export default function ClientDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Olá");
  const [newBookingBanner, setNewBookingBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("newBooking=1")) {
      setNewBookingBanner(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Estados de Reagendamento
  const [rescheduleApt, setRescheduleApt] = useState<any | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState("");
  const [newRescheduleTime, setNewRescheduleTime] = useState("");
  const [rescheduleAvailableTimes, setRescheduleAvailableTimes] = useState<string[]>([]);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);
  const [rescheduleFeedback, setRescheduleFeedback] = useState<{ type: "success" | "error"; msg: string; whatsappUrl?: string } | null>(null);

  // Estados de Cancelamento
  const [cancellingAptId, setCancellingAptId] = useState<string | null>(null);
  const [cancelFeedback, setCancelFeedback] = useState<{ type: "success" | "error"; msg: string; whatsappUrl?: string } | null>(null);

  // Modal Oficial de Confirmação & WhatsApp (para Reagendamento e Cancelamento)
  const [actionSuccessModal, setActionSuccessModal] = useState<{
    type: "RESCHEDULE" | "CANCEL";
    title: string;
    description: string;
    serviceName?: string;
    barberName: string;
    barberPhone: string;
    date: string;
    time: string;
    whatsappUrl: string;
  } | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting("Bom dia");
    } else if (hour >= 12 && hour < 18) {
      setGreeting("Boa tarde");
    } else {
      setGreeting("Boa noite");
    }
  }, []);

  const [clientData, setClientData] = useState<{
    name: string;
    email: string;
    phone: string;
  }>({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    phone: (session?.user as any)?.phone || "",
  });

  // Redireciona para o login se não estiver autenticado, ou para o dashboard se for barbeiro/admin
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && (session?.user as any)?.role && (session?.user as any)?.role !== "CLIENT") {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user) {
      setClientData((prev) => ({
        name: session.user?.name || prev.name,
        email: session.user?.email || prev.email,
        phone: (session.user as any)?.phone || prev.phone,
      }));
    }
  }, [session]);

  const loadDashboardData = () => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        if (data.isClient) {
          if (data.client) {
            setClientData({
              name: data.client.name || "",
              email: data.client.email || "",
              phone: data.client.phone || "",
            });
          }
          if (data.appointments) {
            const sorted = data.appointments.sort(
              (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            setAppointments(sorted);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (status === "authenticated") {
      loadDashboardData();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  const clientName = clientData.name || session?.user?.name || "Cliente VIP";
  const clientPhone = clientData.phone || (session?.user as any)?.phone || "";
  const clientEmail = clientData.email || session?.user?.email || "";

  // Próximo agendamento futuro ativo
  const upcomingApt = appointments.find(
    (apt) => new Date(apt.date) >= new Date() && apt.status !== "CANCELLED" && apt.status !== "COMPLETED"
  );

  // Último agendamento concluído ou passado
  const lastApt = appointments.find(
    (apt) => new Date(apt.date) < new Date() || apt.status === "COMPLETED"
  ) || appointments[0];

  const handleRebook = () => {
    if (lastApt?.service?.id) {
      setSelectedServiceId(lastApt.service.id);
    } else {
      setSelectedServiceId(undefined);
    }
    setIsModalOpen(true);
  };

  const handleContactBarber = (barberPhone?: string, barberName?: string) => {
    const phone = barberPhone || BARBERS[0].phone;
    const name = barberName || BARBERS[0].name;
    const msg = `Olá, ${name}! Sou o ${clientName}, cliente do LAS Barber Studio. Gostaria de tirar uma dúvida sobre meu horário.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Carrega horários disponíveis para o modal de reagendamento
  useEffect(() => {
    if (rescheduleApt && newRescheduleDate) {
      const dayStatus = checkDayStatus(newRescheduleDate);
      if (dayStatus.isClosed) {
        setRescheduleAvailableTimes([]);
        setNewRescheduleTime("");
        return;
      }

      const barberId = rescheduleApt.barberId || rescheduleApt.barber?.id || "barbeiro-lucas";
      fetch(`/api/appointments/available?date=${newRescheduleDate}&barberId=${barberId}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.availableTimes)) {
            setRescheduleAvailableTimes(data.availableTimes);
          } else {
            setRescheduleAvailableTimes([]);
          }
        })
        .catch(() => setRescheduleAvailableTimes([]));
    }
  }, [rescheduleApt, newRescheduleDate]);

  // Ação de Cancelamento pelo Cliente (Regra dos 30 minutos)
  const handleClientCancel = async (apt: any) => {
    if (!confirm("Deseja realmente cancelar este agendamento?\n\n• Dentro de 30 minutos: o cancelamento é imediato e libera a vaga no sistema.\n• Após 30 minutos: será enviada uma solicitação para Lucas Augusto aprovar.")) {
      return;
    }

    setCancellingAptId(apt.id);
    try {
      const res = await fetch("/api/appointments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: apt.id }),
      });

      const data = await res.json();
      if (res.ok) {
        const barberName = apt.barber?.name || "Lucas Augusto";
        const barberPhone = apt.barber?.phone || BARBERS[0].phone;
        const aptDateStr = new Date(apt.date).toLocaleDateString("pt-BR");
        const aptTimeStr = getDisplayTime(apt.date);

        const isDirect = Boolean(data.directCancelled);
        const msg = isDirect
          ? `Olá, ${barberName}! Sou o ${clientName}. Cancelei meu agendamento de ${apt.service?.name || "serviço"} marcado para ${aptDateStr} às ${aptTimeStr} dentro do prazo de 30 min. O horário foi liberado no sistema!`
          : `Olá, ${barberName}! Sou o ${clientName}. Solicitei o cancelamento do meu agendamento de ${apt.service?.name || "serviço"} do dia ${aptDateStr} às ${aptTimeStr} no sistema do LAS Studio. Poderia aprovar, por favor?`;
        const whatsappUrl = `https://wa.me/${barberPhone}?text=${encodeURIComponent(msg)}`;

        setActionSuccessModal({
          type: "CANCEL",
          title: isDirect ? "Agendamento Cancelado!" : "Cancelamento Solicitado!",
          description: isDirect
            ? `Seu agendamento de ${apt.service?.name || "serviço"} foi cancelado com sucesso e a vaga foi liberada no estúdio.`
            : `Como já se passaram mais de 30 minutos do agendamento, sua solicitação foi enviada para Lucas Augusto confirmar.`,
          serviceName: apt.service?.name,
          barberName,
          barberPhone,
          date: aptDateStr,
          time: aptTimeStr,
          whatsappUrl,
        });
        loadDashboardData();
      } else {
        alert(data.error || "Erro ao processar o cancelamento.");
      }
    } catch (_) {
      alert("Falha de conexão ao cancelar agendamento.");
    } finally {
      setCancellingAptId(null);
    }
  };

  // Submissão do Reagendamento pelo Cliente
  const handleSubmitReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleApt || !newRescheduleDate || !newRescheduleTime) return;

    const dayStatus = checkDayStatus(newRescheduleDate);
    if (dayStatus.isClosed) {
      setRescheduleFeedback({
        type: "error",
        msg: dayStatus.reason || "Studio fechado neste dia (domingo ou feriado).",
      });
      return;
    }

    setIsSubmittingReschedule(true);
    setRescheduleFeedback(null);

    try {
      const res = await fetch("/api/appointments/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rescheduleApt.id,
          requestedDate: newRescheduleDate,
          requestedTime: newRescheduleTime,
          date: newRescheduleDate,
          time: newRescheduleTime,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const barberName = rescheduleApt.barber?.name || "Lucas Augusto";
        const barberPhone = rescheduleApt.barber?.phone || BARBERS[0].phone;
        const oldDateStr = new Date(rescheduleApt.date).toLocaleDateString("pt-BR");
        const oldTimeStr = getDisplayTime(rescheduleApt.date);
        const newDateParts = newRescheduleDate.split("-");
        const newDateFormatted = `${newDateParts[2]}/${newDateParts[1]}/${newDateParts[0]}`;

        const msg = `Olá, ${barberName}! Sou o ${clientName}. Solicitei o reagendamento do meu horário no LAS Barber Studio de ${oldDateStr} às ${oldTimeStr} para ${newDateFormatted} às ${newRescheduleTime}. Poderia confirmar para mim?`;
        const whatsappUrl = `https://wa.me/${barberPhone}?text=${encodeURIComponent(msg)}`;

        setActionSuccessModal({
          type: "RESCHEDULE",
          title: "Horário Alterado com Sucesso!",
          description: `Seu reagendamento de ${rescheduleApt.service?.name || "serviço"} para ${newDateFormatted} às ${newRescheduleTime} foi registrado com sucesso.`,
          serviceName: rescheduleApt.service?.name,
          barberName,
          barberPhone,
          date: newDateFormatted,
          time: newRescheduleTime,
          whatsappUrl,
        });
        setRescheduleApt(null);
        loadDashboardData();
      } else {
        setRescheduleFeedback({
          type: "error",
          msg: data.error || "Erro ao solicitar reagendamento.",
        });
      }
    } catch (_) {
      setRescheduleFeedback({
        type: "error",
        msg: "Falha de conexão ao solicitar reagendamento.",
      });
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const getStatusBadge = (aptStatus: string) => {
    switch (aptStatus) {
      case "COMPLETED":
        return <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Concluído</span>;
      case "CANCELLED":
        return <span className="text-[10px] bg-red-500/15 text-red-300 border border-red-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Cancelado</span>;
      case "RESCHEDULE_REQUESTED":
        return <span className="text-[10px] bg-[#DFBA73]/20 text-[#F5D799] border border-[#DFBA73]/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">Reagendamento Pendente</span>;
      case "CANCEL_REQUESTED":
        return <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">Cancelamento Solicitado</span>;
      default:
        return <span className="text-[10px] bg-[#DFBA73]/20 text-[#F5D799] border border-[#DFBA73]/40 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Confirmado</span>;
    }
  };

  const getMinDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#050608] text-white selection:bg-[#DFBA73] selection:text-black pb-20 relative overflow-hidden font-sans">
      
      {/* Luz ambiente dourada de alto padrão */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-[#DFBA73]/10 blur-[180px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 right-0 w-[500px] h-[400px] bg-[#B88B38]/5 blur-[160px] pointer-events-none rounded-full" />

      {/* ── HEADER DO CLIENTE ── */}
      <header className="border-b border-white/10 bg-[#080A0E]/90 sticky top-0 z-40 backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-[#DFBA73]/40 shrink-0 shadow-md">
              <Image
                src="/logo-las-gold.jpg"
                alt="LAS Studio Logo"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-[#DFBA73] font-bold font-mono">
                LAS BARBER STUDIO
              </p>
              <h1 className="text-lg font-serif text-white tracking-wide">{greeting}, {clientName}</h1>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-[#DFBA73]/15 text-[#F5D799] border border-[#DFBA73]/40 shadow-sm font-mono">
              <Crown className="w-3 h-3 text-[#DFBA73]" /> Cliente VIP
            </span>

            {/* BOTÃO VOLTAR AO SITE */}
            <Link
              href="/"
              className="text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
              title="Voltar para o site sem encerrar a sessão"
            >
              <Home className="w-4 h-4 text-[#DFBA73]" />
              <span className="hidden xs:inline">Site</span>
            </Link>

            {/* BOTÃO SAIR (LOGOUT) */}
            <button
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                  await signOut({ redirect: false });
                } catch (_) {}
                window.location.href = "/api/auth/logout";
              }}
              className="text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider p-2 rounded-xl hover:bg-white/5 cursor-pointer"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline">Desconectar</span>
            </button>
          </div>
        </div>
      </header>

      {/* BANNER CELEBRATÓRIO NOVO AGENDAMENTO VIP */}
      {newBookingBanner && (
        <div className="max-w-5xl mx-auto px-6 pt-6 relative z-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="p-5 rounded-3xl bg-gradient-to-r from-[#DFBA73]/20 via-[#DFBA73]/10 to-transparent border border-[#DFBA73]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#DFBA73] text-black flex items-center justify-center shrink-0 font-bold shadow-lg shadow-[#DFBA73]/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-serif font-bold text-white flex items-center gap-2">
                  Agendamento Confirmado com Sucesso!
                </h3>
                <p className="text-xs text-gray-300 font-light mt-0.5">
                  Bem-vindo ao seu Painel VIP! Seu horário já está garantido na agenda oficial de Lucas Augusto.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
              {upcomingApt && (
                <a
                  href={`https://wa.me/5569993783204?text=${encodeURIComponent(`Olá, Lucas! Sou ${clientName}. Meu agendamento para o dia ${new Date(upcomingApt.date).toLocaleDateString("pt-BR")} às ${getDisplayTime(upcomingApt.date)} já está garantido no painel!`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#25D366] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#128C7E] transition-all shadow-md shadow-[#25D366]/20 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" /> Notificar Lucas no WhatsApp
                </a>
              )}
              <button
                onClick={() => setNewBookingBanner(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK DE CANCELAMENTO */}
      {cancelFeedback && (
        <div className="max-w-5xl mx-auto px-6 pt-6 relative z-10">
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            cancelFeedback.type === "success" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200" : "bg-red-500/15 border-red-500/30 text-red-200"
          }`}>
            <div className="flex items-center gap-3">
              {cancelFeedback.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
              <p className="text-xs font-medium">{cancelFeedback.msg}</p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {cancelFeedback.whatsappUrl && (
                <a
                  href={cancelFeedback.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#25D366] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#128C7E] transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Notificar no WhatsApp
                </a>
              )}
              <button
                onClick={() => setCancelFeedback(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-7 relative z-10">
        {loading ? (
          <div className="py-24 text-center text-[#DFBA73] animate-pulse font-serif text-lg tracking-widest uppercase">
            Carregando seus dados...
          </div>
        ) : (
          <>
            {/* ── CARD 1: PERFIL DO CLIENTE VIP ── */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#080A0E] border border-[#DFBA73]/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#DFBA73]/5 blur-3xl pointer-events-none rounded-full" />
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#DFBA73]/25 to-[#B88B38]/10 border-2 border-[#DFBA73]/50 flex items-center justify-center text-[#F5D799] font-serif text-2xl font-bold shadow-lg shadow-[#DFBA73]/10 shrink-0">
                  {clientName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-serif text-white">{clientName}</h2>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                      Conta Ativa
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono">
                    <span>WhatsApp: <strong className="text-white">{clientPhone || "Cadastrado"}</strong></span>
                    {clientEmail && <span>· E-mail: <strong className="text-white">{clientEmail}</strong></span>}
                  </p>
                  <p className="text-[11px] text-[#DFBA73]/90 mt-1 font-light">
                    Atendimento exclusivo individualizado com Master Barber Lucas Augusto
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedServiceId(undefined);
                  setIsModalOpen(true);
                }}
                className="w-full sm:w-auto bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black hover:brightness-110 px-6 py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2.5 transition-all duration-300 shadow-lg shadow-[#DFBA73]/25 shrink-0 cursor-pointer relative z-10"
              >
                <Sparkles className="w-4 h-4" /> + Novo Agendamento
              </button>
            </motion.div>

            {/* ── CARD 2: PRÓXIMO HORÁRIO DE SERVIÇO COM FOTO DO BARBEIRO ── */}
            {upcomingApt && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#DFBA73]/15 via-[#080A0E] to-[#050608] border-2 border-[#DFBA73]/50 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                  <div className="flex items-start gap-4">
                    {/* Foto de Lucas Augusto */}
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#DFBA73] shadow-md shadow-[#DFBA73]/20 shrink-0 hidden sm:block">
                      <Image
                        src="/barbers/lucas-augusto.jpg"
                        alt="Lucas Augusto"
                        fill
                        className="object-cover object-top"
                        sizes="64px"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#DFBA73] animate-ping" />
                        <span className="text-xs font-bold uppercase tracking-widest text-[#F5D799] font-mono">
                          Seu Próximo Horário Confirmado
                        </span>
                        {getStatusBadge(upcomingApt.status)}
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-serif text-white mb-2">
                        {upcomingApt.service?.name} · R$ {upcomingApt.service?.price}
                      </h3>

                      <p className="text-sm text-gray-200 flex items-center gap-2 font-mono">
                        <Clock className="w-4 h-4 text-[#DFBA73]" />
                        <strong>
                          {new Date(upcomingApt.date).toLocaleDateString("pt-BR")} às {getDisplayTime(upcomingApt.date)}
                        </strong>
                      </p>

                      <p className="text-xs text-gray-300 mt-2">
                        Barbeiro responsável: <strong className="text-white">{upcomingApt.barber?.name || "Lucas Augusto (Master Barber)"}</strong> ·{" "}
                        <a
                          href="https://www.google.com/maps/search/?api=1&query=Rua+dos+Yp%C3%AAs,+365E+-+Centro"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#DFBA73] hover:text-white underline transition-colors"
                          title="Abrir localização do studio no Google Maps"
                        >
                          Rua dos Ypês, Nº 365E — Centro (Ver no Mapa)
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                    <button
                      onClick={() => handleContactBarber(upcomingApt.barber?.phone, upcomingApt.barber?.name)}
                      className="bg-[#25D366] text-white px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#128C7E] transition-all cursor-pointer shadow-md"
                    >
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </button>

                    <button
                      onClick={() => {
                        setRescheduleApt(upcomingApt);
                        setNewRescheduleDate("");
                        setNewRescheduleTime("");
                        setRescheduleFeedback(null);
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-white/10 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 text-[#DFBA73]" /> Reagendar
                    </button>

                    <button
                      onClick={() => handleClientCancel(upcomingApt)}
                      disabled={cancellingAptId === upcomingApt.id}
                      className="bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── CARD 3: OPÇÃO DE REPETIR ÚLTIMO CORTE COM LUCAS AUGUSTO ── */}
            {lastApt && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#080A0E] border border-white/10 hover:border-[#DFBA73]/40 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden transition-all shadow-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-[#DFBA73]/40 shadow-md shrink-0 hidden sm:block">
                    <Image
                      src="/barbers/lucas-augusto.jpg"
                      alt="Lucas Augusto"
                      fill
                      className="object-cover object-top"
                      sizes="56px"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#DFBA73] font-bold font-mono">
                      Último Atendimento no Studio
                    </span>
                    <h3 className="text-xl sm:text-2xl font-serif text-white mt-1">
                      Deseja repetir o mesmo corte?
                    </h3>
                    <p className="text-xs text-gray-300 mt-1 max-w-lg leading-relaxed">
                      Você fez <strong className="text-white">{lastApt.service?.name}</strong> com <strong className="text-[#F5D799]">{lastApt.barber?.name || "Lucas Augusto"}</strong> no dia {new Date(lastApt.date).toLocaleDateString("pt-BR")}. Escolha a nova data e horário para confirmar.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRebook}
                  className="w-full md:w-auto bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black hover:brightness-110 px-6 py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all duration-300 shadow-md shrink-0 hover:scale-[1.02] cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Remarcar Último Serviço
                </button>
              </motion.div>
            )}

            {/* ── CARD 4: REGISTRO / HISTÓRICO DE SERVIÇOS ── */}
            <div className="bg-[#080A0E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-xl font-serif text-white">Registro de Serviços & Histórico</h3>
                  <p className="text-xs text-gray-400 font-light mt-0.5">
                    Seus atendimentos anteriores no LAS Barber Studio.
                  </p>
                </div>
                <span className="text-xs font-mono text-[#DFBA73] px-3 py-1 rounded-full bg-[#DFBA73]/10 border border-[#DFBA73]/30">
                  {appointments.length} {appointments.length === 1 ? "registro" : "registros"}
                </span>
              </div>

              {appointments.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-sm">
                  Nenhum corte registrado ainda. Faça seu primeiro agendamento exclusivo acima!
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((apt: any) => {
                    const isUpcoming = new Date(apt.date) >= new Date() && apt.status !== "CANCELLED" && apt.status !== "COMPLETED";

                    return (
                      <div
                        key={apt.id}
                        className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#DFBA73]/30 transition-all"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-[#DFBA73]/15 border border-[#DFBA73]/30 flex items-center justify-center text-[#DFBA73] shrink-0">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base font-serif text-white">{apt.service?.name}</h4>
                              {getStatusBadge(apt.status)}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Barbeiro: <strong className="text-gray-300">{apt.barber?.name || "Lucas Augusto (Master Barber)"}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 sm:gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-white/5">
                          <div className="text-left md:text-right">
                            <p className="text-[#DFBA73] font-mono text-sm font-bold">
                              R$ {apt.service?.price}
                            </p>
                            <p className="text-xs text-gray-300 font-mono">
                              {new Date(apt.date).toLocaleDateString("pt-BR")} às {getDisplayTime(apt.date)}
                            </p>
                          </div>

                          {isUpcoming && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setRescheduleApt(apt);
                                  setNewRescheduleDate("");
                                  setNewRescheduleTime("");
                                  setRescheduleFeedback(null);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Reagendar este horário"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-[#DFBA73]" /> Reagendar
                              </button>

                              <button
                                onClick={() => handleClientCancel(apt)}
                                disabled={cancellingAptId === apt.id}
                                className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                                title="Cancelar agendamento"
                              >
                                <X className="w-3.5 h-3.5" /> Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ── MODAL DE REAGENDAMENTO DO CLIENTE ── */}
      <AnimatePresence>
        {rescheduleApt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRescheduleApt(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#080A0E] border border-[#DFBA73]/40 rounded-3xl p-6 sm:p-8 z-10 shadow-2xl max-h-[90vh] overflow-y-auto text-white"
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#DFBA73] font-bold font-mono">
                    Solicitar Reagendamento
                  </p>
                  <h3 className="text-xl font-serif text-white mt-0.5">
                    {rescheduleApt.service?.name}
                  </h3>
                </div>
                <button
                  onClick={() => setRescheduleApt(null)}
                  className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-4 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs space-y-1">
                <p className="text-gray-400">
                  Horário atual: <strong className="text-white">{new Date(rescheduleApt.date).toLocaleDateString("pt-BR")} às {getDisplayTime(rescheduleApt.date)}</strong>
                </p>
                <p className="text-gray-400">
                  Barbeiro: <strong className="text-white">{rescheduleApt.barber?.name || "Lucas Augusto"}</strong>
                </p>
                <p className="text-[11px] text-[#F5D799] pt-1">
                  💡 A solicitação será atualizada e você poderá notificar Lucas no WhatsApp com 1 clique.
                </p>
              </div>

              {rescheduleFeedback && (
                <div className={`p-4 rounded-xl border mb-4 text-xs space-y-2 ${
                  rescheduleFeedback.type === "success" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200" : "bg-red-500/15 border-red-500/30 text-red-200"
                }`}>
                  <p className="font-semibold">{rescheduleFeedback.msg}</p>
                  {rescheduleFeedback.whatsappUrl && (
                    <a
                      href={rescheduleFeedback.whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-[#25D366] text-white px-3 py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-[#128C7E] transition-all"
                    >
                      <MessageCircle className="w-4 h-4" /> Notificar Lucas no WhatsApp
                    </a>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmitReschedule} className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-xs uppercase tracking-wider mb-2 font-medium flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-[#DFBA73]" /> Nova Data
                  </label>
                  <input
                    type="date"
                    min={getMinDateStr()}
                    value={newRescheduleDate}
                    onChange={(e) => setNewRescheduleDate(e.target.value)}
                    required
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:border-[#DFBA73] focus:outline-none transition-colors [&::-webkit-calendar-picker-indicator]:invert"
                  />
                  {newRescheduleDate && checkDayStatus(newRescheduleDate).isClosed && (
                    <p className="text-[#DFBA73] text-xs mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {checkDayStatus(newRescheduleDate).reason}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 text-xs uppercase tracking-wider mb-2 font-medium flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-[#DFBA73]" /> Novo Horário
                  </label>
                  {!newRescheduleDate ? (
                    <p className="text-xs text-gray-500 italic py-4 text-center border border-dashed border-white/10 rounded-xl">
                      Selecione uma nova data acima para carregar os horários livres.
                    </p>
                  ) : checkDayStatus(newRescheduleDate).isClosed ? (
                    <p className="text-xs text-[#DFBA73] italic py-4 text-center border border-dashed border-[#DFBA73]/30 rounded-xl bg-[#DFBA73]/5">
                      Studio fechado nesta data. Por favor, selecione outro dia.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                      {rescheduleAvailableTimes.length === 0 ? (
                        <p className="text-xs text-gray-500 col-span-3 py-4 text-center">
                          Nenhum horário disponível para esta data.
                        </p>
                      ) : (
                        rescheduleAvailableTimes.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setNewRescheduleTime(time)}
                            className={`py-2 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                              newRescheduleTime === time
                                ? "border-[#DFBA73] bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black shadow-md shadow-[#DFBA73]/20"
                                : "border-white/10 text-gray-300 hover:border-[#DFBA73]/40 bg-white/[0.02]"
                            }`}
                          >
                            {time}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setRescheduleApt(null)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white text-xs uppercase tracking-wider font-semibold hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={Boolean(isSubmittingReschedule || !newRescheduleDate || !newRescheduleTime || (newRescheduleDate ? checkDayStatus(newRescheduleDate).isClosed : false))}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-[#DFBA73]/20 cursor-pointer"
                  >
                    {isSubmittingReschedule ? "Enviando..." : "Confirmar Reagendamento"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL OFICIAL DE CONFIRMAÇÃO & NOTIFICAÇÃO NO WHATSAPP (IGUAL AO AGENDAMENTO) ── */}
      <AnimatePresence>
        {actionSuccessModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#050608]/90 backdrop-blur-xl"
              onClick={() => setActionSuccessModal(null)}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-[#080A0E] border border-[#DFBA73]/40 rounded-3xl p-6 sm:p-8 z-10 shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col items-center text-center text-white"
            >
              {/* Botão Fechar no Canto Superior */}
              <button
                type="button"
                onClick={() => setActionSuccessModal(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Ícone Animado com Efeito Dourado */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-[#DFBA73]/15 border-2 border-[#DFBA73] flex items-center justify-center mb-5 shadow-[0_0_35px_rgba(223,186,115,0.4)]"
              >
                <CheckCircle2 className="w-10 h-10 text-[#DFBA73]" />
              </motion.div>

              {/* Título & Mensagem */}
              <h3 className="text-2xl sm:text-3xl font-serif text-white mb-2 tracking-tight">
                {actionSuccessModal.title}
              </h3>
              <p className="text-gray-300 font-light text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
                {actionSuccessModal.description}
              </p>

              {/* Resumo do Atendimento */}
              <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center text-gray-400">
                  <span>Cliente:</span>
                  <strong className="text-white font-sans">{clientName}</strong>
                </div>
                {actionSuccessModal.serviceName && (
                  <div className="flex justify-between items-center text-gray-400">
                    <span>Serviço:</span>
                    <strong className="text-[#F5D799] font-sans">{actionSuccessModal.serviceName}</strong>
                  </div>
                )}
                <div className="flex justify-between items-center text-gray-400">
                  <span>Profissional:</span>
                  <strong className="text-white font-sans">{actionSuccessModal.barberName}</strong>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>Data & Horário:</span>
                  <strong className="text-[#DFBA73]">{actionSuccessModal.date} às {actionSuccessModal.time}</strong>
                </div>
              </div>

              {/* Card de Envio Oficial no WhatsApp de Lucas Augusto */}
              <div className="w-full bg-white/[0.03] border border-[#25D366]/40 rounded-2xl p-5 mb-6 text-left shadow-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[#25D366] animate-pulse" />
                  <p className="text-xs font-semibold text-[#25D366] uppercase tracking-wider font-mono">
                    Notificar Lucas Augusto no WhatsApp
                  </p>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed mb-4">
                  Toque no botão abaixo para enviar a confirmação instantânea diretamente no WhatsApp oficial de <strong>{actionSuccessModal.barberName}</strong>:
                </p>
                <a
                  href={actionSuccessModal.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 font-mono active:scale-[0.98] cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" /> Enviar Mensagem no WhatsApp
                </a>
              </div>

              {/* Botão Concluir & Fechar */}
              <button
                type="button"
                onClick={() => setActionSuccessModal(null)}
                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono uppercase tracking-wider transition-all cursor-pointer font-bold"
              >
                Concluir & Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          loadDashboardData();
        }}
        initialServiceId={selectedServiceId}
        initialUserData={clientData}
      />
    </div>
  );
}
