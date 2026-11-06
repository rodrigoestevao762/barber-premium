"use client";

import { useEffect, useState } from "react";
import { getFechamentoData, closeCashRegister } from "./actions";
import { motion } from "framer-motion";
import { Archive, DollarSign, Wallet, Shield, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { BARBERS } from "@/lib/barbers";

type BarberRevenue = { id?: string; name: string; total: number; commission: number; rate?: number; isOwner?: boolean };
type FechamentoData = { totalRevenue: number; barberRevenues: BarberRevenue[]; closings: { createdAt: string | Date; closedBy: string | null }[] };

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
    setLoading(true);
    const result = await getFechamentoData(selectedDate);
    if (result.success) {
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

      {/* CARDS DE FATURAMENTO COM O OURO ESCOVADO DA VISÃO GERAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Faturamento Bruto Total */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#080A0E] border border-white/10 rounded-3xl p-7 relative overflow-hidden group hover:border-[#DFBA73]/40 transition-all shadow-xl shadow-black/40"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#DFBA73]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#DFBA73]/10 border border-[#DFBA73]/30 rounded-2xl flex items-center justify-center text-[#DFBA73]">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-[10px] uppercase font-mono tracking-widest">Faturamento Bruto</p>
              <h3 className="text-3xl md:text-4xl font-serif text-white tracking-tight mt-1">
                R$ {data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-500 font-light">Soma de todos os cortes e atendimentos realizados no estúdio.</p>
        </motion.div>

        {/* Produção Líquida Lucas Augusto (100% Dono) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-[#080A0E] via-[#050608] to-[#DFBA73]/10 border border-[#DFBA73]/40 rounded-3xl p-7 relative overflow-hidden group hover:border-[#DFBA73]/60 transition-all shadow-xl shadow-black/40"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#DFBA73]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-[#F5D799] to-[#DFBA73] rounded-2xl flex items-center justify-center text-black shadow-md shadow-[#DFBA73]/20">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[#F5D799] text-[10px] uppercase font-mono tracking-widest font-bold">Total Líquido do Dono (100%)</p>
              <h3 className="text-3xl md:text-4xl font-serif text-[#F5D799] tracking-tight mt-1">
                R$ {data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-400 font-light">Modelo solo: 100% retido pelo Master Barber Lucas Augusto.</p>
        </motion.div>
      </div>

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
