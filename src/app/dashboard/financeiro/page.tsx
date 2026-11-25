"use client";

import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  X,
  Wallet,
  ArrowUpRight,
  Receipt,
  Shield,
  Sparkles,
  CreditCard,
  Banknote,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Archive,
  Trash2,
  BarChart3,
  Clock,
} from "lucide-react";
import { BARBERS } from "@/lib/barbers";
import { OFFICIAL_SERVICES } from "@/lib/services";
import { useSession } from "next-auth/react";
import { WalkInTimePicker } from "@/components/WalkInTimePicker";
import { getDefaultWalkInSlot } from "@/lib/studio-slots";

type ExpenseCategory = "INSUMOS" | "FIXO" | "OUTROS";

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  dateStr: string;
}

interface DailyBreakdownItem {
  date: string;
  dayOfWeek?: string;
  isSunday?: boolean;
  completedCount: number;
  grossRevenue: number;
  expenses: number;
  netProfit: number;
  accumulatedGross?: number;
  accumulatedExpenses?: number;
  accumulatedNet?: number;
}

interface MonthlySummaryPayload {
  month: string;
  monthLabel: string;
  grossRevenue: number;
  expenses: number;
  netProfit: number;
  marginPercent: number;
  completedCount: number;
  scheduledCount: number;
  pendingRevenue: number;
  ticketMedio: number;
  expensesCount: number;
  expensesByCategory: {
    INSUMOS: number;
    FIXO: number;
    OUTROS: number;
  };
  expensesList: ExpenseItem[];
  dailyBreakdown: DailyBreakdownItem[];
  selectedDay?: {
    date: string;
    grossRevenue: number;
    expenses: number;
    netProfit: number;
    completedCount: number;
    ticketMedio: number;
    expensesList: ExpenseItem[];
  };
}

function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftMonthStr(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const shifted = new Date(y, (m || 1) - 1 + delta, 15);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

function formatBRL(value: number, showNegativeSign = false): string {
  const abs = Math.abs(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `- R$ ${abs}`;
  if (showNegativeSign && value > 0) return `- R$ ${abs}`;
  return `R$ ${abs}`;
}

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

function formatFullDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  INSUMOS: "Insumos & Cosméticos",
  FIXO: "Custo Operacional Fixo",
  OUTROS: "Outros Custos",
};

export default function FinanceiroPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "ADMIN";
  const isAdmin = userRole === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Modo de visualização: Mensal (padrão para controle completo) ou Diário
  const [viewMode, setViewMode] = useState<"monthly" | "daily">("monthly");
  const [onlyActiveDays, setOnlyActiveDays] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getTodayDateStr().slice(0, 7));

  // Dados consolidados vindos do PostgreSQL
  const [summary, setSummary] = useState<MonthlySummaryPayload | null>(null);
  const [isCaixaClosed, setIsCaixaClosed] = useState(false);

  // Modais
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>("INSUMOS");
  const [expenseDate, setExpenseDate] = useState<string>(getTodayDateStr);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    OFFICIAL_SERVICES[0]?.id || "corte"
  );
  const [walkInClientName, setWalkInClientName] = useState<string>("Cliente Balcão");
  const [walkInDate, setWalkInDate] = useState<string>(getTodayDateStr);
  const [walkInTime, setWalkInTime] = useState<string>(() => getDefaultWalkInSlot());
  const [walkInStatus, setWalkInStatus] = useState<"COMPLETED" | "CONFIRMED">("COMPLETED");
  const [paymentMethod, setPaymentMethod] = useState<string>("PIX");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (!isExpenseModalOpen && !isWalkInModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExpenseModalOpen(false);
        setIsWalkInModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isExpenseModalOpen, isWalkInModalOpen]);

  const loadFinancialData = useCallback(async (monthStr: string, dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/financeiro/monthly?month=${encodeURIComponent(monthStr)}&date=${encodeURIComponent(dateStr)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const json: MonthlySummaryPayload = await res.json();
        setSummary(json);
      }

      if (typeof window !== "undefined") {
        const storedCaixaStatus = localStorage.getItem(`caixa_status_${dateStr}`);
        setIsCaixaClosed(storedCaixaStatus === "CLOSED");
      }
    } catch (e) {
      console.error("Erro ao carregar dados financeiros:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFinancialData(selectedMonth, selectedDate);
  }, [selectedMonth, selectedDate, loadFinancialData]);

  const handleSelectDailyDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    if (dateStr.slice(0, 7) !== selectedMonth) {
      setSelectedMonth(dateStr.slice(0, 7));
    }
  };

  const handleOpenExpenseModal = () => {
    const defaultDate =
      viewMode === "daily"
        ? selectedDate
        : getTodayDateStr().startsWith(selectedMonth)
        ? getTodayDateStr()
        : `${selectedMonth}-01`;
    setExpenseDate(defaultDate);
    setIsExpenseModalOpen(true);
  };

  // Fechar ou Reabrir Caixa do dia selecionado
  const handleToggleCaixa = () => {
    const newStatus = !isCaixaClosed;
    const dateFormatted = formatFullDate(selectedDate);

    if (newStatus) {
      if (!window.confirm(`Deseja registrar o fechamento do caixa do dia ${dateFormatted}?`)) return;
      localStorage.setItem(`caixa_status_${selectedDate}`, "CLOSED");
      setIsCaixaClosed(true);
      setToastMessage(`Caixa do dia ${dateFormatted} fechado com sucesso.`);
    } else {
      if (!window.confirm(`Deseja reabrir o caixa do dia ${dateFormatted}?`)) return;
      localStorage.removeItem(`caixa_status_${selectedDate}`);
      setIsCaixaClosed(false);
      setToastMessage(`Caixa do dia ${dateFormatted} reaberto para lançamentos.`);
    }
  };

  // Registrar Atendimento Balcão
  const handleRegisterWalkIn = async () => {
    const targetDay = walkInDate || (viewMode === "daily" ? selectedDate : getTodayDateStr());
    const targetTime = walkInTime || getDefaultWalkInSlot(targetDay);

    if (viewMode === "daily" && isCaixaClosed && targetDay === selectedDate) {
      alert("O caixa deste dia está fechado. Reabra o caixa para registrar novos atendimentos.");
      return;
    }

    const chosenService =
      OFFICIAL_SERVICES.find((s) => s.id === selectedServiceId) || OFFICIAL_SERVICES[0];
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: chosenService.id,
          barberId: BARBERS[0].id,
          date: `${targetDay}T${targetTime}:00-03:00`,
          isWalkIn: true,
          status: walkInStatus,
          clientName: walkInClientName.trim() || "Cliente Balcão",
          paymentMethod,
        }),
      });

      if (!res.ok) {
        throw new Error("Falha ao registrar serviço");
      }

      setIsWalkInModalOpen(false);
      await loadFinancialData(selectedMonth, selectedDate);
      setToastMessage(
        walkInStatus === "COMPLETED"
          ? `Ritual "${chosenService.name}" (R$ ${chosenService.price.toFixed(2)}) às ${targetTime} lançado no caixa e bloqueado na agenda!`
          : `Cliente Balcão agendado às ${targetTime} e horário indisponibilizado na agenda!`
      );
    } catch (e) {
      console.error("Erro ao registrar atendimento balcão:", e);
      alert("Erro ao registrar atendimento no caixa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lançar Despesa no PostgreSQL
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(expenseAmount.replace(",", "."));
    if (!expenseDesc.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expenseDesc.trim(),
          amount: numericAmount,
          category: expenseCategory,
          date: expenseDate,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar despesa no servidor");
      }

      setExpenseDesc("");
      setExpenseAmount("");
      setIsExpenseModalOpen(false);
      const savedMonth = expenseDate.slice(0, 7);
      if (savedMonth !== selectedMonth) {
        setSelectedMonth(savedMonth);
      } else {
        await loadFinancialData(selectedMonth, selectedDate);
      }
      setToastMessage(`Despesa de ${formatBRL(numericAmount)} registrada com sucesso.`);
    } catch (err) {
      console.error("Erro ao salvar despesa:", err);
      alert("Não foi possível salvar a despesa. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excluir despesa do PostgreSQL
  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("Deseja remover este registro de despesa?")) return;
    try {
      const res = await fetch(`/api/expenses?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Erro ao excluir despesa");
      }
      await loadFinancialData(selectedMonth, selectedDate);
      setToastMessage("Despesa removida do extrato.");
    } catch (err) {
      console.error("Erro ao remover despesa:", err);
      alert("Erro ao excluir despesa.");
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin text-[#DFBA73]">
          <Sparkles className="w-10 h-10" />
        </div>
      </div>
    );
  }

  const currentMonthStr = getTodayDateStr().slice(0, 7);
  const monthlyGross = summary?.grossRevenue || 0;
  const monthlyExpensesTotal = summary?.expenses || 0;
  const monthlyNet = summary?.netProfit || 0;
  const monthlyMargin = summary?.marginPercent || 0;
  const monthlyCompleted = summary?.completedCount || 0;
  const monthlyTicket = summary?.ticketMedio || 0;
  const monthlyPending = summary?.pendingRevenue || 0;
  const monthlyExpensesList = summary?.expensesList || [];
  const dailyBreakdown = summary?.dailyBreakdown || [];
  const catTotals = summary?.expensesByCategory || { INSUMOS: 0, FIXO: 0, OUTROS: 0 };

  const dayData = summary?.selectedDay;
  const dailyGross = dayData?.grossRevenue || 0;
  const dailyExpensesTotal = dayData?.expenses || 0;
  const dailyNet = dayData?.netProfit || 0;
  const dailyCuts = dayData?.completedCount || 0;
  const dailyTicket = dayData?.ticketMedio || 0;
  const dailyExpensesList = dayData?.expensesList || [];

  const activeExpensesList = viewMode === "monthly" ? monthlyExpensesList : dailyExpensesList;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-[1200px] mx-auto space-y-8 pb-16"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-[130] bg-[#080A0E] border border-[#DFBA73] text-[#F5D799] px-5 py-3 rounded-2xl shadow-2xl shadow-black/80 flex items-center gap-3 text-xs font-mono font-semibold max-w-[calc(100vw-3rem)]"
          >
            <CheckCircle2 className="w-4 h-4 text-[#DFBA73] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER, MODO (MENSAL / DIÁRIO) & AÇÕES */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[10px] bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <Shield className="w-3 h-3 text-black" /> Gestão Solo • 100% Studio
            </span>
            <span className="text-[10px] bg-white/5 border border-white/10 text-gray-400 uppercase tracking-widest px-2.5 py-1 rounded-full font-mono">
              Lucas Augusto • {isAdmin ? "Dono" : "Barbeiro"}
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-serif text-white tracking-tight">
            Gestão{" "}
            <span className="bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] bg-clip-text text-transparent italic">
              Financeira
            </span>
          </h2>
          <p className="text-gray-400 mt-1 text-sm font-light">
            Controle completo de faturamento bruto, despesas e lucro líquido mensal e diário do estúdio.
          </p>
        </div>

        {/* Controles de Visão & Ações */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          {/* Seletor Mensal vs Diário */}
          <div className="inline-flex bg-[#080A0E] border border-white/10 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => setViewMode("monthly")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "monthly"
                  ? "bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setViewMode("daily")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "daily"
                  ? "bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Diário
            </button>
          </div>

          {/* Navegador de Mês (Mobile & Desktop) ou Data Diária */}
          {viewMode === "monthly" ? (
            <div className="flex items-center justify-between gap-2 bg-[#080A0E] border border-white/10 rounded-2xl px-2.5 py-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => setSelectedMonth((prev) => shiftMonthStr(prev, -1))}
                aria-label="Mês anterior"
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthStr)}
                title="Voltar para o mês atual"
                className="px-2 py-1 text-xs font-mono text-white font-semibold capitalize whitespace-nowrap hover:text-[#DFBA73] transition-colors cursor-pointer"
              >
                {summary?.monthLabel || selectedMonth}
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth((prev) => shiftMonthStr(prev, 1))}
                aria-label="Próximo mês"
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#080A0E] border border-white/10 rounded-2xl px-4 py-2.5 shadow-inner">
              <Calendar className="w-4 h-4 text-[#DFBA73] shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleSelectDailyDate(e.target.value)}
                aria-label="Selecionar data"
                className="bg-transparent text-white text-xs font-mono outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              const targetDay = viewMode === "daily" ? selectedDate : getTodayDateStr();
              setWalkInDate(targetDay);
              setWalkInTime(getDefaultWalkInSlot(targetDay));
              setWalkInStatus("COMPLETED");
              setWalkInClientName("Cliente Balcão");
              setIsWalkInModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold text-xs uppercase font-mono tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#DFBA73]/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Cliente Balcão</span>
          </button>

          <button
            type="button"
            onClick={handleOpenExpenseModal}
            className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>Lançar Despesa</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          VISÃO MENSAL COMPLETA
         ===================================================================== */}
      {viewMode === "monthly" ? (
        <>
          {/* BENTO GRID MENSAL */}
          {(() => {
            const costRatio =
              monthlyGross > 0
                ? Math.min(100, (monthlyExpensesTotal / monthlyGross) * 100)
                : monthlyExpensesTotal > 0
                ? 100
                : 0;
            const retentionRatio = monthlyGross > 0 ? Math.max(0, 100 - costRatio) : monthlyNet >= 0 ? 100 : 0;
            const isNetPositive = monthlyNet >= 0;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Card 1: Produção Bruta do Mês */}
                <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0E1117] via-[#090B10] to-[#06070A] border border-white/10 hover:border-[#DFBA73]/45 p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                  <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#DFBA73]/60 to-transparent pointer-events-none" />
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#DFBA73]/10 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                        Produção Bruta do Mês
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-[#DFBA73]/15 border border-[#DFBA73]/30 flex items-center justify-center text-[#DFBA73] shadow-sm shadow-[#DFBA73]/10">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-serif font-bold text-white tabular-nums tracking-tight">
                      {formatBRL(monthlyGross)}
                    </h3>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-gray-400">
                    <span>
                      {monthlyCompleted}{" "}
                      {monthlyCompleted === 1 ? "atendimento" : "atendimentos"}
                    </span>
                    <span className="text-[#F5D799] font-semibold">100% Studio</span>
                  </div>
                </div>

                {/* Card 2: Despesa Mensal */}
                <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#130B0F] via-[#0B080A] to-[#060608] border border-rose-500/20 hover:border-rose-500/45 p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                  <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-rose-400/65 to-transparent pointer-events-none" />
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-rose-300 font-semibold">
                        Despesa Mensal Total
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                        <TrendingDown className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-serif font-bold text-rose-400 tabular-nums tracking-tight">
                      {monthlyExpensesTotal > 0 ? `- ${formatBRL(monthlyExpensesTotal)}` : "R$ 0,00"}
                    </h3>
                  </div>
                  <div className="mt-4 pt-3 border-t border-rose-500/10 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                      <span>
                        {monthlyExpensesList.length}{" "}
                        {monthlyExpensesList.length === 1 ? "gasto" : "gastos"}
                      </span>
                      <span className="text-rose-300 font-semibold">{costRatio.toFixed(1)}% do bruto</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500"
                        style={{ width: `${costRatio}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 3: Produção Líquida / Lucro do Mês */}
                <div
                  className={`group relative overflow-hidden rounded-3xl p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between border ${
                    isNetPositive
                      ? "bg-gradient-to-br from-[#0B1713] via-[#080E0C] to-[#060807] border-emerald-500/35 hover:border-emerald-400/60"
                      : "bg-gradient-to-br from-[#190B10] via-[#0E070A] to-[#060608] border-rose-500/35 hover:border-rose-400/60"
                  }`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent to-transparent pointer-events-none ${
                      isNetPositive ? "via-emerald-400/80" : "via-rose-400/80"
                    }`}
                  />
                  <div
                    className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
                      isNetPositive ? "bg-emerald-500/15" : "bg-rose-500/15"
                    }`}
                  />
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`text-[10px] font-mono uppercase tracking-widest font-bold ${
                          isNetPositive ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        Produção Líquida do Mês
                      </span>
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                          isNetPositive
                            ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                            : "bg-rose-500/20 border-rose-400/40 text-rose-300"
                        }`}
                      >
                        <Wallet className="w-4 h-4" />
                      </div>
                    </div>
                    <h3
                      className={`text-3xl font-serif font-bold tabular-nums tracking-tight ${
                        isNetPositive ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {formatBRL(monthlyNet)}
                    </h3>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-gray-400">Margem real</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold ${
                          isNetPositive
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {monthlyMargin.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isNetPositive
                            ? "bg-gradient-to-r from-emerald-500 to-[#DFBA73]"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${retentionRatio}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 4: Ticket Médio & Previsto */}
                <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0E1117] via-[#090B10] to-[#06070A] border border-white/10 hover:border-[#DFBA73]/45 p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                  <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#DFBA73]/50 to-transparent pointer-events-none" />
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#DFBA73]/8 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                        Ticket Médio do Mês
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#DFBA73]">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-serif font-bold text-white tabular-nums tracking-tight">
                      {formatBRL(monthlyTicket)}
                    </h3>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
                    <span className="text-gray-400">Agenda futura</span>
                    <span className={monthlyPending > 0 ? "text-[#F5D799] font-semibold" : "text-gray-500"}>
                      {monthlyPending > 0 ? formatBRL(monthlyPending) : "R$ 0,00"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* RESUMO POR CATEGORIA DE DESPESA + RESULTADO DO MÊS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Balanço Consolidado do Studio no Mês */}
            <div className="lg:col-span-2 bg-gradient-to-br from-[#0F1218] via-[#090B10] to-[#06070A] border border-[#DFBA73]/35 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5D799]/80 to-transparent pointer-events-none" />
              <div className="absolute top-0 right-0 w-72 h-72 bg-[#DFBA73]/8 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#DFBA73] shadow-lg shadow-[#DFBA73]/25 shrink-0">
                    <Image
                      src={BARBERS[0].avatar}
                      alt="Lucas Augusto"
                      fill
                      className="object-cover object-top"
                      sizes="56px"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-white capitalize">
                      Fechamento Parcial • {summary?.monthLabel || selectedMonth}
                    </h3>
                    <p className="text-xs text-[#F5D799] font-mono mt-0.5">
                      Modelo Solo (100% retido) • Controle de Produção e Custos
                    </p>
                  </div>
                </div>

                {monthlyPending > 0 && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#DFBA73]/10 border border-[#DFBA73]/35 text-xs font-mono text-[#F5D799] self-start sm:self-center shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-[#DFBA73]" />
                    <span>Previsto: {formatBRL(monthlyPending)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                    (+) Produção Bruta
                  </span>
                  <p className="text-2xl font-serif font-bold text-white tabular-nums mt-1.5">
                    {formatBRL(monthlyGross)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-500/[0.06] border border-rose-500/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-rose-300">
                    (-) Gastos no Mês
                  </span>
                  <p className="text-2xl font-serif font-bold text-rose-400 tabular-nums mt-1.5">
                    {monthlyExpensesTotal > 0 ? `- ${formatBRL(monthlyExpensesTotal)}` : "R$ 0,00"}
                  </p>
                </div>
                <div
                  className={`p-4 rounded-2xl border shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ${
                    monthlyNet >= 0
                      ? "bg-emerald-500/12 border-emerald-500/35"
                      : "bg-rose-500/12 border-rose-500/35"
                  }`}
                >
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                      monthlyNet >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    (=) Lucro Líquido
                  </span>
                  <p
                    className={`text-2xl font-serif font-bold tabular-nums mt-1.5 ${
                      monthlyNet >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {formatBRL(monthlyNet)}
                  </p>
                </div>
              </div>
            </div>

            {/* Distribuição de Despesas por Categoria */}
            <div className="relative overflow-hidden bg-gradient-to-b from-[#0E1117] via-[#090B10] to-[#06070A] border border-white/10 rounded-3xl p-6 space-y-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-base font-serif text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#DFBA73]" /> Gastos por Categoria
                </h3>
                <span className="text-[10px] font-mono text-[#DFBA73] bg-[#DFBA73]/10 border border-[#DFBA73]/25 px-2 py-0.5 rounded-full uppercase">
                  Mês
                </span>
              </div>

              <div className="space-y-4">
                {(["INSUMOS", "FIXO", "OUTROS"] as ExpenseCategory[]).map((cat) => {
                  const val = catTotals[cat] || 0;
                  const pct =
                    monthlyExpensesTotal > 0 ? Math.round((val / monthlyExpensesTotal) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-300 font-light">{CATEGORY_LABELS[cat]}</span>
                        <span className="font-mono text-white font-semibold tabular-nums">
                          {formatBRL(val)}{" "}
                          <span className="text-gray-500 font-normal">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 via-rose-400 to-[#DFBA73] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PRODUÇÃO DIÁRIA DO MÊS (TODOS OS DIAS 01 ATÉ O FINAL + TOTAL DO MÊS) */}
          <div className="relative overflow-hidden bg-gradient-to-b from-[#0C0F14] via-[#080A0E] to-[#06070A] border border-white/10 rounded-3xl p-5 sm:p-8 space-y-5 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-xl font-serif text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#DFBA73]" /> Faturamento Dia a Dia •{" "}
                  <span className="capitalize text-[#F5D799]">{summary?.monthLabel || selectedMonth}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1 font-light">
                  Do dia 01 ao último dia do mês com evolução acumulada até o fechamento final. Toque em um dia para detalhar.
                </p>
              </div>

              <div className="inline-flex bg-[#050608] border border-white/10 rounded-xl p-1 self-start md:self-center">
                <button
                  type="button"
                  onClick={() => setOnlyActiveDays(false)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    !onlyActiveDays
                      ? "bg-gradient-to-r from-[#F5D799] to-[#DFBA73] text-black font-bold shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Todos os dias ({dailyBreakdown.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyActiveDays(true)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    onlyActiveDays
                      ? "bg-gradient-to-r from-[#F5D799] to-[#DFBA73] text-black font-bold shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Com movimento
                </button>
              </div>
            </div>

            {(() => {
              const todayStr = getTodayDateStr();
              const visibleDays = onlyActiveDays
                ? dailyBreakdown.filter((d) => d.completedCount > 0 || d.expenses > 0)
                : dailyBreakdown;
              const maxDayGross = Math.max(
                1,
                ...dailyBreakdown.map((d) => Number(d.grossRevenue || 0))
              );

              if (visibleDays.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-500 font-light italic bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                    Nenhuma movimentação financeira registrada neste mês.
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {/* Cabeçalho das colunas no Desktop */}
                  <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-4 pb-1 text-[10px] font-mono uppercase tracking-widest text-gray-500">
                    <div className="col-span-5">Data & Movimento</div>
                    <div className="col-span-7 grid grid-cols-4 gap-4 text-right">
                      <span>Faturado</span>
                      <span>Despesa</span>
                      <span>Líquido</span>
                      <span className="text-[#DFBA73]/80">Acumulado</span>
                    </div>
                  </div>

                  {visibleDays.map((day) => {
                    const isToday = day.date === todayStr;
                    const hasActivity = day.completedCount > 0 || day.expenses > 0;
                    const dayStrengthPct =
                      day.grossRevenue > 0
                        ? Math.max(6, Math.round((day.grossRevenue / maxDayGross) * 100))
                        : 0;

                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => {
                          handleSelectDailyDate(day.date);
                          setViewMode("daily");
                        }}
                        className={`group w-full text-left grid grid-cols-1 lg:grid-cols-12 lg:items-center gap-3 lg:gap-4 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden ${
                          isToday
                            ? "bg-gradient-to-r from-[#DFBA73]/[0.12] via-[#DFBA73]/[0.05] to-transparent border-[#DFBA73]/55 hover:border-[#DFBA73] shadow-[0_0_25px_rgba(223,186,115,0.08)]"
                            : hasActivity
                            ? "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-[#DFBA73]/40"
                            : "bg-white/[0.01] border-white/[0.04] opacity-65 hover:opacity-100 hover:border-white/15"
                        }`}
                      >
                        <div className="lg:col-span-5 flex items-center gap-3 min-w-0">
                          <div
                            className={`px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold shrink-0 border tabular-nums ${
                              isToday
                                ? "bg-gradient-to-br from-[#F5D799] to-[#DFBA73] text-black border-[#DFBA73] shadow-sm shadow-[#DFBA73]/30"
                                : hasActivity
                                ? "bg-[#DFBA73]/12 text-[#F5D799] border-[#DFBA73]/30"
                                : "bg-white/5 text-gray-400 border-white/10"
                            }`}
                          >
                            {formatShortDate(day.date)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-white font-medium">
                                {day.dayOfWeek || formatFullDate(day.date)}
                              </span>
                              <span className="text-[11px] text-gray-500 font-mono">
                                {formatFullDate(day.date)}
                              </span>
                              {isToday && (
                                <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#DFBA73]/25 text-[#F5D799] border border-[#DFBA73]/50 font-bold">
                                  Hoje
                                </span>
                              )}
                              {day.isSunday && (
                                <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                                  Domingo
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5 mt-1">
                              <p className="text-[11px] text-gray-400 font-mono truncate">
                                {day.completedCount > 0
                                  ? `${day.completedCount} ${
                                      day.completedCount === 1
                                        ? "atendimento concluído"
                                        : "atendimentos concluídos"
                                    }`
                                  : day.expenses > 0
                                  ? "Somente despesa lançada"
                                  : day.isSunday
                                  ? "Studio fechado"
                                  : "Sem movimento"}
                              </p>
                              {dayStrengthPct > 0 && (
                                <span className="hidden sm:inline-block w-16 h-1 rounded-full bg-white/10 overflow-hidden shrink-0">
                                  <span
                                    className="block h-full rounded-full bg-gradient-to-r from-[#DFBA73] to-emerald-400"
                                    style={{ width: `${dayStrengthPct}%` }}
                                  />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 text-xs font-mono tabular-nums pt-2.5 lg:pt-0 border-t lg:border-t-0 border-white/[0.06] lg:text-right">
                          <div>
                            <span className="lg:hidden text-[9px] text-gray-500 block uppercase">
                              Faturado
                            </span>
                            <span
                              className={
                                day.grossRevenue > 0 ? "text-white font-semibold" : "text-gray-500"
                              }
                            >
                              {formatBRL(day.grossRevenue)}
                            </span>
                          </div>
                          <div>
                            <span className="lg:hidden text-[9px] text-gray-500 block uppercase">
                              Despesa
                            </span>
                            <span
                              className={
                                day.expenses > 0 ? "text-rose-400 font-semibold" : "text-gray-500"
                              }
                            >
                              {day.expenses > 0 ? `- ${formatBRL(day.expenses)}` : "R$ 0,00"}
                            </span>
                          </div>
                          <div>
                            <span className="lg:hidden text-[9px] text-gray-500 block uppercase">
                              Líquido
                            </span>
                            <span
                              className={`font-bold ${
                                day.netProfit > 0
                                  ? "text-emerald-400"
                                  : day.netProfit < 0
                                  ? "text-rose-400"
                                  : "text-gray-500"
                              }`}
                            >
                              {formatBRL(day.netProfit)}
                            </span>
                          </div>
                          <div className="sm:text-right flex items-center sm:justify-end gap-1.5">
                            <div>
                              <span className="lg:hidden text-[9px] text-[#DFBA73]/80 block uppercase">
                                Acumulado Mês
                              </span>
                              <span className="text-[#F5D799] font-bold">
                                {formatBRL(day.accumulatedGross ?? 0)}
                              </span>
                            </div>
                            <ChevronRight className="hidden lg:inline-block w-3.5 h-3.5 text-gray-600 group-hover:text-[#DFBA73] group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* LINHA FINAL DE FECHAMENTO: TOTAL DO MÊS */}
                  <div className="relative overflow-hidden mt-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#DFBA73]/20 via-[#0E1217] to-emerald-950/35 border border-[#DFBA73]/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_20px_50px_-15px_rgba(223,186,115,0.25),inset_0_1px_0_0_rgba(245,215,153,0.25)]">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5D799] to-transparent pointer-events-none" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#F5D799] font-bold">
                          Total Final do Mês • 01 a {String(dailyBreakdown.length || 30).padStart(2, "0")}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 font-bold">
                          Margem {monthlyMargin.toFixed(1)}%
                        </span>
                      </div>
                      <h4 className="text-xl font-serif text-white mt-1 capitalize">
                        {summary?.monthLabel || selectedMonth}
                      </h4>
                      <p className="text-[11px] text-gray-300 font-mono mt-0.5">
                        {monthlyCompleted}{" "}
                        {monthlyCompleted === 1 ? "atendimento concluído" : "atendimentos concluídos"} •{" "}
                        {monthlyExpensesList.length}{" "}
                        {monthlyExpensesList.length === 1 ? "despesa" : "despesas"}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 sm:gap-8 text-xs font-mono tabular-nums pt-3 lg:pt-0 border-t lg:border-t-0 border-white/15">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Bruto Total</span>
                        <span className="text-base sm:text-xl text-white font-serif font-bold">
                          {formatBRL(monthlyGross)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-300 block uppercase">Despesa Total</span>
                        <span className="text-base sm:text-xl text-rose-400 font-serif font-bold">
                          {monthlyExpensesTotal > 0 ? `- ${formatBRL(monthlyExpensesTotal)}` : "R$ 0,00"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-300 block uppercase font-bold">
                          Líquido Total
                        </span>
                        <span
                          className={`text-lg sm:text-2xl font-serif font-bold ${
                            monthlyNet >= 0 ? "text-emerald-300" : "text-rose-400"
                          }`}
                        >
                          {formatBRL(monthlyNet)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      ) : (
        /* ===================================================================
           VISÃO DIÁRIA DETALHADA
           =================================================================== */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Entradas Brutas do Dia */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0E1117] via-[#090B10] to-[#06070A] border border-white/10 hover:border-[#DFBA73]/45 p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
              <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#DFBA73]/60 to-transparent pointer-events-none" />
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#DFBA73]/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                    Entradas Brutas (100%)
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-[#DFBA73]/15 border border-[#DFBA73]/30 flex items-center justify-center text-[#DFBA73]">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-3xl font-serif font-bold text-white tabular-nums tracking-tight">
                  {formatBRL(dailyGross)}
                </h3>
              </div>
              <p className="text-xs text-gray-400 font-light mt-4 pt-3 border-t border-white/[0.06]">
                {dailyCuts} {dailyCuts === 1 ? "atendimento realizado" : "atendimentos realizados"} na data.
              </p>
            </div>

            {/* Card 2: Custos & Despesas do Dia */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#130B0F] via-[#0B080A] to-[#060608] border border-rose-500/20 hover:border-rose-500/45 p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
              <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-rose-400/65 to-transparent pointer-events-none" />
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-rose-300 font-semibold">
                    Custos & Insumos
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-3xl font-serif font-bold text-rose-400 tabular-nums tracking-tight">
                  {dailyExpensesTotal > 0 ? `- ${formatBRL(dailyExpensesTotal)}` : "R$ 0,00"}
                </h3>
              </div>
              <p className="text-xs text-gray-400 font-light mt-4 pt-3 border-t border-rose-500/10">
                {dailyExpensesList.length}{" "}
                {dailyExpensesList.length === 1 ? "despesa lançada" : "despesas lançadas"} na data.
              </p>
            </div>

            {/* Card 3: Lucro Líquido Real do Dia */}
            <div
              className={`group relative overflow-hidden rounded-3xl p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between border ${
                dailyNet >= 0
                  ? "bg-gradient-to-br from-[#0B1713] via-[#080E0C] to-[#060807] border-emerald-500/35 hover:border-emerald-400/60"
                  : "bg-gradient-to-br from-[#190B10] via-[#0E070A] to-[#060608] border-rose-500/35 hover:border-rose-400/60"
              }`}
            >
              <div
                className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent to-transparent pointer-events-none ${
                  dailyNet >= 0 ? "via-emerald-400/80" : "via-rose-400/80"
                }`}
              />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-[10px] font-mono uppercase tracking-widest font-bold ${
                      dailyNet >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    Lucro Líquido Real
                  </span>
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                      dailyNet >= 0
                        ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                        : "bg-rose-500/20 border-rose-400/40 text-rose-300"
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <h3
                  className={`text-3xl font-serif font-bold tabular-nums tracking-tight ${
                    dailyNet >= 0 ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {formatBRL(dailyNet)}
                </h3>
              </div>
              <p className="text-xs text-gray-400 font-light mt-4 pt-3 border-t border-white/[0.08]">
                Faturamento bruto menos despesas do dia.
              </p>
            </div>

            {/* Card 4: Ticket Médio */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0E1117] via-[#090B10] to-[#06070A] border border-white/10 hover:border-[#DFBA73]/45 p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
              <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#DFBA73]/50 to-transparent pointer-events-none" />
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#DFBA73]/8 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                    Ticket Médio
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#DFBA73]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-3xl font-serif font-bold text-white tabular-nums tracking-tight">
                  {formatBRL(dailyTicket)}
                </h3>
              </div>
              <p className="text-xs text-gray-400 font-light mt-4 pt-3 border-t border-white/[0.06]">
                Média de receita por cliente no dia.
              </p>
            </div>
          </div>

          {/* CARD CENTRAL DE FECHAMENTO & STATUS DO CAIXA DIÁRIO */}
          <div
            className={`p-8 md:p-10 rounded-3xl border transition-all relative overflow-hidden ${
              isCaixaClosed
                ? "bg-[#080A0E]/80 border-white/10"
                : "bg-gradient-to-r from-[#080A0E] via-[#0b0e14] to-[#080A0E] border-[#DFBA73]/30 shadow-xl shadow-black/60"
            }`}
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#DFBA73]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex items-center gap-5">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#DFBA73] shadow-lg shadow-[#DFBA73]/20 shrink-0">
                  <Image
                    src={BARBERS[0].avatar}
                    alt="Lucas Augusto"
                    fill
                    className="object-cover object-top"
                    sizes="80px"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-serif text-white">{BARBERS[0].name}</h3>
                    <span className="text-[9px] bg-gradient-to-r from-[#F5D799] to-[#DFBA73] text-black px-2 py-0.5 rounded-full font-bold uppercase font-mono tracking-wider">
                      Master Barber
                    </span>
                  </div>
                  <p className="text-xs text-[#F5D799] font-mono">
                    Caixa do Studio • {formatFullDate(selectedDate)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isCaixaClosed ? "bg-rose-400" : "bg-emerald-400 animate-pulse"
                      }`}
                    />
                    <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
                      {isCaixaClosed
                        ? "Caixa Fechado para este dia"
                        : "Caixa Aberto • Recebendo lançamentos"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center md:items-end gap-3 text-center md:text-right">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 block mb-1">
                    Saldo Líquido em Caixa no Dia
                  </span>
                  <span
                    className={`text-4xl md:text-5xl font-serif tracking-tight ${
                      dailyNet >= 0 ? "text-white" : "text-rose-400"
                    }`}
                  >
                    {formatBRL(dailyNet)}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={handleToggleCaixa}
                    className={`px-6 py-3 rounded-xl font-bold uppercase text-xs font-mono tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                      isCaixaClosed
                        ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                        : "bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black hover:brightness-110 shadow-lg shadow-[#DFBA73]/25"
                    }`}
                  >
                    <Archive className="w-4 h-4" />
                    <span>{isCaixaClosed ? "Reabrir Caixa do Dia" : "Fechar Caixa do Dia"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TABELA DE SAÍDAS & DESPESAS REGISTRADAS (MENSAL OU DIÁRIA) */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0C0F14] via-[#080A0E] to-[#06070A] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="text-xl font-serif text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#DFBA73]" />{" "}
              {viewMode === "monthly"
                ? `Extrato de Despesas do Mês (${summary?.monthLabel || selectedMonth})`
                : `Extrato de Despesas do Dia (${formatFullDate(selectedDate)})`}
            </h3>
            <p className="text-xs text-gray-400 mt-1 font-light">
              Registros salvos em banco de insumos (L&apos;Occitane, K&apos;enzza), aluguel, energia e
              custos operacionais.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenExpenseModal}
            className="group px-4 py-2.5 rounded-xl bg-white/5 hover:bg-[#DFBA73] border border-white/15 hover:border-[#DFBA73] text-xs font-mono text-gray-200 hover:text-black font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-center"
          >
            <Plus className="w-3.5 h-3.5 text-[#DFBA73] group-hover:text-black" />
            <span>Adicionar Despesa</span>
          </button>
        </div>

        {activeExpensesList.length === 0 ? (
          <div className="text-center py-12 text-gray-500 font-light italic bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
            {viewMode === "monthly"
              ? `Nenhuma despesa registrada neste mês (${summary?.monthLabel || selectedMonth}).`
              : `Nenhuma despesa registrada para esta data (${formatFullDate(selectedDate)}).`}
          </div>
        ) : (
          <div className="space-y-3">
            {activeExpensesList.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-rose-500/30 hover:bg-white/[0.05] transition-all group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{exp.description}</h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-gray-300">
                        {CATEGORY_LABELS[exp.category] || "Outros Custos"}
                      </span>
                      <span className="text-[10px] text-[#DFBA73] font-mono font-semibold tabular-nums">
                        {formatFullDate(exp.dateStr)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-base font-serif text-rose-400 font-bold tabular-nums">
                    - {formatBRL(exp.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="p-2 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    aria-label={`Excluir despesa ${exp.description}`}
                    title="Excluir despesa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================================
                                     MODAIS
         ========================================================================= */}

      {/* MODAL 1: LANÇAR DESPESA DO STUDIO */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <div
              className="absolute inset-0"
              onClick={() => setIsExpenseModalOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="expense-modal-title"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#080A0E] border border-[#DFBA73]/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 sm:p-8 relative z-10">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  aria-label="Fechar modal de despesa"
                  className="absolute top-6 right-6 text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    Saída do Caixa
                  </span>
                </div>

                <h2 id="expense-modal-title" className="text-2xl font-serif text-white mb-1">
                  Lançar <span className="text-[#DFBA73] italic">Despesa</span>
                </h2>
                <p className="text-gray-400 text-xs mb-6 font-light">
                  Registre custos fixos, insumos L&apos;Occitane / K&apos;enzza ou despesas do mês no
                  banco de dados.
                </p>

                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase font-mono tracking-wider mb-1.5">
                      Data da Despesa
                    </label>
                    <input
                      required
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:border-[#DFBA73] [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs uppercase font-mono tracking-wider mb-1.5">
                      Descrição da Despesa
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Cosméticos L'Occitane, Energia, Aluguel..."
                      value={expenseDesc}
                      onChange={(e) => setExpenseDesc(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#DFBA73]"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs uppercase font-mono tracking-wider mb-1.5">
                      Valor (R$)
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:border-[#DFBA73]"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs uppercase font-mono tracking-wider mb-1.5">
                      Categoria do Custo
                    </label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                      className="w-full bg-[#080A0E] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#DFBA73]"
                    >
                      <option value="INSUMOS">Insumos & Produtos (L&apos;Occitane / K&apos;enzza)</option>
                      <option value="FIXO">Custo Operacional Fixo (Energia / Aluguel)</option>
                      <option value="OUTROS">Outros Custos Diversos</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold uppercase font-mono tracking-widest text-xs rounded-xl mt-4 hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-[#DFBA73]/20 disabled:opacity-50"
                  >
                    {isSubmitting ? "Salvando..." : "Confirmar e Deduzir do Caixa"}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: REGISTRAR ATENDIMENTO BALCÃO (+ CLIENTE BALCÃO) */}
      {mounted &&
        isWalkInModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            >
              <div
                className="absolute inset-0"
                onClick={() => setIsWalkInModalOpen(false)}
                aria-hidden="true"
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="walkin-modal-title"
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-[#080A0E] border border-[#DFBA73]/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative z-10 max-h-[90vh] flex flex-col"
              >
                {/* Header */}
                <div className="p-6 md:p-8 pb-4 relative z-10 shrink-0 border-b border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsWalkInModalOpen(false)}
                    aria-label="Fechar modal balcão"
                    className="absolute top-6 right-6 text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#DFBA73]/20 text-[#F5D799] border border-[#DFBA73]/30 font-mono">
                      Lançamento Direto • 100% Studio
                    </span>
                  </div>
                  <h2 id="walkin-modal-title" className="text-2xl font-serif text-white">
                    Registrar <span className="text-[#DFBA73] italic">Serviço Balcão</span>
                  </h2>
                  <p className="text-gray-400 text-xs mt-1 font-light">
                    Lançar atendimento para <strong className="text-white">Lucas Augusto</strong> e
                    indisponibilizar o horário escolhido na agenda.
                  </p>
                </div>

                {/* Scroll Body */}
                <div className="p-6 md:p-8 pt-4 overflow-y-auto space-y-5 relative z-10 flex-1">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase font-mono tracking-wider mb-1.5 font-medium">
                      Nome do Cliente
                    </label>
                    <input
                      type="text"
                      value={walkInClientName}
                      onChange={(e) => setWalkInClientName(e.target.value)}
                      placeholder="Ex: Cliente Balcão ou nome"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:border-[#DFBA73] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs uppercase font-mono tracking-wider mb-2 font-medium">
                      1. Selecione o Ritual
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {OFFICIAL_SERVICES.map((svc) => {
                        const isSelected = svc.id === selectedServiceId;

                        return (
                          <button
                            key={svc.id}
                            type="button"
                            onClick={() => setSelectedServiceId(svc.id)}
                            className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? "border-[#DFBA73] bg-[#DFBA73]/15 shadow-lg shadow-[#DFBA73]/10 ring-1 ring-[#DFBA73]"
                                : "border-white/10 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.05]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${
                                  isSelected
                                    ? "border-[#DFBA73] bg-[#DFBA73] text-black font-bold"
                                    : "border-white/20 text-transparent"
                                }`}
                              >
                                ✓
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-white text-xs font-semibold">{svc.name}</h4>
                                  {svc.badge && (
                                    <span className="text-[8px] bg-[#DFBA73]/20 text-[#F5D799] px-1 py-0.2 rounded font-bold uppercase font-mono">
                                      {svc.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-500 font-mono">
                                  {svc.duration} min • 100% Studio
                                </p>
                              </div>
                            </div>
                            <span className="text-[#DFBA73] font-mono font-bold text-xs">
                              R$ {svc.price}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs uppercase font-mono tracking-wider mb-2 font-medium">
                      2. Data, Horário & Situação
                    </label>
                    <div className="space-y-4">
                      <WalkInTimePicker
                        date={walkInDate}
                        time={walkInTime}
                        onDateChange={setWalkInDate}
                        onTimeChange={setWalkInTime}
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setWalkInStatus("COMPLETED")}
                          className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                            walkInStatus === "COMPLETED"
                              ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                              : "border-white/10 text-gray-400 hover:text-white bg-white/[0.02]"
                          }`}
                        >
                          Concluído (Entra no caixa)
                        </button>
                        <button
                          type="button"
                          onClick={() => setWalkInStatus("CONFIRMED")}
                          className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                            walkInStatus === "CONFIRMED"
                              ? "border-[#DFBA73] bg-[#DFBA73]/20 text-[#F5D799]"
                              : "border-white/10 text-gray-400 hover:text-white bg-white/[0.02]"
                          }`}
                        >
                          Confirmado (Na cadeira)
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs uppercase font-mono tracking-wider mb-2 font-medium">
                      3. Forma de Pagamento
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "PIX", label: "PIX", icon: Sparkles },
                        { id: "DINHEIRO", label: "Dinheiro", icon: Banknote },
                        { id: "CARTAO_DEBITO", label: "Débito", icon: CreditCard },
                        { id: "CARTAO_CREDITO", label: "Crédito", icon: CreditCard },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-mono font-medium border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            paymentMethod === m.id
                              ? "border-[#DFBA73] bg-[#DFBA73]/20 text-[#F5D799] font-bold shadow-md shadow-[#DFBA73]/10"
                              : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                          }`}
                        >
                          <m.icon className="w-3.5 h-3.5" />
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const activeSvc =
                      OFFICIAL_SERVICES.find((s) => s.id === selectedServiceId) || OFFICIAL_SERVICES[0];

                    return (
                      <div className="p-4 rounded-2xl bg-[#DFBA73]/10 border border-[#DFBA73]/30 space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between items-center text-gray-300">
                          <span>Ritual Selecionado:</span>
                          <strong className="text-white text-sm">{activeSvc.name}</strong>
                        </div>
                        <div className="flex justify-between items-center text-[#DFBA73]">
                          <span>Faturamento 100% Studio:</span>
                          <strong className="text-base text-[#F5D799] font-bold">
                            R$ {activeSvc.price.toFixed(2)}
                          </strong>
                        </div>
                        <div className="text-[10px] text-gray-400 pt-1 border-t border-white/10 flex justify-between">
                          <span>Forma de Pagamento:</span>
                          <span className="uppercase text-white">{paymentMethod}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Footer */}
                <div className="p-6 md:p-8 pt-3 border-t border-white/10 shrink-0 space-y-2">
                  {(() => {
                    const activeSvc =
                      OFFICIAL_SERVICES.find((s) => s.id === selectedServiceId) || OFFICIAL_SERVICES[0];
                    return (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleRegisterWalkIn}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold text-xs uppercase font-mono tracking-wider transition-all duration-300 shadow-xl shadow-[#DFBA73]/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer hover:brightness-110"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            <span>Lançando no Caixa...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Lançar no Caixa • R$ {activeSvc.price.toFixed(2)}</span>
                          </>
                        )}
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => setIsWalkInModalOpen(false)}
                    className="w-full text-center text-[11px] uppercase font-mono tracking-widest text-gray-500 hover:text-white transition-colors py-1 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </motion.div>
  );
}
