"use client";

import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
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
  Lock,
  Archive,
  Trash2
} from "lucide-react";
import { BARBERS } from "@/lib/barbers";
import { OFFICIAL_SERVICES, ServiceItem } from "@/lib/services";
import { useSession } from "next-auth/react";

interface StoredExpenseItem {
  id: number;
  description: string;
  amount: number;
  category: "INSUMOS" | "FIXO" | "OUTROS";
  date: string;
}

export default function FinanceiroPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "ADMIN";
  const isAdmin = userRole === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Modais
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<"INSUMOS" | "FIXO" | "OUTROS">("INSUMOS");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("corte");
  const [paymentMethod, setPaymentMethod] = useState<string>("PIX");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Date filter (padrão dia de hoje)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Estado do Caixa de Lucas Augusto
  const [cutsToday, setCutsToday] = useState(0);
  const [grossRevenue, setGrossRevenue] = useState(0);
  const [isCaixaClosed, setIsCaixaClosed] = useState(false);
  const [expenses, setExpenses] = useState<StoredExpenseItem[]>([]);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Carrega os dados específicos da data
  const loadDataForDate = async (dateStr: string) => {
    setLoading(true);

    try {
      // 1. Busca agendamentos da API do Dashboard para a data
      let apiCuts = 0;
      let apiGross = 0;

      try {
        const resDash = await fetch(`/api/dashboard?date=${dateStr}&barberId=all`);
        if (resDash.ok) {
          const dashData = await resDash.json();
          if (dashData.breakdown && dashData.breakdown.length > 0) {
            const solo = dashData.breakdown[0];
            apiCuts = solo.completedApts || 0;
            apiGross = solo.revenue || 0;
          } else if (dashData.revenue !== undefined) {
            apiGross = dashData.revenue || 0;
            apiCuts = dashData.completedApts || 0;
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      }

      // 2. Local storage para status de fechamento do caixa e despesas locais
      const storedCaixaStatus = localStorage.getItem(`caixa_status_${dateStr}`);
      setIsCaixaClosed(storedCaixaStatus === "CLOSED");

      const storedExpenses = localStorage.getItem(`expenses_${dateStr}`);
      if (storedExpenses) {
        try {
          const parsed = JSON.parse(storedExpenses);
          setExpenses(Array.isArray(parsed) ? parsed : []);
        } catch (_) {
          setExpenses([]);
        }
      } else {
        setExpenses([]);
      }

      setCutsToday(apiCuts);
      setGrossRevenue(apiGross);
    } catch (e) {
      console.error("Erro geral financeiro:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataForDate(selectedDate);
  }, [selectedDate]);

  // Fechar ou Reabrir Caixa
  const handleToggleCaixa = () => {
    const newStatus = !isCaixaClosed;
    const dateFormatted = selectedDate.split("-").reverse().join("/");
    
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

  // Registrar Atendimento Balcão diretamente no caixa de Lucas Augusto
  const handleRegisterWalkIn = async () => {
    if (isCaixaClosed) {
      alert("O caixa deste dia está fechado. Reabra o caixa para registrar novos atendimentos.");
      return;
    }

    const chosenService = OFFICIAL_SERVICES.find(s => s.id === selectedServiceId) || OFFICIAL_SERVICES[0];
    setIsSubmitting(true);

    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;
      
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: chosenService.id,
          barberId: BARBERS[0].id,
          date: `${selectedDate}T${timeStr}-03:00`,
          isWalkIn: true,
          status: "COMPLETED",
          clientName: "Cliente Balcão",
          paymentMethod,
        }),
      });

      if (!res.ok) {
        throw new Error("Falha ao registrar serviço");
      }

      setIsWalkInModalOpen(false);
      await loadDataForDate(selectedDate);
      setToastMessage(`Ritual "${chosenService.name}" de R$ ${chosenService.price.toFixed(2)} lançado com sucesso no caixa!`);
    } catch (e) {
      console.error("Erro ao registrar atendimento balcão:", e);
      alert("Erro ao registrar atendimento no caixa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lançar Despesa do Studio
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc || !expenseAmount) return;

    setIsSubmitting(true);
    try {
      const newExpense: StoredExpenseItem = {
        id: Date.now(),
        description: expenseDesc,
        amount: parseFloat(expenseAmount),
        category: expenseCategory,
        date: new Date().toISOString(),
      };

      const updated = [newExpense, ...expenses];
      setExpenses(updated);
      localStorage.setItem(`expenses_${selectedDate}`, JSON.stringify(updated));

      setExpenseDesc("");
      setExpenseAmount("");
      setIsExpenseModalOpen(false);
      setToastMessage(`Despesa de R$ ${newExpense.amount.toFixed(2)} cadastrada com sucesso.`);
    } catch (err) {
      console.error("Erro ao salvar despesa:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excluir despesa
  const handleDeleteExpense = (id: number) => {
    if (!window.confirm("Deseja remover este registro de despesa?")) return;
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    localStorage.setItem(`expenses_${selectedDate}`, JSON.stringify(updated));
    setToastMessage("Despesa removida.");
  };

  // Cálculos Financeiros Solo Studio
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const lucroLiquidoReal = grossRevenue - totalExpenses;
  const ticketMedio = cutsToday > 0 ? grossRevenue / cutsToday : 0;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin text-[#DFBA73]">
          <Sparkles className="w-10 h-10" />
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[1200px] mx-auto space-y-8 pb-16">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-[100] bg-[#080A0E] border border-[#DFBA73] text-[#F5D799] px-5 py-3 rounded-2xl shadow-2xl shadow-black/80 flex items-center gap-3 text-xs font-mono font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-[#DFBA73]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER & DATE SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[10px] bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <Shield className="w-3 h-3 text-black" /> Gestão Solo • 100% Studio
            </span>
            <span className="text-[10px] bg-white/5 border border-white/10 text-gray-400 uppercase tracking-widest px-2.5 py-1 rounded-full font-mono">
              Lucas Augusto • Fundador
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-serif text-white tracking-tight">
            Gestão <span className="bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] bg-clip-text text-transparent italic">Financeira</span>
          </h2>
          <p className="text-gray-400 mt-1 text-sm font-light">
            Controle do caixa integral, faturamento 100% do estúdio e conciliação de custos operacionais.
          </p>
        </div>

        {/* Date Filter & Quick Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 bg-[#080A0E] border border-white/10 rounded-2xl px-4 py-2.5 shadow-inner">
            <Calendar className="w-4 h-4 text-[#DFBA73] shrink-0" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white text-xs font-mono outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>

          <button 
            type="button"
            onClick={() => setIsWalkInModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold text-xs uppercase font-mono tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#DFBA73]/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Cliente Balcão</span>
          </button>

          <button 
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>Lançar Custo</span>
          </button>
        </div>
      </div>

      {/* BENTO GRID: MÉTRICAS FINANCEIRAS DO STUDIO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Faturamento Bruto (100% do Studio) */}
        <div className="bg-[#080A0E] border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-[#DFBA73]/40 transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#DFBA73]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
              Entradas Brutas (100%)
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#DFBA73]/10 border border-[#DFBA73]/20 flex items-center justify-center text-[#DFBA73]">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-serif text-white tracking-tight mb-1">
            R$ {grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-gray-400 font-light">
            {cutsToday} {cutsToday === 1 ? "atendimento realizado" : "atendimentos realizados"} na data.
          </p>
        </div>

        {/* Card 2: Custos & Despesas */}
        <div className="bg-[#080A0E] border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400/90 font-medium">
              Custos & Insumos
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-serif text-rose-400 tracking-tight mb-1">
            - R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-gray-400 font-light">
            {expenses.length} {expenses.length === 1 ? "despesa lançada" : "despesas lançadas"} hoje.
          </p>
        </div>

        {/* Card 3: Lucro Líquido Real */}
        <div className="bg-gradient-to-br from-[#080A0E] via-[#050608] to-emerald-950/20 border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              Lucro Líquido Real
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-serif text-emerald-400 tracking-tight mb-1">
            R$ {lucroLiquidoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-emerald-400/70 font-light">
            Faturamento bruto menos custos operacionais.
          </p>
        </div>

        {/* Card 4: Ticket Médio */}
        <div className="bg-[#080A0E] border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-[#DFBA73]/40 transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#DFBA73]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
              Ticket Médio
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#DFBA73]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-serif text-white tracking-tight mb-1">
            R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-gray-400 font-light">
            Média de receita por cliente atendido.
          </p>
        </div>
      </div>

      {/* CARD CENTRAL DE FECHAMENTO & STATUS DO CAIXA */}
      <div className={`p-8 md:p-10 rounded-3xl border transition-all relative overflow-hidden ${
        isCaixaClosed 
          ? "bg-[#080A0E]/80 border-white/10" 
          : "bg-gradient-to-r from-[#080A0E] via-[#0b0e14] to-[#080A0E] border-[#DFBA73]/30 shadow-xl shadow-black/60"
      }`}>
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#DFBA73]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          
          {/* Informações de Lucas Augusto */}
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
                Caixa do Studio • 100% de Retenção
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${isCaixaClosed ? "bg-rose-400" : "bg-emerald-400 animate-pulse"}`} />
                <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
                  {isCaixaClosed ? "Caixa Fechado para este dia" : "Caixa Aberto • Recebendo lançamentos"}
                </span>
              </div>
            </div>
          </div>

          {/* Saldo Líquido do Dia & Botão de Fechamento */}
          <div className="flex flex-col items-center md:items-end gap-3 text-center md:text-right">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 block mb-1">
                Saldo Disponível em Caixa Hoje
              </span>
              <span className="text-4xl md:text-5xl font-serif text-white tracking-tight">
                R$ {lucroLiquidoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

      {/* TABELA DE SAÍDAS & DESPESAS REGISTRADAS */}
      <div className="bg-[#080A0E] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h3 className="text-xl font-serif text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#DFBA73]" /> Extrato de Despesas e Insumos do Studio
            </h3>
            <p className="text-xs text-gray-400 mt-1 font-light">
              Registros de reposição de insumos nobres (L&apos;Occitane en Provence, K&apos;enzza) e custos operacionais.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 hover:text-white uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#DFBA73]" />
            <span>Adicionar Despesa</span>
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-12 text-gray-500 font-light italic bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
            Nenhuma despesa ou insumo registrado para esta data ({selectedDate.split("-").reverse().join("/")}).
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((exp) => (
              <div 
                key={exp.id} 
                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{exp.description}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                        {exp.category === "INSUMOS" ? "Insumos & Cosméticos" : exp.category === "FIXO" ? "Custo Operacional Fixo" : "Outros Custos"}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(exp.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-base font-serif text-rose-400 font-medium">
                    - R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="p-2 text-gray-500 hover:text-rose-400 transition-colors opacity-70 hover:opacity-100 cursor-pointer"
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="bg-[#080A0E] border border-[#DFBA73]/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              <div className="p-8 relative z-10">
                <button 
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)} 
                  className="absolute top-6 right-6 text-gray-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    Saída do Caixa
                  </span>
                </div>

                <h2 className="text-2xl font-serif text-white mb-1">
                  Lançar <span className="text-[#DFBA73] italic">Despesa</span>
                </h2>
                <p className="text-gray-400 text-xs mb-6 font-light">
                  Registre custos fixos, insumos L&apos;Occitane / K&apos;enzza ou reposição de materiais do estúdio.
                </p>

                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase font-mono tracking-wider mb-1.5">
                      Descrição da Despesa
                    </label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Ex: Cosméticos L'Occitane, Energia, Água..." 
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
                      onChange={(e: any) => setExpenseCategory(e.target.value)}
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
                    {isSubmitting ? "Cadastrando..." : "Confirmar e Deduzir do Caixa"}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: REGISTRAR ATENDIMENTO BALCÃO (+ CLIENTE BALCÃO) */}
      {mounted && isWalkInModalOpen && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="bg-[#080A0E] border border-[#DFBA73]/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 md:p-8 pb-4 relative z-10 shrink-0 border-b border-white/10">
                <button 
                  type="button"
                  onClick={() => setIsWalkInModalOpen(false)} 
                  className="absolute top-6 right-6 text-gray-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#DFBA73]/20 text-[#F5D799] border border-[#DFBA73]/30 font-mono">
                    Lançamento Direto • 100% Studio
                  </span>
                </div>
                <h2 className="text-2xl font-serif text-white">
                  Registrar <span className="text-[#DFBA73] italic">Serviço Balcão</span>
                </h2>
                <p className="text-gray-400 text-xs mt-1 font-light">
                  Lançar atendimento diretamente no caixa de <strong className="text-white">Lucas Augusto</strong> para o dia {selectedDate.split("-").reverse().join("/")}.
                </p>
              </div>

              {/* Scroll Body */}
              <div className="p-6 md:p-8 pt-4 overflow-y-auto space-y-5 relative z-10 flex-1">
                {/* 1. Escolha de Serviços */}
                <div>
                  <label className="block text-gray-400 text-xs uppercase font-mono tracking-wider mb-2 font-medium">
                    1. Selecione o Ritual
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {OFFICIAL_SERVICES.map(svc => {
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
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${
                              isSelected ? "border-[#DFBA73] bg-[#DFBA73] text-black font-bold" : "border-white/20 text-transparent"
                            }`}>
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

                {/* 2. Forma de Pagamento */}
                <div>
                  <label className="block text-gray-400 text-xs uppercase font-mono tracking-wider mb-2 font-medium">
                    2. Forma de Pagamento
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

                {/* 3. Resumo Financeiro */}
                {(() => {
                  const activeSvc = OFFICIAL_SERVICES.find(s => s.id === selectedServiceId) || OFFICIAL_SERVICES[0];

                  return (
                    <div className="p-4 rounded-2xl bg-[#DFBA73]/10 border border-[#DFBA73]/30 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between items-center text-gray-300">
                        <span>Ritual Selecionado:</span>
                        <strong className="text-white text-sm">{activeSvc.name}</strong>
                      </div>
                      <div className="flex justify-between items-center text-[#DFBA73]">
                        <span>Faturamento 100% Studio:</span>
                        <strong className="text-base text-[#F5D799] font-bold">R$ {activeSvc.price.toFixed(2)}</strong>
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
                  const activeSvc = OFFICIAL_SERVICES.find(s => s.id === selectedServiceId) || OFFICIAL_SERVICES[0];
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
