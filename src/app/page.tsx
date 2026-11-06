"use client";

import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Calendar, ChevronRight, ChevronLeft, Menu, MapPin, X, Star, Smartphone, Clock, Sparkles, LogOut } from "lucide-react";
import { useState, useEffect, useRef, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import BookingModal from "@/components/BookingModal";
import { useSession, signOut } from "next-auth/react";
import ExperienciaSection from "@/components/ExperienciaSection";
import NossaAreaSection from "@/components/NossaAreaSection";
import StudioVideoSection from "@/components/StudioVideoSection";
import ServicesMenuSection from "@/components/ServicesMenuSection";
import LogoLasBarber from "@/components/LogoLasBarber";
import FloatingSocialButtons from "@/components/FloatingSocialButtons";

// --- FOTOS PRINCIPAIS AUTÊNTICAS DO ESTÚDIO ---
const HERO_IMAGES = [
  "/studio/hero-new-1.jpg",
  "/studio/hero-new-2.jpg",
  "/studio/hero-new-3.jpg",
];

// --- COMPONENTES ANIMADOS PREMIUM ---
const RevealText = ({ children, delay = 0 }: { children: ReactNode, delay?: number }) => (
  <div className="overflow-hidden">
    <motion.div
      initial={{ y: "100%" }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, delay, ease: [0.33, 1, 0.68, 1] }}
    >
      {children}
    </motion.div>
  </div>
);

const MagneticButton = ({ children, className = "" }: { children: ReactNode, className?: string }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { clientX, clientY } = e;
    if (!ref.current) return;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.2, y: middleY * 0.2 });
  };

  const reset = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={className}
    >
      {children}
    </motion.button>
  );
};

// --- PÁGINA PRINCIPAL ---
export default function Home() {
  const { data: session } = useSession();
  const [currentImage, setCurrentImage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const openBooking = (serviceId?: string) => {
    setSelectedServiceId(serviceId);
    setIsModalOpen(true);
  };

  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  useEffect(() => {
    const loaderTimer = setTimeout(() => setIsLoading(false), 800);
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 6000);
    return () => {
      clearTimeout(loaderTimer);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const nextSlide = () => setCurrentImage((prev) => (prev + 1) % HERO_IMAGES.length);
  const prevSlide = () => setCurrentImage((prev) => (prev - 1 + HERO_IMAGES.length) % HERO_IMAGES.length);

  return (
    <div className="min-h-screen bg-[#050608] text-white font-sans selection:bg-[#DFBA73] selection:text-black">
      
      {/* LOADER INICIAL COM LOGO EM COMPONENTE (SEM TESOURA) */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[100] bg-[#050608] flex items-center justify-center flex-col"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="p-3 rounded-full border border-[#DFBA73]/30 bg-black/40 shadow-2xl shadow-[#DFBA73]/20"
            >
              <LogoLasBarber variant="emblem" size={88} />
            </motion.div>
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="mt-6 font-serif text-[#DFBA73] tracking-[0.3em] uppercase text-sm font-bold font-mono"
            >
              LAS BARBER STUDIO
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAVBAR MINIMALISTA LUXO */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? -20 : 0 }}
        transition={{ duration: 0.8, delay: 1 }}
        className="fixed top-0 w-full px-6 md:px-12 py-6 flex justify-between items-center z-50 mix-blend-difference"
      >
        <Link href="/" className="cursor-pointer group">
          <LogoLasBarber variant="horizontal" size={42} />
        </Link>
        
        <div className="hidden md:flex items-center gap-12 text-xs uppercase tracking-[0.2em] text-gray-300 font-semibold font-mono">
          <a href="#servicos" className="hover:text-[#DFBA73] transition-colors relative group py-1">
            Serviços
            <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-[#DFBA73] transition-all duration-300 group-hover:w-full"></span>
          </a>
          <a href="#experiencia" className="hover:text-[#DFBA73] transition-colors relative group py-1">
            A Experiência
            <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-[#DFBA73] transition-all duration-300 group-hover:w-full"></span>
          </a>
          <a href="#nossa-area" className="hover:text-[#DFBA73] transition-colors relative group py-1">
            O Estúdio
            <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-[#DFBA73] transition-all duration-300 group-hover:w-full"></span>
          </a>
          {session ? (
            <div className="flex items-center gap-3">
              <Link href={((session?.user as any)?.role === "CLIENT" ? "/painel-cliente" : "/dashboard")} className="hover:text-[#DFBA73] transition-colors relative group py-1">
                Painel
                <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-[#DFBA73] transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                    await signOut({ redirect: false });
                  } catch (_) {}
                  window.location.href = "/api/auth/logout";
                }}
                className="text-gray-400 hover:text-red-400 transition-colors p-1 cursor-pointer"
                title="Desconectar da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="hover:text-[#DFBA73] transition-colors relative group py-1">
              Login
              <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-[#DFBA73] transition-all duration-300 group-hover:w-full"></span>
            </Link>
          )}
          <div onClick={() => openBooking()}>
            <MagneticButton className="bg-[#DFBA73] text-[#050608] px-8 py-4 flex items-center gap-3 hover:bg-white hover:text-black transition-colors duration-300 font-bold uppercase tracking-[0.15em] text-xs shadow-lg shadow-[#DFBA73]/20 cursor-pointer">
              <Calendar className="w-4 h-4" /> AGENDAR COM LUCAS
            </MagneticButton>
          </div>
        </div>
        
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="md:hidden text-white z-50 p-2 cursor-pointer hover:text-[#DFBA73] transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-8 h-8" />
        </button>
      </motion.nav>

      {/* MENU MOBILE CINEMATOGRÁFICO DE LUXO (100% ISOLADO, SEM SOBREPOSIÇÃO) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -25 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-[100] bg-[#02050A] flex flex-col justify-between p-6 overflow-y-auto md:hidden"
          >
            {/* Topo do Menu Mobile */}
            <div className="flex items-center justify-between pb-5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <LogoLasBarber variant="emblem" size={38} />
                <div className="flex flex-col">
                  <span className="text-base font-serif tracking-[0.24em] text-white uppercase font-bold">
                    LAS BARBER STUDIO
                  </span>
                  <span className="text-[9px] font-mono tracking-[0.3em] text-[#DFBA73] uppercase font-bold">
                    ESTÚDIO PRIVATIVO • LUCAS AUGUSTO
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer"
                aria-label="Fechar Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links Estilo Cards VIP (Nítido, intuitivo e sem sobreposição) */}
            <div className="flex-1 py-6 flex flex-col justify-center gap-2.5">
              <p className="text-[10px] uppercase font-bold tracking-[0.35em] text-[#DFBA73] mb-0.5 font-mono">
                Navegação Exclusiva
              </p>

              {/* 01 Serviços Oficiais */}
              <a
                href="#servicos"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#DFBA73]/40 active:bg-[#DFBA73]/10 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-xs font-mono font-bold text-[#DFBA73] w-6 h-6 rounded-lg bg-[#DFBA73]/10 flex items-center justify-center border border-[#DFBA73]/30">
                    01
                  </span>
                  <div>
                    <span className="text-sm font-serif text-white block group-hover:text-[#F5D799] transition-colors">
                      Cardápio de Serviços
                    </span>
                    <span className="text-[11px] text-gray-400 font-light">
                      Cortes de cabelo, barboterapia e rituais completos
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#DFBA73] transition-colors" />
              </a>

              {/* 02 A Experiência */}
              <a
                href="#experiencia"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#DFBA73]/40 active:bg-[#DFBA73]/10 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-xs font-mono font-bold text-[#DFBA73] w-6 h-6 rounded-lg bg-[#DFBA73]/10 flex items-center justify-center border border-[#DFBA73]/30">
                    02
                  </span>
                  <div>
                    <span className="text-sm font-serif text-white block group-hover:text-[#F5D799] transition-colors">
                      A Experiência do Studio
                    </span>
                    <span className="text-[11px] text-gray-400 font-light">
                      Atendimento 1 a 1 exclusivo e corte sob medida
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#DFBA73] transition-colors" />
              </a>

              {/* 03 Nosso Estúdio */}
              <a
                href="#nossa-area"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#DFBA73]/40 active:bg-[#DFBA73]/10 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-xs font-mono font-bold text-[#DFBA73] w-6 h-6 rounded-lg bg-[#DFBA73]/10 flex items-center justify-center border border-[#DFBA73]/30">
                    03
                  </span>
                  <div>
                    <span className="text-sm font-serif text-white block group-hover:text-[#F5D799] transition-colors">
                      O Estúdio & Localização
                    </span>
                    <span className="text-[11px] text-gray-400 font-light">
                      Rua dos Ipês, Nº 360 · Centro, Comodoro - MT
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#DFBA73] transition-colors" />
              </a>

              {/* 04 Área do Cliente / Barbeiro */}
              <Link
                href={session ? ((session?.user as any)?.role === "CLIENT" ? "/painel-cliente" : "/dashboard") : "/login"}
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#DFBA73]/40 active:bg-[#DFBA73]/10 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-xs font-mono font-bold text-[#DFBA73] w-6 h-6 rounded-lg bg-[#DFBA73]/10 flex items-center justify-center border border-[#DFBA73]/30">
                    04
                  </span>
                  <div>
                    <span className="text-sm font-serif text-white block group-hover:text-[#F5D799] transition-colors">
                      {session ? "Meu Painel VIP" : "Área do Cliente / Barbeiro"}
                    </span>
                    <span className="text-[11px] text-gray-400 font-light">
                      {session ? "Consulte seus horários agendados" : "Acesse com seu login e senha"}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#DFBA73] transition-colors" />
              </Link>

              {session && (
                <button
                  type="button"
                  onClick={async () => {
                    setIsMobileMenuOpen(false);
                    try {
                      await fetch("/api/auth/logout", { method: "POST" });
                      await signOut({ redirect: false });
                    } catch (_) {}
                    window.location.href = "/api/auth/logout";
                  }}
                  className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 active:bg-red-500/20 flex items-center justify-between transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                      <LogOut className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-sm font-serif text-red-300 block">
                        Desconectar Conta
                      </span>
                      <span className="text-[10px] text-gray-400 font-light">
                        Encerrar sessão de {(session?.user?.name || "usuário")}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-red-400 font-mono uppercase tracking-wider font-bold">Sair</span>
                </button>
              )}

              {/* 05 Avaliação no Google */}
              <a
                href="https://share.google/chfF9rq5kwguwJSIE"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3.5 rounded-2xl bg-[#DFBA73]/[0.08] border border-[#DFBA73]/30 active:bg-[#DFBA73]/20 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-7 h-7 rounded-lg bg-[#DFBA73]/20 text-[#DFBA73] flex items-center justify-center shrink-0 border border-[#DFBA73]/40">
                    <Star className="w-3.5 h-3.5 fill-[#DFBA73]" />
                  </div>
                  <div>
                    <span className="text-sm font-serif text-white block group-hover:text-[#F5D799] transition-colors">
                      Avalie no Google (5.0 ★)
                    </span>
                    <span className="text-[11px] text-[#DFBA73]/90 font-light">
                      LAS Barber Studio em Comodoro - MT
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#DFBA73]" />
              </a>

              {/* 06 Baixar Aplicativo */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("trigger-pwa-install"));
                  }
                }}
                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 active:bg-white/10 flex items-center justify-between transition-all text-left w-full group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/15">
                    <Smartphone className="w-3.5 h-3.5 text-[#DFBA73]" />
                  </div>
                  <div>
                    <span className="text-sm font-serif text-white block group-hover:text-[#F5D799] transition-colors">
                      Baixar Aplicativo do Studio
                    </span>
                    <span className="text-[11px] text-gray-400 font-light">
                      Instale no iPhone, Android ou Computador
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#DFBA73]" />
              </button>
            </div>

            {/* Ações Inferiores do Menu Mobile */}
            <div className="space-y-3 pt-4 border-t border-white/10 shrink-0">
              <button 
                onClick={() => { setIsMobileMenuOpen(false); openBooking(); }}
                className="w-full bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black py-3.5 px-4 rounded-xl font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-2 shadow-xl shadow-[#DFBA73]/25 hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer font-mono"
              >
                <Calendar className="w-4 h-4 text-black" /> AGENDAR COM LUCAS
              </button>

              <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 pt-1 font-mono">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#DFBA73]" /> Seg a Sáb · 08h às 20h (Sáb até 18h)</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#DFBA73]" /> Comodoro - MT</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BookingModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedServiceId(undefined);
        }} 
        initialServiceId={selectedServiceId}
      />

      {/* HERO SECTION COM PARALLAX E MÁSCARAS */}
      <main className="relative h-screen flex items-center justify-center overflow-hidden">
        
        {/* Imagens de Fundo com Transição Suave e Sem Tremor (Pré-carregadas) */}
        <motion.div style={{ y, opacity }} className="absolute inset-0 w-full h-[120%] -top-[10%] overflow-hidden">
          {HERO_IMAGES.map((img, idx) => (
            <motion.div
              key={img}
              initial={false}
              animate={{
                opacity: idx === currentImage ? 1 : 0,
                scale: idx === currentImage ? 1 : 1.04,
              }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 bg-cover bg-center will-change-transform transform-gpu filter brightness-[1.06] contrast-[1.04] saturate-[1.12]"
              style={{ backgroundImage: `url(${img})` }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-[#050608]/30 via-transparent to-[#050608]/90 pointer-events-none" />
        </motion.div>

        {/* Textos Centrais com Máscara */}
        <div className="relative z-10 text-center flex flex-col items-center mt-20 px-4 max-w-5xl mx-auto">
          
          {/* Badge Superior com Linhas Douradas */}
          <RevealText delay={1.2}>
            <p className="text-[#DFBA73] uppercase tracking-[0.4em] text-sm font-semibold mb-6 flex items-center justify-center gap-4 font-mono">
              <span className="w-8 md:w-12 h-[1px] bg-[#DFBA73]"></span>
              Estúdio Privativo • Lucas Augusto
              <span className="w-8 md:w-12 h-[1px] bg-[#DFBA73]"></span>
            </p>
          </RevealText>
          
          {/* Título Monumental com Letras Contornadas e Dourado */}
          <h1 className="text-5xl sm:text-6xl md:text-[6.8rem] font-serif leading-[0.92] tracking-tight uppercase flex flex-col items-center">
            <RevealText delay={1.3}>
              VISUAL{" "}
              <span className="italic text-transparent [-webkit-text-stroke:1px_white] hover:text-white transition-colors duration-500">
                IMPECÁVEL,
              </span>
            </RevealText>
            <RevealText delay={1.4}>
              <span className="text-[#DFBA73]">EXPERIÊNCIA</span> EXCLUSIVA.
            </RevealText>
          </h1>

          {/* Botões CTA com Efeito Magnético */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? 20 : 0 }} 
            transition={{ delay: 1.6, duration: 1 }}
            className="mt-10 md:mt-12 flex flex-col sm:flex-row gap-6 items-center justify-center"
          >
            <div onClick={() => openBooking()}>
              <MagneticButton className="border border-white/20 px-10 py-5 uppercase tracking-[0.2em] text-xs hover:bg-[#DFBA73] hover:border-[#DFBA73] hover:text-[#050608] transition-all duration-500 flex items-center gap-4 group backdrop-blur-md bg-white/5 font-bold cursor-pointer">
                <span>Reservar Meu Horário</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </MagneticButton>
            </div>
            
            <a 
              href="#nossa-area"
              className="text-xs uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-colors py-4 px-6 relative group font-mono"
            >
              Conhecer o Espaço
              <span className="absolute bottom-2 left-6 right-6 h-[1px] bg-white/30 group-hover:bg-[#DFBA73] transition-colors" />
            </a>
          </motion.div>
        </div>

        {/* Controles do Slider */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: isLoading ? 0 : 1 }} 
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-12 left-6 md:left-12 flex items-center gap-6 z-20"
        >
           <button 
             onClick={prevSlide} 
             className="p-3 border border-white/20 rounded-full hover:bg-white hover:text-black transition-colors cursor-pointer"
             aria-label="Slide anterior"
           >
             <ChevronLeft className="w-4 h-4" />
           </button>
           <div className="flex gap-3">
             {HERO_IMAGES.map((_, idx) => (
               <div 
                 key={idx} 
                 onClick={() => setCurrentImage(idx)} 
                 className={`h-1 cursor-pointer transition-all duration-700 ease-out ${
                   idx === currentImage 
                     ? "w-16 bg-[#DFBA73]" 
                     : "w-6 bg-white/20 hover:bg-white/50"
                 }`} 
               />
             ))}
           </div>
           <button 
             onClick={nextSlide} 
             className="p-3 border border-white/20 rounded-full hover:bg-white hover:text-black transition-colors cursor-pointer"
             aria-label="Próximo slide"
           >
             <ChevronRight className="w-4 h-4" />
           </button>
        </motion.div>
      </main>

      {/* MARQUEE GIGANTE E INVERTIDO */}
      <div className="bg-[#050608] border-y border-white/10 py-6 overflow-hidden flex whitespace-nowrap -rotate-1 scale-105 transform-gpu relative z-20">
        <motion.div 
          animate={{ x: ["-50%", "0%"] }} 
          transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
          className="flex font-serif text-5xl uppercase tracking-widest text-[#DFBA73] opacity-80"
        >
           {[...Array(6)].map((_, i) => (
              <span key={i} className="mx-12 flex items-center gap-12">
                 Corte Premium <span className="text-white/20">✦</span> Barboterapia SPA <span className="text-white/20">✦</span> Alta Precisão <span className="text-white/20">✦</span> Estilo <span className="text-white/20">✦</span>
              </span>
           ))}
        </motion.div>
      </div>

      {/* SESSÃO: CARDÁPIO AUTORAL DE SERVIÇOS & RITUAIS (MANTIDO IDÊNTICO) */}
      <ServicesMenuSection onSelectService={(serviceId) => openBooking(serviceId)} />

      {/* SESSÃO: A EXPERIÊNCIA */}
      <ExperienciaSection />

      {/* SESSÃO: O ESTÚDIO PRIVATIVO & LOCALIZAÇÃO */}
      <NossaAreaSection />

      {/* VÍDEO TOUR OFICIAL DO ESTÚDIO */}
      <StudioVideoSection />

      {/* FINAL CTA & FOOTER LAS BARBER STUDIO */}
      <section className="relative bg-[#02050A] text-[#DFBA73] min-h-screen flex flex-col items-center justify-between overflow-hidden">
        {/* Foto Oficial de Fundo Preenchendo Toda a Sessão com Posição Nobre */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <Image
            src="/studio/cta-signature.jpg"
            alt="LAS Barber Studio - Estúdio Privativo Lucas Augusto"
            fill
            quality={95}
            priority
            className="object-cover object-center md:object-[center_35%] scale-100"
          />
          {/* Overlays Cinematográficos para Legibilidade e Atmosfera de Alto Padrão */}
          <div className="absolute inset-0 bg-black/45 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#02050A] via-[#02050A]/40 to-[#050608]/85 pointer-events-none" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-8 flex flex-col items-center justify-center flex-1 py-28 md:py-36 text-center">
          
          {/* Medalhão da Logo LAS Girando suavemente no Círculo (SEM TESOURA) */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
            className="w-24 h-24 rounded-full border border-[#DFBA73]/50 flex items-center justify-center mb-10 backdrop-blur-md bg-black/60 shadow-[0_0_30px_rgba(223,186,115,0.25)]"
          >
            <LogoLasBarber variant="emblem" size={76} />
          </motion.div>

          {/* Título Monumental */}
          <div className="text-center space-y-4 mb-14 relative max-w-4xl">
             <motion.h2 
               initial={{ opacity: 0, y: 40 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
               className="text-[3.5rem] sm:text-[5rem] md:text-[7.5rem] font-serif leading-[0.88] tracking-tight uppercase text-white drop-shadow-2xl"
             >
               A Sua Nova <br /> 
               <span className="text-transparent [-webkit-text-stroke:2px_#DFBA73] hover:text-[#DFBA73] transition-colors duration-700">
                 Assinatura
               </span>
             </motion.h2>
             <motion.p 
               initial={{ opacity: 0, scale: 0.9 }}
               whileInView={{ opacity: 1, scale: 1 }}
               viewport={{ once: true }}
               transition={{ delay: 0.3, duration: 0.8 }}
               className="text-lg md:text-2xl text-gray-200 font-light max-w-2xl mx-auto italic drop-shadow-md leading-relaxed"
             >
               Onde privacidade e técnica refinada se encontram para redefinir o seu estilo.
             </motion.p>
          </div>

          {/* Botão Magnético Gigante com Reflexo Animado */}
          <motion.div 
             initial={{ opacity: 0, y: 40 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.5, duration: 0.8, type: "spring" }}
             onClick={() => openBooking()} 
             className="relative group cursor-pointer"
           >
             <div className="absolute -inset-4 rounded-full bg-[#DFBA73]/25 blur-2xl group-hover:bg-[#DFBA73]/50 transition-all duration-700" />
             <MagneticButton className="relative bg-[#DFBA73] text-[#050608] px-14 py-7 md:px-16 md:py-8 rounded-full uppercase tracking-[0.35em] text-xs md:text-sm font-black overflow-hidden transform hover:scale-105 transition-transform duration-500 cursor-pointer shadow-2xl shadow-[#DFBA73]/40">
               <motion.div 
                 animate={{ y: ["0%", "-100%", "0%"] }}
                 transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[45deg]"
               />
               <span className="relative z-10 flex items-center gap-3">
                 <Calendar className="w-5 h-5" /> Reservar Horário
               </span>
             </MagneticButton>
           </motion.div>
        </div>

        {/* Rodapé Oficial LAS Barber Studio */}
        <motion.footer 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 1 }}
          className="w-full border-t border-white/10 py-8 flex flex-col md:flex-row items-center justify-between px-6 md:px-16 z-20 bg-[#02050A]/90 backdrop-blur-xl"
        >
           <div className="mb-4 md:mb-0">
              <LogoLasBarber variant="horizontal" size={32} />
           </div>
           <p className="text-gray-400 text-[10px] tracking-[0.3em] uppercase font-mono">
             © {new Date().getFullYear()} O PADRÃO DE EXCELÊNCIA • LUCAS AUGUSTO.
           </p>
           <div className="flex items-center gap-6 mt-4 md:mt-0 text-xs">
              <a 
                href="https://www.instagram.com/lasbarberstudio_" 
                target="_blank" 
                rel="noreferrer" 
                className="text-gray-300 hover:text-[#DFBA73] transition-colors font-mono uppercase tracking-wider"
              >
                Instagram
              </a>
              <a 
                href="https://share.google/chfF9rq5kwguwJSIE" 
                target="_blank" 
                rel="noreferrer" 
                className="text-gray-300 hover:text-[#DFBA73] transition-colors flex items-center gap-1 font-mono uppercase tracking-wider"
              >
                <MapPin className="w-3.5 h-3.5 text-[#DFBA73]" /> Localização • Comodoro MT
              </a>
           </div>
        </motion.footer>
      </section>

      {/* BOTÃO FLUTUANTE DE WHATSAPP / SOCIAL */}
      <FloatingSocialButtons />

    </div>
  );
}
