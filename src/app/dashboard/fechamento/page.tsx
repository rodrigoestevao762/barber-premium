"use client";

import { useEffect, useState } from "react";
import { getFechamentoData, closeCashRegister } from "./actions";
import { motion } from "framer-motion";
import { Archive, DollarSign, Wallet, Shield, Lock, ArrowLeft, CheckCircle2, TrendingDown } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { BARBERS } from "@/lib/barbers";
import { getCachedValue, setCachedValue } from "@/lib/client-cache";

type BarberRevenue = { id?: string; name: string; total: number; commission: number; rate?: number; isOwner?: boolean };
type FechamentoData = {
  totalRevenue: number;
  totalExpenses: number;
  netRevenue: number;
  barberRevenues: BarberRevenue[];
  closings: { createdAt: string | Date; closedBy: string | null }[];
  monthlySummary?: {
    month: string;
    monthLabel: string;
    grossRevenue: number;
    expenses: number;
    netProfit: number;
    marginPercent: number;
    completedCount: number;
    expensesCount: number;
  };
};

export default function FechamentoPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "ADMIN";
  const isAdmin = userRole === "ADMIN";

  const [data, setData] = useState<FechamentoData | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const fetchData = async () => {
    if (!isAdmin) return;
    const cacheKey = `fechamento:${selectedDate}`;
    const cached = getCachedValue<FechamentoData>(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    const result = await getFechamentoData(selectedDate);
    if (result.success) {
      setCachedValue(cacheKey, result.data);
      setData(result.data);
    } else {
      alert("Erro do Servidor: " + (result as any).error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [selectedDate, isAdmin]);

  const handleClose = async () => {
    if (!data) return;
    const dateFormatted = new Date(selectedDate + "T12:00:00").toLocaleDateString('pt-BR');
    if (!confirm(`Tem certeza que deseja fechar o caixa do dia ${dateFormatted}?`)) return;
    
    const result = await closeCashRegister({
      totalRevenue: data.totalRevenue,
      totalExpenses: data.totalExpenses,
      barberRevenues: JSON.stringify(data.barberRevenues),
      closedBy: session?.user?.name || "Lucas Augusto (Master Barber)",
      dateStr: selectedDate
    });
    
    if (result.success) {
      fetchData();
    } else {
      alert("Erro ao fechar caixa: " + result.error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <Lock className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-3xl font-serif text-white">Acesso Restrito ao Gestor</h2>
          <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto leading-relaxed">
            O fechamento oficial do caixa do estúdio é uma função exclusiva de Lucas Augusto.
          </p>
        </div>
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:brightness-110 transition-all shadow-lg shadow-[#DFBA73]/20"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
        </Link>
      </div>
    );
  }

  if (loading || !data) return (
    <div className="flex h-[50vh] items-center justify-center text-[#DFBA73] animate-pulse font-mono text-sm">
      Carregando dados oficiais do caixa...
    </div>
  );

  const isClosed = data.closings && data.closings.length > 0;
  const lastClosing = isClosed ? data.closings[0] : null;

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-8">
      {/* HEADER OFICIAL */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[10px] bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm font-mono">
              <Shield className="w-3 h-3 text-black" /> Gestão Exclusiva Lucas Augusto
            </span>
            <span className="text-[10px] bg-white/5 border border-white/10 text-gray-400 uppercase tracking-widest px-2.5 py-1 rounded-full font-mono">
              Solo Owner • 100% Studio
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif text-white tracking-tight">
            Fechamento Diário <span className="bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] bg-clip-text text-transparent italic">de Caixa</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-light">
            Conferência final do dia do LAS Barber Studio (100% de rendimento retido pelo Master Barber).
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#080A0E] border border-white/10 rounded-2xl px-4 py-2.5 shadow-inner">
          <label className="text-xs text-[#DFBA73] uppercase font-mono tracking-widest font-semibold">Data:</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-white text-xs font-mono outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>
      </div>
      
      {/* BANNER SE CAIXA ESTIVER FECHADO */}
      {isClosed && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center gap-4 shadow-lg shadow-emerald-500/5"
        >
          <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-emerald-400 font-serif font-bold text-lg">Caixa Oficial Fechado</h3>
            <p className="text-emerald-300/80 text-xs font-mono mt-0.5">
              Registrado em {new Date(lastClosing!.createdAt).toLocaleDateString('pt-BR')} às {new Date(lastClosing!.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por {lastClosing!.closedBy}
            </p>
          </div>
        </motion.div>
      )}

      {/* CARDS DE FATURAMENTO DIÁRIO + DESPESAS + LÍQUIDO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Faturamento Bruto Total do Dia */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-b from-[#0E1117] via-[#090B10] to-[#06070A] border border-white/10 hover:border-[#DFBA73]/45 rounded-3xl p-6 relative overflow-hidden group transition-all duration-300 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:-translate-y-0.5"
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#DFBA73]/60 to-transparent pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#DFBA73]/8 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest">Produção Bruta (Dia)</span>
            <div className="w-10 h-10 bg-[#DFBA73]/15 border border-[#DFBA73]/30 rounded-xl flex items-center justify-center text-[#DFBA73]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-serif font-bold text-white tabular-nums tracking-tight">
            R$ {data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-gray-400 font-light mt-2 pt-2.5 border-t border-white/[0.06]">
            Soma dos serviços concluídos na data.
          </p>
        </motion.div>

        {/* Despesas do Dia */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-b from-[#120B0E] via-[#0A080B] to-[#060608] border border-rose-500/20 hover:border-rose-500/45 rounded-3xl p-6 relative overflow-hidden group transition-all duration-300 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:-translate-y-0.5"
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-rose-400/60 to-transparent pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/8 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-rose-300 text-[10px] uppercase font-mono tracking-widest font-semibold">Despesas do Dia</span>
            <div className="w-10 h-10 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center justify-center text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-serif font-bold text-rose-400 tabular-nums tracking-tight">
            {(data.totalExpenses || 0) > 0 ? `- R$ ${(data.totalExpenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00"}
          </h3>
          <p className="text-xs text-gray-400 font-light mt-2 pt-2.5 border-t border-rose-500/10">
            Saídas lançadas no módulo Financeiro.
          </p>
        </motion.div>

        {/* Produção Líquida Lucas Augusto (100% Dono) */}
        {(() => {
          const dayNet = data.netRevenue ?? data.totalRevenue;
          const isPos = dayNet >= 0;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-[#14110B] via-[#0B0A08] to-[#060608] border border-[#DFBA73]/45 hover:border-[#DFBA73]/75 rounded-3xl p-6 relative overflow-hidden group transition-all duration-300 shadow-[0_20px_50px_-12px_rgba(223,186,115,0.14),inset_0_1px_0_0_rgba(245,215,153,0.12)] hover:-translate-y-0.5"
            >
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5D799] to-transparent pointer-events-none" />
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#DFBA73]/15 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-[#F5D799] text-[10px] uppercase font-mono tracking-widest font-bold">Lucro Líquido do Dia</span>
                <div className="w-10 h-10 bg-gradient-to-br from-[#F5D799] to-[#DFBA73] rounded-xl flex items-center justify-center text-black shadow-md shadow-[#DFBA73]/25">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <h3 className={`text-3xl font-serif font-bold tabular-nums tracking-tight ${isPos ? "text-[#F5D799]" : "text-rose-400"}`}>
                {dayNet < 0 ? "- " : ""}R$ {Math.abs(dayNet).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-gray-300/80 font-light mt-2 pt-2.5 border-t border-[#DFBA73]/15">
                Produção bruta menos despesas (100% Dono).
              </p>
            </motion.div>
          );
        })()}
      </div>

      {/* CONSOLIDADO MENSAL NO FECHAMENTO */}
      {data.monthlySummary && (() => {
        const m = data.monthlySummary;
        const isPos = m.netProfit >= 0;
        const costPct = m.grossRevenue > 0 ? Math.min(100, (m.expenses / m.grossRevenue) * 100) : 0;
        return (
          <div className="relative overflow-hidden bg-gradient-to-b from-[#0E1117] via-[#090B10] to-[#06070A] border border-[#DFBA73]/30 rounded-3xl p-6 md:p-7 space-y-5 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#DFBA73]/75 to-transparent pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#DFBA73] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DFBA73]" />
                  Consolidado do Mês • {m.monthLabel}
                </span>
                <h3 className="text-xl font-serif text-white mt-0.5">
                  Produção Bruta, Despesa e <span className="text-[#F5D799] italic">Lucro Líquido Mensal</span>
                </h3>
              </div>
              <Link
                href="/dashboard/financeiro"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DFBA73]/15 hover:bg-[#DFBA73] text-[#F5D799] hover:text-black border border-[#DFBA73]/35 text-xs font-mono font-bold uppercase tracking-wider transition-all self-start sm:self-center"
              >
                Ver Extrato Mensal Completo →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  Produção Bruta do Mês
                </span>
                <p className="text-2xl font-serif font-bold text-white tabular-nums mt-1.5">
                  R$ {m.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[11px] text-gray-400 font-mono block mt-1">
                  {m.completedCount} atendimentos concluídos
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-rose-500/[0.05] border border-rose-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-300 font-semibold">
                  Despesas do Mês
                </span>
                <p className="text-2xl font-serif font-bold text-rose-400 tabular-nums mt-1.5">
                  {m.expenses > 0 ? `- R$ ${m.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00"}
                </p>
                <span className="text-[11px] text-gray-400 font-mono block mt-1">
                  {m.expensesCount} lançamentos ({costPct.toFixed(1)}% do bruto)
                </span>
              </div>

              <div className={`p-5 rounded-2xl border shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] ${
                isPos
                  ? "bg-emerald-500/[0.09] border-emerald-500/35"
                  : "bg-rose-500/[0.09] border-rose-500/35"
              }`}>
                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${isPos ? "text-emerald-300" : "text-rose-300"}`}>
                  Lucro Líquido do Mês
                </span>
                <p className={`text-2xl font-serif font-bold tabular-nums mt-1.5 ${isPos ? "text-emerald-300" : "text-rose-300"}`}>
                  {m.netProfit < 0 ? "- " : ""}R$ {Math.abs(m.netProfit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <span className={`text-[11px] font-mono block mt-1 ${isPos ? "text-emerald-300/80" : "text-rose-300/80"}`}>
                  Margem líquida de {m.marginPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DETALHAMENTO DO PROFISSIONAL (COM A FOTO E DADOS DE LUCAS AUGUSTO) */}
      <div className="space-y-4">
        <h3 className="text-xl font-serif text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#DFBA73]" /> Detalhamento do Profissional
        </h3>

        <div className="space-y-4">
          {data.barberRevenues.length === 0 ? (
            <p className="text-gray-500 italic p-6 bg-white/[0.02] rounded-3xl border border-white/5 font-light">
              Nenhum faturamento registrado nesta data ({selectedDate.split("-").reverse().join("/")}).
            </p>
          ) : (
            data.barberRevenues.map((barber: BarberRevenue, idx: number) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="bg-[#080A0E] border border-white/10 hover:border-[#DFBA73]/40 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all shadow-lg"
              >
                <div className="flex items-center gap-4">
                  {/* Foto de Lucas Augusto */}
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#DFBA73] shadow-md shadow-[#DFBA73]/20 shrink-0">
                    <Image
                      src={BARBERS[0].avatar}
                      alt={barber.name}
                      fill
                      className="object-cover object-top"
                      sizes="64px"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-white font-serif font-bold text-lg">{barber.name}</h4>
                      <span className="text-[9px] uppercase font-bold font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black">
                        Solo Owner · 100%
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 font-light">
                      Master Barber & Proprietário • LAS Barber Studio
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-8 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Produção Bruta</p>
                    <p className="text-white font-serif font-bold text-base mt-0.5">
                      R$ {barber.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-[#DFBA73] uppercase font-mono tracking-wider font-semibold">Faturamento Líquido</p>
                    <h4 className="text-2xl font-serif text-[#F5D799] font-bold mt-0.5">
                      R$ {barber.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h4>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* BOTÃO DE REGISTRO DO FECHAMENTO */}
      {!isClosed ? (
        <button 
          onClick={handleClose}
          className="w-full bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold uppercase font-mono tracking-widest text-xs py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2.5 shadow-2xl shadow-[#DFBA73]/25 hover:brightness-110 cursor-pointer"
        >
          <Archive className="w-4 h-4" />
          <span>Registrar Fechamento do Caixa</span>
        </button>
      ) : (
        <div className="w-full bg-white/5 border border-white/10 text-gray-400 font-mono text-xs uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 opacity-60 cursor-not-allowed">
          <Archive className="w-4 h-4" />
          <span>Caixa Oficial já Fechado para esta Data</span>
        </div>
      )}
    </div>
  );
}
