"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Clock, CheckCircle, User, Plus, X, Phone, MessageCircle, 
  Shield, ChevronRight, Edit3, AlertCircle, Check, RotateCcw, 
  Power, CheckCircle2, ArrowRight, Sparkles
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { BARBERS, BarberData } from '@/lib/barbers';
import { OFFICIAL_SERVICES, ServiceItem } from '@/lib/services';
import { getDisplayTime, parseBrazilDateTime } from '@/lib/timezone';
import { checkDayStatus } from '@/lib/holidays';
import { LunchBreakControl } from '@/components/LunchBreakControl';

export default function AgendaPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "ADMIN";
  const userBarberId = (session?.user as any)?.barberId;
  const userName = session?.user?.name || "Lucas Augusto";
  const isAdmin = userRole === "ADMIN";

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>("all");

  // Disponibilidade do Dono (Lucas Augusto) - persistida no Supabase PostgreSQL
  const [isOwnerAvailable, setIsOwnerAvailable] = useState(true);
  const [lunchBreak, setLunchBreak] = useState<string | null>(null);
  const [defaultLunchBreak, setDefaultLunchBreak] = useState<string | null>(null);
  const [isLunchBreakFixed, setIsLunchBreakFixed] = useState<boolean>(false);
  const [hasLunchDateOverride, setHasLunchDateOverride] = useState<boolean>(false);
  const [lunchBreakScope, setLunchBreakScope] = useState<"default" | "date">("default");
  const [isSavingLunch, setIsSavingLunch] = useState(false);
  const [isTogglingOwner, setIsTogglingOwner] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 5000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Modal Novo Agendamento (Balcão / Manual)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newServiceId, setNewServiceId] = useState(OFFICIAL_SERVICES[0].id);
  const [newBarberId, setNewBarberId] = useState("barbeiro-lucas");
  const [newTime, setNewTime] = useState("10:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createErrorMsg, setCreateErrorMsg] = useState("");

  // Modal Alterar / Editar Agendamento
  const [editingApt, setEditingApt] = useState<any | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editBarberId, setEditBarberId] = useState("barbeiro-lucas");
  const [editServiceId, setEditServiceId] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState("");
  const [editErrorMsg, setEditErrorMsg] = useState("");

  // Modal de Cancelamento por Imprevisto com Notificação WhatsApp
  const [cancellingApt, setCancellingApt] = useState<any | null>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState<"imprevisto" | "ajuste" | "cliente">("imprevisto");
  const [customCancelMsg, setCustomCancelMsg] = useState("");
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);
  const [cancelSuccessWhatsappUrl, setCancelSuccessWhatsappUrl] = useState<string | null>(null);

  const getCancelMessage = (apt: any, preset: "imprevisto" | "ajuste" | "cliente") => {
    const barberName = BARBERS.find(b => b.id === apt.barberId)?.name.split(" ")[0] || "Lucas";
    const aptTime = getDisplayTime(apt.date);
    const aptDate = apt.date ? apt.date.substring(0, 10).split("-").reverse().join("/") : selectedDate.split("-").reverse().join("/");
    const clientName = apt.user?.name || "Cliente";

    if (preset === "imprevisto") {
      return `Olá, ${clientName}! Sou o ${barberName} da LAS Barber Studio. Tive um imprevisto urgente hoje e precisei cancelar o seu horário das ${aptTime} (${aptDate}). Peço sinceras desculpas pelo ocorrido! Poderíamos reagendar para um outro horário ou dia que fique bom para você?`;
    } else if (preset === "ajuste") {
      return `Olá, ${clientName}! Informamos que seu horário das ${aptTime} (${aptDate}) na LAS Barber Studio precisou ser cancelado para ajuste da nossa escala de atendimento. O horário já está liberado caso queira remarcar pelo site ou por aqui!`;
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

  // Carrega status de disponibilidade do barbeiro para a data selecionada
  useEffect(() => {
    fetch(`/api/barbers?date=${selectedDate}&t=${Date.now()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.barbers || []);
        const owner = list.find((b: any) => b.id === "barbeiro-lucas" || b.id === "barbeiro-dono");
        if (owner) {
          setIsOwnerAvailable(owner.isAvailable !== false);
          setLunchBreak(owner.lunchBreakTime || null);
          setDefaultLunchBreak(owner.defaultLunchBreakTime || null);
          setIsLunchBreakFixed(Boolean(owner.isLunchBreakFixed));
          setHasLunchDateOverride(Boolean(owner.hasLunchDateOverride));
          setLunchBreakScope(owner.hasLunchDateOverride ? "date" : "default");
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
          ? `Studio ABERTO em ${formattedDate} (salvo no banco).`
          : `Studio FECHADO em ${formattedDate} (salvo no banco).`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTogglingOwner(false);
    }
  };

  const handleSetLunchBreak = async (
    time: string | null,
    scope: "default" | "date" = lunchBreakScope
  ) => {
    const formattedDate = selectedDate.split("-").reverse().join("/");
    setIsSavingLunch(true);
    try {
      const res = await fetch('/api/barbers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          barberId: "barbeiro-lucas", 
          date: selectedDate, 
          lunchBreakTime: time,
          lunchBreakScope: scope,
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLunchBreak(data.lunchBreakTime || null);
        setDefaultLunchBreak(data.defaultLunchBreakTime || null);
        setIsLunchBreakFixed(Boolean(data.isLunchBreakFixed));
        setHasLunchDateOverride(Boolean(data.hasLunchDateOverride));
        setLunchBreakScope(scope);

        if (scope === "default") {
          setToastMessage(
            time
              ? `Pausa para almoço FIXA ativada (${time}) para TODOS OS DIAS e salva no banco.`
              : `Pausa para almoço fixa removida para todos os dias.`
          );
        } else {
          setToastMessage(
            time
              ? `Pausa para almoço (${time}) aplicada apenas em ${formattedDate}.`
              : `Pausa removida apenas em ${formattedDate} (padrão dos demais dias mantido).`
          );
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingLunch(false);
    }
  };

  // Carrega os agendamentos da data selecionada
  const fetchAgenda = async () => {
    setLoading(true);
    try {
      const barberParam = (isAdmin && selectedBarberFilter !== "all") ? `&barberId=${selectedBarberFilter}` : '';
      const res = await fetch(`/api/dashboard?date=${selectedDate}${barberParam}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error("Erro ao carregar agenda:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgenda();
  }, [selectedDate, selectedBarberFilter]);

  // Atualização de Status Rápido
  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/dashboard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      if (res.ok) fetchAgenda();
    } catch (e) {}
  };

  // Abrir Modal de Edição
  const openEditModal = (apt: any) => {
    setEditingApt(apt);
    const dayStr = apt.date ? apt.date.substring(0, 10) : selectedDate;
    setEditDate(dayStr);
    setEditTime(getDisplayTime(apt.date));
    setEditBarberId(apt.barberId || "barbeiro-lucas");
    setEditServiceId(apt.service?.id || OFFICIAL_SERVICES[0].id);
    setEditSuccessMsg("");
    setEditErrorMsg("");
  };

  // Salvar Edição do Agendamento pelo Dono
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApt) return;

    const dayCheck = checkDayStatus(editDate);
    if (dayCheck.isClosed) {
      setEditErrorMsg(dayCheck.reason);
      return;
    }

    setIsSavingEdit(true);
    setEditErrorMsg("");

    try {
      const res = await fetch('/api/dashboard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingApt.id,
          date: editDate,
          time: editTime,
          barberId: editBarberId,
          serviceId: editServiceId,
          status: 'CONFIRMED',
        })
      });

      if (res.ok) {
        setEditSuccessMsg("Horário alterado com sucesso! O novo horário já está registrado.");
        fetchAgenda();
        setTimeout(() => {
          setEditingApt(null);
        }, 1200);
      } else {
        const data = await res.json();
        setEditErrorMsg(data.error || "Erro ao salvar alterações.");
      }
    } catch (err: any) {
      setEditErrorMsg("Erro de comunicação ao salvar.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Aprovação / Recusa de Reagendamento solicitado pelo cliente
  const handleApproveReschedule = async (apt: any) => {
    try {
      const res = await fetch('/api/dashboard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: apt.id, action: "APPROVE_RESCHEDULE" })
      });
      if (res.ok) {
        fetchAgenda();
        if (apt.user?.phone) {
          const barberName = "Lucas Augusto";
          const newDateFormatted = apt.requestedDate ? apt.requestedDate.substring(0, 10).split("-").reverse().join("/") : "";
          const newTimeFormatted = apt.requestedDate ? getDisplayTime(apt.requestedDate) : "";
          const msg = `Olá, ${apt.user.name}! Aqui é o ${barberName} do LAS Barber Studio. Sua solicitação de reagendamento para o dia ${newDateFormatted} às ${newTimeFormatted} foi APROVADA com sucesso! Seu horário já está garantido. Te aguardo no estúdio!`;
          window.open(`https://wa.me/55${apt.user.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, '_blank');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectReschedule = async (apt: any) => {
    if (!confirm("Deseja recusar esta solicitação de reagendamento? O horário original será mantido.")) return;
    try {
      const res = await fetch('/api/dashboard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: apt.id, action: "REJECT_RESCHEDULE" })
      });
      if (res.ok) {
        fetchAgenda();
        if (apt.user?.phone) {
          const barberName = "Lucas Augusto";
          const originalDate = apt.date ? apt.date.substring(0, 10).split("-").reverse().join("/") : "";
          const originalTime = getDisplayTime(apt.date);
          const msg = `Olá, ${apt.user.name}! Aqui é o ${barberName} do LAS Barber Studio. Infelizmente não consegui liberar o novo horário solicitado para reagendamento. Seu horário original para o dia ${originalDate} às ${originalTime} continua ATIVO e confirmado! Se precisar de outro dia, me avise por aqui!`;
          window.open(`https://wa.me/55${apt.user.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, '_blank');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Criação de Agendamento Manual / Balcão
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCreateErrorMsg("");

    const dayCheck = checkDayStatus(selectedDate);
    if (dayCheck.isClosed) {
      setCreateErrorMsg(dayCheck.reason);
      setIsSubmitting(false);
      return;
    }

    const fullDate = `${selectedDate}T${newTime}:00-03:00`;

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: newServiceId,
          barberId: newBarberId || "barbeiro-lucas",
          date: fullDate,
          clientName: newClientName.trim() || "Cliente Balcão",
          clientEmail: newClientEmail.trim().toLowerCase() || null,
          clientPhone: newClientPhone.trim() || "69993783204",
          isWalkIn: true,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewClientName("");
        setNewClientEmail("");
        setNewClientPhone("");
        fetchAgenda();
      } else {
        const data = await res.json();
        setCreateErrorMsg(data.error || "Erro ao agendar.");
      }
    } catch (e) {
      setCreateErrorMsg("Erro de conexão ao criar agendamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBarberObj = BARBERS.find(b => b.id === (isAdmin ? selectedBarberFilter : userBarberId)) || BARBERS[0];
  const currentDayStatus = checkDayStatus(selectedDate);

  const pendingRequests = appointments.filter(
    (a) => a.status === "RESCHEDULE_REQUESTED" || a.status === "CANCEL_REQUESTED"
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      
      {/* ━━━ FEEDBACK VISUAL DE PERSISTÊNCIA ━━━ */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6 bg-[#0B0E14]/95 border border-[#DFBA73]/50 text-[#F5D799] px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl text-xs font-mono flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ━━━ BARRA DE CONTROLE DA AGENDA ━━━ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Shield className="w-3 h-3" /> Agenda Administrativa VIP
            </span>
          </div>
          <h2 className="text-3xl font-serif text-white tracking-tight">
            Agenda do Studio • Lucas Augusto
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Gestão privativa dos agendamentos, clientes e rituais do LAS Barber Studio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de data */}
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#080A0E] border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-[#DFBA73] transition-colors [&::-webkit-calendar-picker-indicator]:invert"
          />

          <button
            onClick={() => {
              setCreateErrorMsg("");
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold hover:brightness-110 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-[#DFBA73]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo Agendamento
          </button>
        </div>
      </div>

      {/* ━━━ CARD DO MASTER BARBER COM FOTO REAL DE LUCAS AUGUSTO ━━━ */}
      <div className="bg-gradient-to-r from-[#DFBA73]/15 via-white/[0.02] to-transparent border border-[#DFBA73]/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden border-2 border-[#DFBA73] shadow-lg shadow-[#DFBA73]/25 shrink-0">
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
              <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded font-bold bg-[#DFBA73]/20 text-[#F5D799] border border-[#DFBA73]/40">
                Master Barber & Fundador
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${isOwnerAvailable ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`} />
              {lunchBreak && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  🍽️ Almoço {isLunchBreakFixed ? "Fixo" : "neste dia"}: {lunchBreak} (travado)
                </span>
              )}
              {!lunchBreak && hasLunchDateOverride && defaultLunchBreak && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono bg-white/10 text-gray-300 border border-white/20">
                  Exceção: Sem almoço hoje (Fixo: {defaultLunchBreak})
                </span>
              )}
            </div>
            <h4 className="text-base sm:text-lg font-serif font-bold text-white mt-1">
              Lucas Augusto — LAS Barber Studio
            </h4>
            <p className="text-xs text-gray-300 font-light mt-0.5">
              {isOwnerAvailable
                ? "Atendimento Ativo: Clientes podem agendar horários online normalmente."
                : "Studio em Pausa / Folga: Novos agendamentos online suspensos temporariamente."}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Controle Pausa para Almoço (Fixo Diário ou Só na Data) */}
          <LunchBreakControl
            selectedDate={selectedDate}
            lunchBreak={lunchBreak}
            defaultLunchBreak={defaultLunchBreak}
            hasDateOverride={hasLunchDateOverride}
            scope={lunchBreakScope}
            saving={isSavingLunch}
            onScopeChange={setLunchBreakScope}
            onSelectTime={handleSetLunchBreak}
          />

          <button
            onClick={toggleOwnerAvailability}
            disabled={isTogglingOwner}
            className={`px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer ${
              isOwnerAvailable 
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black" 
                : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
          {isTogglingOwner ? (
            "Atualizando..."
          ) : isOwnerAvailable ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Studio Aberto (Ativo)</span>
            </>
          ) : (
            <>
              <Power className="w-4 h-4 text-gray-400" />
              <span>Studio Fechado (Pausa)</span>
            </>
          )}
        </button>
      </div>
      </div>

      {/* ━━━ ALERTA DE DOMINGO OU STUDIO FECHADO NA DATA SELECIONADA ━━━ */}
      {(currentDayStatus.isClosed || !isOwnerAvailable) && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="text-sm font-bold text-red-200 uppercase tracking-wider">
              {currentDayStatus.isSunday
                ? "Studio Fechado aos Domingos"
                : "Studio Fechado nesta Data"}
            </h4>
            <p className="text-xs text-red-300 mt-0.5">
              {currentDayStatus.isClosed
                ? currentDayStatus.reason
                : "O estúdio está marcado como fechado nesta data por Lucas Augusto."}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Clientes que acessarem o site nesta data verão o aviso oficial de fechamento.
            </p>
          </div>
        </div>
      )}

      {/* ━━━ SEÇÃO DE SOLICITAÇÕES PENDENTES DE CLIENTES ━━━ */}
      {pendingRequests.length > 0 && (
        <div className="bg-[#DFBA73]/10 border border-[#DFBA73]/30 rounded-3xl p-5 md:p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-[#DFBA73]">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-serif text-lg font-bold">
              Solicitações de Clientes Pendentes ({pendingRequests.length})
            </h3>
          </div>

          <div className="grid gap-3">
            {pendingRequests.map((apt) => {
              const isReschedule = apt.status === "RESCHEDULE_REQUESTED";
              const currentTime = getDisplayTime(apt.date);
              const requestedTime = apt.requestedDate ? getDisplayTime(apt.requestedDate) : "";
              const requestedDate = apt.requestedDate ? apt.requestedDate.substring(0, 10).split("-").reverse().join("/") : "";

              return (
                <div 
                  key={apt.id}
                  className="p-4 bg-[#080A0E] border border-[#DFBA73]/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isReschedule ? "bg-[#DFBA73]/20 text-[#F5D799] border border-[#DFBA73]/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}>
                        {isReschedule ? "📅 Solicitação de Reagendamento" : "❌ Solicitação de Cancelamento"}
                      </span>
                    </div>

                    <h4 className="text-white font-medium text-base">
                      {apt.user?.name || "Cliente"} — <span className="text-gray-400 text-sm">{apt.service?.name}</span>
                    </h4>

                    {isReschedule ? (
                      <p className="text-xs text-gray-300 mt-1">
                        Horário atual: <strong className="text-gray-400">{currentTime}</strong> → Novo horário solicitado: <strong className="text-[#F5D799]">{requestedDate} às {requestedTime}</strong>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-300 mt-1">
                        Cliente solicitou cancelamento do horário das <strong className="text-red-300">{currentTime}</strong>.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isReschedule ? (
                      <>
                        <button
                          onClick={() => handleApproveReschedule(apt)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5D799] to-[#DFBA73] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Check className="w-3.5 h-3.5" /> Aprovar Reagendamento
                        </button>
                        <button
                          onClick={() => handleRejectReschedule(apt)}
                          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-semibold cursor-pointer"
                        >
                          Recusar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => updateStatus(apt.id, 'CANCELLED')}
                        className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 font-bold text-xs uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                      >
                        Confirmar Cancelamento
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━ LISTA DE HORÁRIOS DA AGENDA ━━━ */}
      <div className="bg-[#080A0E] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
          <span className="text-sm font-serif text-gray-300">
            {selectedDate.split("-").reverse().join("/")} • {appointments.length} horários marcados
          </span>
          <span className="text-xs text-gray-500 font-mono">
            {appointments.filter(a => a.status === "COMPLETED").length} concluídos
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#DFBA73] animate-pulse font-mono text-sm">
            Carregando agenda do estúdio...
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-20 text-center text-gray-500 italic font-light">
            Nenhum atendimento agendado para esta data.
          </div>
        ) : (
          <div className="grid gap-3.5">
            {appointments.map((apt) => {
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
                    {/* Status do agendamento */}
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

                      {/* Contato direto no WhatsApp do cliente */}
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

                    {/* Ações do Barbeiro */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {apt.status !== 'CANCELLED' && (
                        <button
                          onClick={() => openEditModal(apt)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-[#DFBA73] hover:text-black border border-white/10 text-gray-300 text-xs font-medium transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                          title="Alterar data ou horário deste agendamento"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Alterar</span>
                        </button>
                      )}
                      
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
                          title="Cancelar atendimento e notificar no WhatsApp"
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

      {/* ━━━ MODAL: ALTERAR / EDITAR AGENDAMENTO ━━━ */}
      <AnimatePresence>
        {editingApt && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setEditingApt(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#080A0E] border border-[#DFBA73]/40 rounded-3xl p-6 z-10 shadow-2xl space-y-5 text-white"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-xl font-serif text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[#DFBA73]" /> Alterar Agendamento
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Cliente: <strong className="text-white">{editingApt.user?.name}</strong>
                  </p>
                </div>
                <button onClick={() => setEditingApt(null)} className="text-gray-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editSuccessMsg && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{editSuccessMsg}</span>
                </div>
              )}

              {editErrorMsg && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">
                    Data do Atendimento
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:border-[#DFBA73] focus:outline-none font-mono [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">
                    Horário
                  </label>
                  <input
                    type="time"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:border-[#DFBA73] focus:outline-none font-mono [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">
                    Ritual / Serviço
                  </label>
                  <select
                    value={editServiceId}
                    onChange={(e) => setEditServiceId(e.target.value)}
                    className="w-full bg-[#050608] border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:border-[#DFBA73] focus:outline-none font-mono"
                  >
                    {OFFICIAL_SERVICES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} - R$ {s.price}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="flex-1 py-3 bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold uppercase tracking-wider text-xs rounded-xl transition-all shadow-lg shadow-[#DFBA73]/20 cursor-pointer hover:brightness-110"
                  >
                    {isSavingEdit ? "Salvando..." : "Salvar Alteração"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingApt(null)}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ MODAL: NOVO AGENDAMENTO MANUAL / BALCÃO ━━━ */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#080A0E] border border-[#DFBA73]/40 rounded-3xl p-6 md:p-8 z-10 shadow-2xl max-h-[90vh] flex flex-col text-white"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10 shrink-0">
                <div>
                  <h3 className="text-2xl font-serif text-white">Agendar no Balcão</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Adicione um novo cliente na agenda do studio.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {createErrorMsg && (
                <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateAppointment} className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Nome do Cliente */}
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">
                    Nome do Cliente *
                  </label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ex: Carlos Eduardo"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:border-[#DFBA73] focus:outline-none font-mono"
                  />
                </div>

                {/* E-mail do Cliente */}
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">
                    E-mail do Cliente (opcional)
                  </label>
                  <input 
                    type="email" 
                    placeholder="Ex: cliente@email.com"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:border-[#DFBA73] focus:outline-none font-mono"
                  />
                </div>

                {/* Telefone / WhatsApp */}
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">
                    WhatsApp do Cliente *
                  </label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ex: (69) 99378-3204"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:border-[#DFBA73] focus:outline-none font-mono"
                  />
                </div>

                {/* Barbeiro Responsável com Foto de Lucas Augusto */}
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">
                    Barbeiro Atendente
                  </label>
                  <div className="p-3 bg-white/[0.03] border border-[#DFBA73]/30 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-[#DFBA73]/50 shrink-0">
                        <Image
                          src="/barbers/lucas-augusto.jpg"
                          alt="Lucas Augusto"
                          fill
                          className="object-cover object-top"
                        />
                      </div>
                      <div>
                        <h5 className="text-white text-sm font-medium">Lucas Augusto</h5>
                        <p className="text-[10px] text-[#DFBA73] font-mono">Master Barber & Fundador</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-[#DFBA73]/20 text-[#F5D799] border border-[#DFBA73]/30 px-2.5 py-0.5 rounded-full font-bold font-mono">
                      Exclusivo
                    </span>
                  </div>
                </div>

                {/* Ritual / Serviço Selecionado */}
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">
                    Ritual Desejado
                  </label>
                  <select
                    value={newServiceId}
                    onChange={(e) => setNewServiceId(e.target.value)}
                    className="w-full bg-[#050608] border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:border-[#DFBA73] focus:outline-none font-mono"
                  >
                    {OFFICIAL_SERVICES.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} - R$ {s.price} ({s.duration} min) {s.badge ? `• ${s.badge}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Horário */}
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">
                    Horário
                  </label>
                  <input 
                    required 
                    type="time" 
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:border-[#DFBA73] focus:outline-none font-mono [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold uppercase tracking-widest text-xs rounded-xl mt-4 transition-all shadow-lg shadow-[#DFBA73]/20 cursor-pointer hover:brightness-110"
                >
                  {isSubmitting ? "Agendando..." : "Salvar Agendamento no Balcão"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━ MODAL DE CANCELAMENTO POR IMPREVISTO COM REDIRECIONAMENTO WHATSAPP ━━━ */}
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
                      <span>Agendamento cancelado com sucesso no sistema!</span>
                    </div>
                    <p className="text-gray-300">
                      O horário foi liberado na agenda. Caso o WhatsApp não tenha aberto automaticamente, clique no botão abaixo para avisar o cliente:
                    </p>
                  </div>

                  <a
                    href={cancelSuccessWhatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 bg-[#25D366] text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#128C7E] transition-all shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Abrir Conversa no WhatsApp</span>
                    <ArrowRight className="w-4 h-4" />
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
