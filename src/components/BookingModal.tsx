"use client";

import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useSession, signIn } from "next-auth/react";
import { 
  X, 
  Calendar, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  User, 
  Sparkles, 
  Check, 
  Edit3, 
  AlertTriangle,
  Crown,
  ChevronLeft,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  CreditCard,
  Banknote,
  MessageCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { BARBERS, BarberData } from "@/lib/barbers";
import { OFFICIAL_SERVICES, ServiceItem } from "@/lib/services";
import { checkDayStatus } from "@/lib/holidays";

export default function BookingModal({ 
  isOpen, 
  onClose,
  initialServiceId,
  initialUserData,
}: { 
  isOpen: boolean; 
  onClose: () => void;
  initialServiceId?: string;
  initialUserData?: { name?: string; email?: string; phone?: string };
}) {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Passos: 1 = Escolha do Serviço, 2 = Escolha do Barbeiro, 3 = Data, Horário & Cadastro
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<ServiceItem[]>(OFFICIAL_SERVICES);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<BarberData>(BARBERS[0]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [dayClosedInfo, setDayClosedInfo] = useState<{ isClosed: boolean; reason: string | null } | null>(null);
  
  // Dados do Cliente para Agendamento & Criação Simultânea da Conta VIP
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("PIX");
  const [isEditingData, setIsEditingData] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const isLoggedIn = status === "authenticated" || !!initialUserData?.name || !!(session as any)?.user?.name;

  // Auto preenchimento quando cliente já estiver logado
  useEffect(() => {
    if (isOpen) {
      const u = session?.user as any;
      const effectiveName = initialUserData?.name || u?.name || "";
      const effectiveEmail = initialUserData?.email || u?.email || "";
      const effectivePhone = initialUserData?.phone || u?.phone || "";

      if (effectiveName) setClientName(effectiveName);
      if (effectiveEmail) setClientEmail(effectiveEmail);
      if (effectivePhone) setClientPhone(effectivePhone);
      setClientPassword("");
      setIsEditingData(false);
    }
  }, [isOpen, session, initialUserData]);

  // Inicialização e Reset ao Abrir
  useEffect(() => {
    if (isOpen) {
      setServices(OFFICIAL_SERVICES);
      setSelectedBarber(BARBERS[0]);
      
      if (initialServiceId) {
        const s = OFFICIAL_SERVICES.find(
          (d) => d.id === initialServiceId || d.name.toLowerCase() === initialServiceId.toLowerCase()
        );
        if (s) {
          setSelectedService(s);
          setStep(2); // Avança direto para o barbeiro
        } else {
          setStep(1);
          setSelectedService(null);
        }
      } else {
        setStep(1);
        setSelectedService(null);
      }

      setSelectedDate(getTodayStr());
      setSelectedTime("");
      setAvailableTimes([]);
      setDayClosedInfo(null);
      setIsSuccess(false);
      setErrorMsg("");
    }
  }, [isOpen, initialServiceId]);

  // Tecla Escape e bloqueio de scroll blindado para Mobile (evita rolar Landing Page de fundo)
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";
    document.documentElement.style.overscrollBehavior = "contain";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
      document.documentElement.style.overscrollBehavior = "";
    };
  }, [isOpen, onClose]);

  // Carrega horários disponíveis quando a data OU o barbeiro mudar
  useEffect(() => {
    if (!selectedDate || !isOpen) return;

    const dayCheck = checkDayStatus(selectedDate);
    if (dayCheck.isClosed) {
      setDayClosedInfo(dayCheck);
      setAvailableTimes([]);
      setSelectedTime("");
      return;
    }
    setDayClosedInfo(null);

    const now = new Date();
    const todayStr = getTodayStr();
    const nowTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const barberId = selectedBarber?.id || "barbeiro-lucas";
    fetch(`/api/appointments/available?date=${selectedDate}&barberId=${barberId}&t=${Date.now()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.isClosed) {
          setDayClosedInfo({ isClosed: true, reason: data.reason });
          setAvailableTimes([]);
          setSelectedTime("");
          return;
        }
        if (Array.isArray(data.availableTimes)) {
          let times = data.availableTimes;
          if (selectedDate === todayStr) {
            times = times.filter((t: string) => t > nowTimeStr);
          }
          setAvailableTimes(times);
          setSelectedTime((prev) => (times.includes(prev) ? prev : (times[0] || "")));
        } else {
          setAvailableTimes([]);
          setSelectedTime("");
        }
      })
      .catch((err) => {
        console.error("Erro ao buscar horários:", err);
        const [yStr, mStr, dStr] = selectedDate.split("-");
        const dateObj = new Date(Date.UTC(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10), 12, 0, 0));
        const isSaturday = dateObj.getUTCDay() === 6;
        const defaultHours = isSaturday
          ? ["08:30", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]
          : ["08:30", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
        if (selectedDate === todayStr) {
          setAvailableTimes(defaultHours.filter((t) => t > nowTimeStr));
        } else {
          setAvailableTimes(defaultHours);
        }
        setSelectedTime("");
      });
  }, [selectedDate, isOpen, selectedBarber?.id]);

  // Submissão do Agendamento + Criação da Conta VIP + Login Automático
  const handleBookingSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedService) {
      setErrorMsg("Por favor, selecione um serviço no Passo 1.");
      setStep(1);
      return;
    }

    if (!clientName.trim()) {
      setErrorMsg("Por favor, informe seu nome completo.");
      return;
    }

    if (!clientEmail.trim() || !clientEmail.includes("@")) {
      setErrorMsg("Por favor, informe um e-mail válido para cadastrar sua conta VIP e permitir recuperação de senha.");
      return;
    }

    const cleanPhone = clientPhone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg("Por favor, informe seu WhatsApp com DDD para contato.");
      return;
    }

    if (!isLoggedIn && !clientPassword.trim()) {
      setErrorMsg("Por favor, crie uma senha de acesso para sua conta VIP.");
      return;
    }

    if (!selectedDate || !selectedTime) {
      setErrorMsg("Por favor, selecione a data e o horário desejado.");
      return;
    }

    const dayCheck = checkDayStatus(selectedDate);
    if (dayCheck.isClosed) {
      setErrorMsg(dayCheck.reason || "O estúdio está fechado nesta data.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    const fullDate = `${selectedDate}T${selectedTime}:00-03:00`;
    const finalPassword = clientPassword.trim();

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          barberId: selectedBarber?.id || "barbeiro-lucas",
          date: fullDate,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim().toLowerCase(),
          clientPhone: cleanPhone,
          clientPassword: finalPassword,
          paymentMethod,
          isWalkIn: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Não foi possível confirmar o agendamento.");
      }

      setIsSuccess(true);
      setRedirectCountdown(3);

      // Autenticação imediata na conta criada
      const loginId = clientEmail.trim().toLowerCase() || cleanPhone;
      try {
        await signIn("credentials", {
          identifier: loginId,
          phone: loginId,
          password: finalPassword,
          redirect: false,
        });
      } catch (_) {}
    } catch (err: any) {
      setErrorMsg(err.message || "Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Timer de Redirecionamento Automático para o Painel VIP
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      window.location.href = "/painel-cliente?newBooking=1";
      return;
    }
    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [redirectCountdown]);

  const handleGoToVipPanel = async () => {
    setIsRedirecting(true);
    try {
      const cleanPhone = clientPhone.replace(/\D/g, "");
      const loginId = clientEmail.trim().toLowerCase() || cleanPhone;
      await signIn("credentials", {
        identifier: loginId,
        phone: loginId,
        password: clientPassword.trim(),
        redirect: false,
      });
    } catch (_) {}
    window.location.href = "/painel-cliente?newBooking=1";
  };

  const handleNotifyWhatsappAndRedirect = () => {
    try {
      window.open(whatsappUrl, "_blank");
    } catch (_) {}
    setIsRedirecting(true);
    setTimeout(() => {
      window.location.href = "/painel-cliente?newBooking=1";
    }, 600);
  };

  const dateFormatted = selectedDate ? selectedDate.split("-").reverse().join("/") : "";
  const whatsappMsg = `Olá, Lucas! Acabei de agendar um ${selectedService?.name || "serviço"} (R$ ${selectedService?.price}) no LAS Barber Studio para o dia ${dateFormatted} às ${selectedTime}.\n\nMeus dados:\nNome: ${clientName}\nE-mail: ${clientEmail}\nWhatsApp: ${clientPhone}\nForma de Pagamento: ${paymentMethod}\n\nPoderia me confirmar?`;
  const whatsappUrl = `https://wa.me/${selectedBarber?.phone || "5569993783204"}?text=${encodeURIComponent(whatsappMsg)}`;

  // CRÍTICO: Se o modal NÃO estiver aberto ou não estiver montado no browser, NÃO RENDERIZA NADA!
  if (!isOpen) return null;
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center p-2.5 sm:p-4 overflow-hidden overscroll-contain"
      style={{ overscrollBehavior: "contain" }}
    >
      {/* Backdrop luxuoso com blur que fecha ao clicar */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#050608]/90 backdrop-blur-xl"
        onClick={onClose}
      />
      
      {/* Container Principal do Modal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl bg-[#080A0E] border border-[#DFBA73]/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 z-10 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_30px_rgba(223,186,115,0.15)] max-h-[94vh] flex flex-col overflow-hidden text-white overscroll-contain"
        style={{ overscrollBehavior: "contain", touchAction: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow dourado ambiente sutil (GPU otimizado) */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle,_rgba(223,186,115,0.12)_0%,_transparent_70%)] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-[radial-gradient(circle,_rgba(184,139,56,0.10)_0%,_transparent_70%)] pointer-events-none rounded-full" />

        {/* Header do Modal com Logo e Botão Fechar */}
        <div className="flex justify-between items-center pb-4 border-b border-white/10 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#DFBA73]/50 shrink-0 shadow-lg shadow-[#DFBA73]/20">
              <Image
                src="/brand/logo-square-512.png"
                alt="LAS Barber Studio"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#DFBA73] font-mono font-bold flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-[#DFBA73]" />
                Atendimento Privativo 1 a 1
              </p>
              <h2 className="text-xl md:text-2xl font-serif text-white tracking-tight">
                Agendamento Online • LAS Studio
              </h2>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper (Passos 1, 2 e 3) */}
        {!isSuccess && (
          <div className="flex items-center gap-2 pb-3 pt-3 border-b border-white/5 shrink-0 text-xs font-mono relative z-10 overflow-x-auto">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap ${
                step === 1 
                  ? "bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black shadow-md font-bold shadow-[#DFBA73]/20" 
                  : selectedService 
                  ? "bg-white/10 text-white hover:text-[#F5D799]" 
                  : "text-gray-500"
              }`}
            >
              1. Ritual
            </button>
            <span className="text-gray-600">→</span>
            <button
              type="button"
              onClick={() => { if (selectedService) setStep(2); }}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap ${
                step === 2 
                  ? "bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black shadow-md font-bold shadow-[#DFBA73]/20" 
                  : selectedBarber 
                  ? "bg-white/10 text-white hover:text-[#F5D799]" 
                  : "text-gray-500"
              }`}
            >
              2. Barbeiro
            </button>
            <span className="text-gray-600">→</span>
            <button
              type="button"
              onClick={() => { if (selectedService && selectedBarber) setStep(3); }}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap ${
                step === 3 
                  ? "bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black shadow-md font-bold shadow-[#DFBA73]/20" 
                  : "text-gray-500"
              }`}
            >
              3. Data, Horário & Cadastro
            </button>
          </div>
        )}

        {/* Conteúdo Central com Scroll (Blindado contra scroll de fundo no mobile) */}
        <div 
          className="py-4 overflow-y-auto flex-1 pr-1 scrollbar-hide relative z-10 overscroll-contain"
          style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        >
          {isSuccess ? (
            /* TELA DE SUCESSO & BOAS-VINDAS À CONTA VIP */
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                <CheckCircle2 className="w-20 h-20 text-[#DFBA73] mb-4 drop-shadow-[0_0_25px_rgba(223,186,115,0.6)]" />
              </motion.div>
              <h3 className="text-3xl font-serif text-white mb-2">Tudo Pronto, {clientName}!</h3>
              <p className="text-gray-300 font-light max-w-lg text-sm mb-2 leading-relaxed">
                Seu horário para <strong className="text-[#F5D799]">{selectedService?.name}</strong> foi reservado com <strong className="text-white">{selectedBarber.name}</strong> para o dia <strong className="text-[#F5D799]">{dateFormatted}</strong> às <strong className="text-[#F5D799]">{selectedTime}</strong>.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-xs font-mono mb-3">
                <span className="text-gray-400">Pagamento:</span>
                <strong className="text-[#25D366]">{paymentMethod}</strong>
              </div>

              {/* Banner de Redirecionamento Automático para o Painel VIP */}
              <div className="w-full max-w-md bg-white/[0.04] border border-[#DFBA73]/30 rounded-2xl p-4 mb-4 text-center shadow-lg">
                <p className="text-xs text-[#F5D799] font-mono font-semibold flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Redirecionando para seu Painel VIP em {redirectCountdown ?? 1}s...
                </p>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <motion.div 
                    initial={{ width: "0%" }} 
                    animate={{ width: "100%" }} 
                    transition={{ duration: 3, ease: "linear" }}
                    className="h-full bg-gradient-to-r from-[#DFBA73] via-[#F5D799] to-[#DFBA73]" 
                  />
                </div>
              </div>

              <div className="w-full max-w-md bg-white/[0.03] border border-[#DFBA73]/30 rounded-2xl p-4 mb-5 text-left shadow-lg">
                <p className="text-[11px] font-mono uppercase tracking-widest text-[#DFBA73] font-bold mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#DFBA73]" /> Sua Conta VIP de Acesso
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Login / Usuário:</span>
                    <strong className="text-white break-all">{clientEmail || clientPhone}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Senha de Acesso:</span>
                    <strong className="text-[#F5D799]">{clientPassword ? "••••••••" : "Cadastrada com sucesso"}</strong>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 font-mono mt-2 pt-2 border-t border-white/5">
                  ✓ Você já pode fazer login no painel a qualquer momento com estes dados.
                </p>
              </div>

              {/* Card de Envio Oficial no WhatsApp de Lucas Augusto */}
              <div className="w-full max-w-md bg-white/[0.03] border border-[#25D366]/40 rounded-2xl p-5 mb-5 text-left shadow-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[#25D366] animate-pulse" />
                  <p className="text-xs font-semibold text-[#25D366] uppercase tracking-wider font-mono">
                    Notificar Lucas Augusto no WhatsApp
                  </p>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  Toque no botão abaixo para confirmar diretamente no WhatsApp de <strong>{selectedBarber.name}</strong> ({selectedBarber.phoneDisplay}):
                </p>
                <button 
                  type="button"
                  onClick={handleNotifyWhatsappAndRedirect}
                  className="w-full bg-[#25D366] text-white py-3.5 px-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-[#128C7E] transition-all duration-300 shadow-lg shadow-[#25D366]/20 hover:scale-[1.02] cursor-pointer"
                >
                  <span>Enviar para WhatsApp de Lucas</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Botão Acessar Painel VIP do Cliente */}
              <button
                type="button"
                onClick={handleGoToVipPanel}
                disabled={isRedirecting}
                className="w-full max-w-md bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black py-4 px-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:brightness-110 transition-all duration-300 shadow-xl shadow-[#DFBA73]/25 mb-3 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isRedirecting ? "Acessando seu painel VIP..." : "Ir para o Painel VIP Agora"}</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button 
                type="button"
                onClick={onClose} 
                className="text-gray-400 hover:text-white text-xs uppercase tracking-widest font-semibold transition-colors mt-2 cursor-pointer"
              >
                Fechar janela
              </button>
            </div>
          ) : (
            <>
              {/* STEP 1: ESCOLHA DO SERVIÇO / RITUAL */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-[#DFBA73] text-xs uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Passo 1: Selecione o Ritual Desejado
                    </p>
                    <span className="text-xs text-gray-400 font-mono">{services.length} opções exclusivas</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                    {services.map((s) => (
                      <div 
                        key={s.id} 
                        onClick={() => {
                          setSelectedService(s);
                          setStep(2); // Avança automaticamente para o barbeiro
                        }}
                        className={`p-3.5 border rounded-2xl cursor-pointer transition-all duration-300 flex items-center gap-3 ${
                          selectedService?.id === s.id 
                            ? "border-[#DFBA73] bg-[#DFBA73]/15 shadow-lg shadow-[#DFBA73]/15 ring-1 ring-[#DFBA73]/50" 
                            : "border-white/10 hover:border-[#DFBA73]/40 bg-white/[0.02] hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10">
                          <Image
                            src={s.image}
                            alt={s.name}
                            fill
                            className="object-cover object-center"
                            sizes="56px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-serif text-white truncate">{s.name}</h4>
                            {s.badge && (
                              <span className="text-[8px] bg-[#DFBA73]/20 text-[#F5D799] border border-[#DFBA73]/30 px-1.5 py-0.2 rounded font-bold uppercase">
                                {s.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{s.description}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{s.duration} minutos</p>
                        </div>
                        <span className="text-[#DFBA73] font-mono font-bold text-sm shrink-0">
                          R$ {s.price}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* STEP 2: ATENDIMENTO EXCLUSIVO COM LUCAS AUGUSTO */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <div className="flex justify-between items-baseline border-b border-white/5 pb-2">
                    <p className="text-[#DFBA73] text-xs uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Passo 2: Barbeiro Responsável
                    </p>
                    <span className="text-xs text-gray-400 font-light">
                      Ritual: <strong className="text-white">{selectedService?.name} (R$ {selectedService?.price})</strong>
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 font-light leading-relaxed">
                    Atendimento individualizado e privativo conduzido exclusivamente pelo Master Barber do Studio:
                  </p>

                  <div className="space-y-3">
                    {BARBERS.map((barber) => {
                      const isSelected = selectedBarber?.id === barber.id;

                      return (
                        <div
                          key={barber.id}
                          onClick={() => {
                            setSelectedBarber(barber);
                            setStep(3);
                          }}
                          className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center justify-between gap-4 ${
                            isSelected
                              ? "border-[#DFBA73] bg-gradient-to-r from-[#DFBA73]/20 via-[#080A0E] to-transparent ring-2 ring-[#DFBA73]/50 shadow-xl shadow-[#DFBA73]/20"
                              : "border-white/10 hover:border-[#DFBA73]/40 bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {/* FOTO OFICIAL DE LUCAS AUGUSTO */}
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-[#DFBA73] shadow-lg shadow-[#DFBA73]/25 shrink-0">
                              <Image
                                src={barber.avatar}
                                alt={barber.name}
                                fill
                                className="object-cover object-top"
                                sizes="80px"
                                priority
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-lg font-serif font-bold text-white">{barber.name}</h4>
                                <span className="text-[10px] bg-gradient-to-r from-[#F5D799] to-[#DFBA73] text-black px-2.5 py-0.5 rounded-full font-bold uppercase font-mono tracking-wider">
                                  Master Barber & Fundador
                                </span>
                              </div>
                              <p className="text-xs text-[#F5D799] font-medium font-mono">
                                {barber.specialty}
                              </p>
                              <p className="text-[11px] text-gray-400 font-light line-clamp-2">
                                {barber.bio}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-3.5 py-1.5 rounded-xl font-mono transition-all bg-[#DFBA73] text-black shadow-md shadow-[#DFBA73]/30">
                              ✓ Selecionado
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 flex items-center justify-between border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Voltar aos rituais
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold text-xs uppercase font-mono tracking-wider shadow-lg shadow-[#DFBA73]/25 hover:brightness-110 flex items-center gap-2 cursor-pointer"
                    >
                      <span>Continuar com {selectedBarber.name}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: DATA, HORÁRIO & CADASTRO DA CONTA VIP */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  {/* Resumo do Serviço e Barbeiro Escolhidos */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[#DFBA73]/30 flex items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#DFBA73]/50 shrink-0">
                        <Image
                          src={selectedBarber.avatar}
                          alt={selectedBarber.name}
                          fill
                          className="object-cover object-top"
                          sizes="48px"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-[#DFBA73] block font-bold">
                          Barbeiro & Ritual Selecionados
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {selectedService?.name} com {selectedBarber.name}
                        </span>
                        <span className="text-xs text-gray-400 font-mono block">
                          R$ {selectedService?.price} • {selectedService?.duration} min
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-xs text-[#DFBA73] hover:underline font-mono cursor-pointer"
                      >
                        Trocar barbeiro
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-[11px] text-gray-400 hover:text-white underline font-mono cursor-pointer"
                      >
                        Trocar ritual
                      </button>
                    </div>
                  </div>

                  {/* Formulário Duplo: Coluna 1 (Dados do Cliente) + Coluna 2 (Data & Horário) */}
                  <form onSubmit={handleBookingSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      
                      {/* COLUNA 1: DADOS DO CLIENTE / CRIAÇÃO DE CONTA VIP */}
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between pb-1">
                          <span className="text-xs font-mono uppercase tracking-widest text-[#DFBA73] font-bold flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> 
                            {isLoggedIn && !isEditingData ? "Sua Conta VIP" : "Seus Dados de Cadastro"}
                          </span>

                          {isLoggedIn && !isEditingData && (
                            <button
                              type="button"
                              onClick={() => setIsEditingData(true)}
                              className="text-xs text-[#DFBA73] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" /> Alterar
                            </button>
                          )}
                        </div>

                        {/* Se o cliente estiver logado e não estiver editando */}
                        {isLoggedIn && !isEditingData ? (
                          <div className="p-4 rounded-2xl bg-[#DFBA73]/10 border border-[#DFBA73]/30 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#F5D799] to-[#DFBA73] text-black flex items-center justify-center font-serif text-lg font-bold shadow-md">
                                {(clientName || "C")[0].toUpperCase()}
                              </div>
                              <div>
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                                  <Sparkles className="w-3 h-3" /> Conta VIP Conectada
                                </span>
                                <h4 className="text-white font-medium text-sm mt-0.5">{clientName || "Cliente VIP"}</h4>
                              </div>
                            </div>

                            <div className="space-y-1.5 text-xs text-gray-300 font-mono">
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-[#DFBA73]" />
                                <span>{clientPhone || "WhatsApp não informado"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-[#DFBA73]" />
                                <span className="truncate">{clientEmail || "E-mail não informado"}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Formulário Completo de Cadastro Simultâneo */
                          <div className="space-y-3">
                            <div>
                              <label className="text-[11px] font-mono text-gray-300 uppercase block mb-1">
                                Nome Completo *
                              </label>
                              <input
                                type="text"
                                required
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="Digite seu nome completo"
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-3.5 text-white text-base sm:text-xs font-mono focus:border-[#DFBA73] focus:outline-none transition-colors"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-mono text-gray-300 uppercase block mb-1">
                                Seu E-mail Oficial *
                                <span className="text-[9px] text-[#DFBA73] font-normal normal-case ml-1">(para login e recuperar senha)</span>
                              </label>
                              <input
                                type="email"
                                required
                                value={clientEmail}
                                onChange={(e) => setClientEmail(e.target.value)}
                                placeholder="Ex: seuemail@gmail.com"
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-3.5 text-white text-base sm:text-xs font-mono focus:border-[#DFBA73] focus:outline-none transition-colors"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-mono text-gray-300 uppercase block mb-1">
                                WhatsApp com DDD *
                                <span className="text-[9px] text-gray-400 font-normal normal-case ml-1">(confirmação)</span>
                              </label>
                              <input
                                type="tel"
                                required
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                placeholder="Ex: (69) 99378-3204"
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-3.5 text-white text-base sm:text-xs font-mono focus:border-[#DFBA73] focus:outline-none transition-colors"
                              />
                            </div>

                            {!isLoggedIn && (
                              <div>
                                <label className="text-[11px] font-mono text-gray-300 uppercase block mb-1 flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-[#DFBA73]" />
                                  <span>Senha de Acesso ao Painel *</span>
                                  <span className="text-[9px] text-gray-400 font-normal normal-case ml-1">(sua conta VIP)</span>
                                </label>
                                <input
                                  type="password"
                                  required
                                  value={clientPassword}
                                  onChange={(e) => setClientPassword(e.target.value)}
                                  placeholder="Crie sua senha de acesso"
                                  autoComplete="new-password"
                                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-3.5 text-white text-base sm:text-xs font-mono focus:border-[#DFBA73] focus:outline-none transition-colors"
                                />
                                <p className="text-[10px] text-gray-500 font-mono mt-1">
                                  Sua conta será criada automaticamente para você ver seus agendamentos no painel.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* COLUNA 2: DATA & HORÁRIO */}
                      <div className="space-y-3.5">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-mono uppercase tracking-widest text-[#DFBA73] font-bold flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" /> Data do Atendimento *
                            </label>

                            {/* Atalhos Rápidos Hoje / Amanhã */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedDate(getTodayStr())}
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                  selectedDate === getTodayStr()
                                    ? "bg-[#DFBA73] text-black border-[#DFBA73]"
                                    : "border-white/10 text-gray-400 hover:text-white"
                                }`}
                              >
                                Hoje
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedDate(getTomorrowStr())}
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                  selectedDate === getTomorrowStr()
                                    ? "bg-[#DFBA73] text-black border-[#DFBA73]"
                                    : "border-white/10 text-gray-400 hover:text-white"
                                }`}
                              >
                                Amanhã
                              </button>
                            </div>
                          </div>

                          <input
                            type="date"
                            required
                            min={getTodayStr()}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-3.5 text-white text-base sm:text-xs font-mono focus:border-[#DFBA73] focus:outline-none transition-colors [&::-webkit-calendar-picker-indicator]:invert"
                          />
                        </div>

                        {/* Aviso se Fechado / Feriado */}
                        {dayClosedInfo?.isClosed ? (
                          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-red-200">
                              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                              <span>Estúdio Fechado</span>
                            </div>
                            <p className="leading-relaxed">
                              {dayClosedInfo.reason || "Não funcionamos aos domingos e feriados."}
                            </p>
                          </div>
                        ) : (
                          /* Grade de Horários */
                          <div className="space-y-1.5">
                            <label className="text-xs font-mono uppercase tracking-widest text-[#DFBA73] font-bold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> Horários Livres de Lucas *
                            </label>

                            {!selectedDate ? (
                              <p className="text-xs text-gray-500 font-mono py-4 text-center border border-dashed border-white/10 rounded-xl">
                                Selecione uma data acima para visualizar a agenda.
                              </p>
                            ) : availableTimes.length === 0 ? (
                              <p className="text-xs text-gray-400 font-mono py-4 text-center border border-dashed border-white/10 rounded-xl">
                                Nenhum horário disponível nesta data. Escolha outro dia.
                              </p>
                            ) : (
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
                                {availableTimes.map((time) => {
                                  const isSelected = selectedTime === time;
                                  return (
                                    <button
                                      type="button"
                                      key={time}
                                      onClick={() => setSelectedTime(time)}
                                      className={`py-2 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                                        isSelected
                                          ? "border-[#DFBA73] bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black shadow-lg shadow-[#DFBA73]/25"
                                          : "border-white/10 text-gray-300 hover:border-[#DFBA73]/50 hover:bg-[#DFBA73]/10 bg-white/[0.02]"
                                      }`}
                                    >
                                      {time}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Forma de Pagamento */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <label className="text-xs font-mono uppercase tracking-widest text-[#DFBA73] font-bold flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" /> Forma de Pagamento no Estúdio *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: "PIX", label: "PIX" },
                          { id: "Cartão de Crédito", label: "Crédito" },
                          { id: "Cartão de Débito", label: "Débito" },
                          { id: "Dinheiro", label: "Dinheiro" },
                        ].map((m) => {
                          const isSelected = paymentMethod === m.id;
                          return (
                            <button
                              type="button"
                              key={m.id}
                              onClick={() => setPaymentMethod(m.id)}
                              className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                isSelected
                                  ? "border-[#DFBA73] bg-[#DFBA73]/20 text-[#F5D799] shadow-md shadow-[#DFBA73]/15 ring-1 ring-[#DFBA73]/50"
                                  : "border-white/10 text-gray-400 hover:border-white/20 bg-white/[0.02]"
                              }`}
                            >
                              <span>{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mensagem de Erro se houver */}
                    {errorMsg && (
                      <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs font-mono">
                        {errorMsg}
                      </div>
                    )}

                    {/* Botões do Rodapé de Confirmação */}
                    <div className="pt-2 flex items-center gap-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="py-3.5 px-5 rounded-xl border border-white/10 hover:border-white/30 text-gray-300 hover:text-white text-xs font-mono uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Voltar
                      </button>

                      <button
                        type="submit"
                        disabled={isLoading || !selectedService || !selectedDate || !selectedTime}
                        className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold text-xs uppercase font-mono tracking-widest transition-all duration-300 shadow-xl shadow-[#DFBA73]/25 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer hover:brightness-110"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isLoading ? "Confirmando Agendamento..." : "Confirmar Meu Horário VIP"}</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>

                    <p className="text-[10px] text-gray-500 text-center font-mono">
                      Seus dados estão protegidos conforme a LGPD e serão utilizados exclusivamente para gerenciar seu atendimento privativo.
                    </p>
                  </form>
                </motion.div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
