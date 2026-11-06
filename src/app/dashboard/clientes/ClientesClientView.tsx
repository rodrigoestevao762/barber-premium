"use client";

import { useState, useMemo } from "react";
import { Users, Phone, Mail, Search, MessageSquare, Calendar, ShieldCheck, Crown, ExternalLink } from "lucide-react";

export interface ClientData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  totalAppointments: number;
  lastAppointmentDate?: string | null;
  lastServiceName?: string | null;
}

export default function ClientesClientView({ initialClients }: { initialClients: ClientData[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return initialClients;
    const term = searchTerm.toLowerCase().trim();
    const digits = searchTerm.replace(/\D/g, "");

    return initialClients.filter((c) => {
      const matchName = c.name?.toLowerCase().includes(term);
      const matchEmail = c.email?.toLowerCase().includes(term);
      const matchPhone = c.phone ? c.phone.replace(/\D/g, "").includes(digits || term) : false;
      return matchName || matchEmail || matchPhone;
    });
  }, [initialClients, searchTerm]);

  const totalClients = initialClients.length;
  const clientsWithBookings = initialClients.filter((c) => c.totalAppointments > 0).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
      
      {/* Top Banner & Métricas de Clientes */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#DFBA73]/30 bg-[#DFBA73]/10 text-[#F5D799] text-[11px] font-mono uppercase tracking-widest mb-3">
            <Crown className="w-3.5 h-3.5 text-[#DFBA73]" /> Registro Oficial de Clientes VIP
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif text-white tracking-wide">
            Base de Contas de Clientes
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1.5 font-light">
            Acompanhe o cadastro, contatos de WhatsApp e histórico de agendamentos de cada cliente do estúdio.
          </p>
        </div>

        {/* Mini Cards de Estatísticas */}
        <div className="flex items-center gap-4">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 text-center min-w-[120px]">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-mono block">Cadastrados</span>
            <span className="text-2xl font-serif text-white font-bold">{totalClients}</span>
          </div>
          <div className="bg-[#DFBA73]/10 border border-[#DFBA73]/30 rounded-2xl px-5 py-3 text-center min-w-[120px]">
            <span className="text-[10px] uppercase tracking-widest text-[#DFBA73] font-mono block">Com Agendamento</span>
            <span className="text-2xl font-serif text-[#F5D799] font-bold">{clientsWithBookings}</span>
          </div>
        </div>
      </div>

      {/* Barra de Pesquisa Rápida */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Search className="w-4 h-4 text-gray-500" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome, WhatsApp ou e-mail..."
          className="w-full bg-white/[0.03] border border-white/10 hover:border-white/20 focus:border-[#DFBA73] rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none transition-colors duration-150 font-sans"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs text-gray-500 hover:text-white"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Grid de Cards de Clientes */}
      {filteredClients.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-serif text-white">Nenhum cliente encontrado</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
            {searchTerm 
              ? "Nenhum resultado corresponde à sua pesquisa. Tente outros termos." 
              : "Assim que os clientes agendarem um horário ou criarem conta VIP, o registro aparecerá aqui automaticamente com todos os dados e atalho direto para o WhatsApp."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const initial = (client.name || "C")[0].toUpperCase();
            const rawPhone = client.phone || "";
            const cleanPhone = rawPhone.replace(/\D/g, "");
            const hasPhone = cleanPhone.length >= 10;
            const waNumber = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
            const waUrl = hasPhone 
              ? `https://wa.me/${waNumber}?text=Olá%20${encodeURIComponent(client.name)},%20tudo%20bem?%20Aqui%20é%20o%20Lucas%20Augusto%20da%20LAS%20Barber%20Studio!`
              : null;

            let formattedDate = "Data não informada";
            try {
              if (client.createdAt) {
                const d = new Date(client.createdAt);
                formattedDate = d.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
              }
            } catch (_) {}

            return (
              <div 
                key={client.id}
                className="bg-gradient-to-b from-white/[0.04] to-black/30 border border-white/10 hover:border-[#DFBA73]/40 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xl group hover:shadow-[#DFBA73]/5 relative overflow-hidden"
              >
                {/* Linha de brilho superior ao passar o mouse */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#DFBA73]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#DFBA73]/20 to-[#B88B38]/10 border border-[#DFBA73]/40 text-[#F5D799] flex items-center justify-center font-serif text-lg font-bold shadow-md shrink-0">
                        {initial}
                      </div>
                      <div>
                        <h4 className="text-white font-serif font-bold text-lg leading-tight group-hover:text-[#F5D799] transition-colors">
                          {client.name || "Cliente VIP"}
                        </h4>
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mt-0.5">
                          Cadastrado em {formattedDate}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#DFBA73]/15 text-[#F5D799] border border-[#DFBA73]/30 text-[9px] font-mono font-bold uppercase tracking-wider shrink-0">
                      <ShieldCheck className="w-3 h-3 text-[#DFBA73]" /> VIP
                    </span>
                  </div>

                  {/* Detalhes de Contato */}
                  <div className="space-y-2.5 py-3 border-y border-white/5 font-mono text-xs">
                    <div className="flex items-center gap-2.5 text-gray-300">
                      <Phone className="w-3.5 h-3.5 text-[#DFBA73] shrink-0" />
                      <span className="truncate">{rawPhone || "WhatsApp não informado"}</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-gray-300">
                      <Mail className="w-3.5 h-3.5 text-[#DFBA73] shrink-0" />
                      <span className="truncate">{client.email || "E-mail não informado"}</span>
                    </div>

                    {client.lastServiceName && (
                      <div className="flex items-center gap-2.5 text-gray-400 text-[11px] pt-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span className="truncate">Último: <strong className="text-white font-normal">{client.lastServiceName}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé com Histórico e Botão de WhatsApp */}
                <div className="mt-5 pt-3 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-mono text-gray-400">
                    <span className="text-white font-bold">{client.totalAppointments}</span> {client.totalAppointments === 1 ? "agendamento" : "agendamentos"}
                  </div>

                  {waUrl ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/40 text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-sm hover:shadow-[#25D366]/20"
                      title="Abrir conversa no WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                  ) : (
                    <span className="text-[10px] font-mono text-gray-600">Sem WhatsApp</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
