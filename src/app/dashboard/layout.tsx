"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Users, Calendar, Settings, LogOut, Bell, Wallet, Archive, Shield, Home } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getDisplayTime } from "@/lib/timezone";
import LogoLasBarber from "@/components/LogoLasBarber";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [greeting, setGreeting] = useState("BOM DIA");

  const userRole = (session?.user as any)?.role || "ADMIN";
  const isAdmin = userRole === "ADMIN";

  // Proteção de segurança: redireciona clientes ou não autenticados
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/dashboard");
    } else if (status === "authenticated" && (session?.user as any)?.role === "CLIENT") {
      router.replace("/painel-cliente");
    }
  }, [status, session, router]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting("BOM DIA");
    } else if (hour >= 12 && hour < 18) {
      setGreeting("BOA TARDE");
    } else {
      setGreeting("BOA NOITE");
    }
  }, []);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch("/api/appointments?limit=5");
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      } catch (err) {
        console.error("Falha ao buscar notificações:", err);
      }
    };
    fetchNotifs();
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await signOut({ redirect: false });
    } catch (_) {}
    window.location.href = "/api/auth/logout";
  };

  const navItems = isAdmin
    ? [
        { id: "/dashboard", icon: LayoutDashboard, label: "Visão Geral (Studio)" },
        { id: "/dashboard/agenda", icon: Calendar, label: "Agenda Geral" },
        { id: "/dashboard/financeiro", icon: Wallet, label: "Financeiro Studio" },
        { id: "/dashboard/fechamento", icon: Archive, label: "Fechamento de Caixa" },
        { id: "/dashboard/clientes", icon: Users, label: "Clientes" },
        { id: "/dashboard/settings", icon: Settings, label: "Ajustes" },
      ]
    : [
        { id: "/dashboard", icon: LayoutDashboard, label: "Meus Atendimentos" },
        { id: "/dashboard/agenda", icon: Calendar, label: "Minha Agenda" },
        { id: "/dashboard/financeiro", icon: Wallet, label: "Meu Caixa" },
        { id: "/dashboard/clientes", icon: Users, label: "Clientes" },
        { id: "/dashboard/settings", icon: Settings, label: "Meu Perfil" },
      ];

  const userName = (session?.user?.name || "Lucas Augusto").toUpperCase();
  const userInitial = (session?.user?.name || "L")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-[#050608] text-white relative overflow-hidden font-sans selection:bg-[#DFBA73] selection:text-black">
      
      {/* Background glow effects em tom dourado nobre */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#DFBA73]/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#B88B38]/5 blur-[140px] rounded-full pointer-events-none" />

      {/* Floating Sidebar (Desktop) */}
      <nav className="hidden md:flex fixed left-8 top-1/2 -translate-y-1/2 h-[80vh] w-20 flex-col items-center py-10 bg-[#080A0E]/90 border border-white/10 backdrop-blur-2xl rounded-3xl z-50 shadow-2xl">
        <Link href="/" className="mb-auto group relative" title="Voltar ao Site">
          <LogoLasBarber variant="emblem" size={38} className="group-hover:scale-110 transition-transform duration-500" />
        </Link>

        <div className="flex flex-col gap-6">
          <Link 
            href="/" 
            className="p-3 text-gray-400 hover:text-[#DFBA73] transition-colors group relative"
            title="Voltar ao Site"
          >
            <Home className="w-5 h-5" />
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#080A0E] border border-[#DFBA73]/40 text-white rounded-lg opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap text-xs tracking-wider uppercase font-semibold shadow-xl font-mono">
              Voltar ao Site
            </div>
          </Link>

          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.id}
              className="relative group p-3"
            >
              <item.icon className="w-5 h-5 relative z-10 transition-colors duration-300 text-gray-400 group-hover:text-[#DFBA73]" />
              
              <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#080A0E] border border-[#DFBA73]/40 text-white rounded-lg opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap text-xs tracking-wider uppercase font-semibold shadow-xl font-mono">
                {item.label}
              </div>
            </Link>
          ))}
        </div>

        {/* Botão Desconectar (Desktop Lateral) */}
        <button 
          onClick={handleSignOut} 
          className="mt-auto p-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group relative cursor-pointer"
          title="Desconectar da Conta"
        >
          <LogOut className="w-5 h-5" />
          <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#080A0E] border border-red-500/40 text-red-300 rounded-lg opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap text-xs tracking-wider uppercase font-semibold shadow-xl font-mono">
            Desconectar Conta
          </div>
        </button>
      </nav>

      {/* Mobile Top Bar com Safe Area para desviar da câmera do celular */}
      <div 
        className="md:hidden sticky top-0 z-40 bg-[#050608]/95 backdrop-blur-xl border-b border-white/10 px-4 pb-3.5 flex items-center justify-between"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 0.85rem), 2.75rem)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <LogoLasBarber variant="emblem" size={28} />
          <div className="flex flex-col">
            <span className="text-xs font-serif font-bold text-white tracking-widest uppercase">LAS STUDIO</span>
            <span className="text-[9px] font-mono text-[#DFBA73] font-bold tracking-wider">PAINEL DO DONO</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#DFBA73] hover:text-black border border-white/10 text-[11px] font-bold text-gray-300 transition-all font-mono"
            title="Voltar ao Site"
          >
            <Home className="w-3.5 h-3.5 text-[#DFBA73]" />
            <span>Site</span>
          </Link>

          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)} 
            className="p-2 bg-white/5 border border-white/10 rounded-full text-gray-300 hover:text-white transition-colors relative cursor-pointer"
            aria-label="Notificações"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#DFBA73] animate-pulse" />
            )}
          </button>

          <div className="w-7 h-7 rounded-full bg-[#DFBA73]/20 border border-[#DFBA73]/40 text-[#F5D799] flex items-center justify-center font-serif text-xs font-bold">
            {userInitial}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar (Barra Inferior Mobile com botão Desconectar real) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-[#050608]/98 border-t border-white/10 z-[100] flex justify-around items-center px-2 pb-safe backdrop-blur-2xl">
        <Link href="/" className="p-3 text-gray-400 hover:text-[#DFBA73] transition-colors" title="Voltar ao Site">
          <Home className="w-5 h-5" />
        </Link>
        {navItems.slice(0, 4).map((item) => (
          <Link key={item.id} href={item.id} className="p-3 text-gray-400 hover:text-[#DFBA73] transition-colors">
            <item.icon className="w-5 h-5" />
          </Link>
        ))}
        {/* Botão Oficial de Desconectar no Mobile */}
        <button 
          onClick={handleSignOut} 
          className="p-2.5 text-red-400 hover:text-red-300 active:scale-95 transition-all flex flex-col items-center cursor-pointer" 
          title="Desconectar da Conta"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[8px] font-mono uppercase tracking-wider text-red-400 font-bold mt-0.5">Sair</span>
        </button>
      </nav>

      {/* Desktop Top Header */}
      <header className="hidden md:flex pl-36 pr-12 pt-10 justify-between items-end relative z-40">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md shadow-[#DFBA73]/20 font-mono">
              <Shield className="w-3.5 h-3.5" /> Gestor do Estúdio • Dono
            </span>
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-serif text-white tracking-tight"
          >
            {greeting}, <span className="text-[#F5D799] italic">{userName}</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-300 text-xs md:text-sm mt-1.5 font-light"
          >
            Painel do Studio • LAS Barber Studio • Gestão solo, agenda e faturamento de Lucas Augusto.
          </motion.p>
        </div>

        {/* User Badge & Actions (Desktop) */}
        <div className="flex items-center gap-3 relative">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-[#DFBA73] hover:text-black border border-white/10 text-xs font-bold text-gray-300 transition-all shadow-sm font-mono tracking-wider uppercase"
            title="Voltar ao Site"
          >
            <Home className="w-4 h-4 text-[#DFBA73]" />
            <span>Voltar ao Site</span>
          </Link>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-300 hover:text-red-200 transition-all shadow-sm font-mono tracking-wider uppercase cursor-pointer"
            title="Encerrar sessão e desconectar a conta"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Desconectar</span>
          </button>

          <div className="relative">
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)} 
              className="p-3 bg-white/5 border border-white/10 rounded-full text-gray-300 hover:text-white transition-colors relative cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#DFBA73] animate-pulse" />
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsNotifOpen(false)} 
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 top-full mt-3 w-80 max-w-[calc(100vw-2rem)] bg-[#080A0E] border border-[#DFBA73]/40 rounded-2xl p-4 shadow-2xl shadow-black/95 z-50 backdrop-blur-2xl ring-1 ring-white/10 font-sans"
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                      <h4 className="text-sm font-serif text-white">Últimos Atendimentos</h4>
                      <span className="text-[10px] text-[#DFBA73] font-mono font-medium">Recentes</span>
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">Sem notificações no momento.</p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="text-xs p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-[#DFBA73]/30 transition-colors">
                            <div className="flex items-center justify-between">
                              <p className="text-white font-medium">{n.user?.name || "Cliente"}</p>
                              <span className="text-[10px] text-[#DFBA73] font-mono font-bold">
                                {getDisplayTime(n.date)}
                              </span>
                            </div>
                            <p className="text-gray-400 text-[11px] mt-0.5">
                              {n.service?.name} {n.service?.price ? `• R$ ${Number(n.service.price).toFixed(2)}` : ""}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="md:pl-36 md:pr-12 px-4 pt-6 pb-24 md:pb-16 relative z-10">
        {children}
      </main>
    </div>
  );
}
