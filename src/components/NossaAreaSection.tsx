"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { MapPin, Clock, ChevronRight, Play, Pause, Volume2, VolumeX, Star, ExternalLink, Sparkles } from "lucide-react";
import LogoLasBarber from "@/components/LogoLasBarber";

const GOOGLE_MAPS_URL = "https://share.google/chfF9rq5kwguwJSIE";
const GOOGLE_REVIEW_URL = "https://share.google/chfF9rq5kwguwJSIE";

const GALLERY_PHOTOS = [
  {
    src: "/studio/hero-new-1.jpg",
    label: "O Espaço & Lounge",
    desc: "Piso em madeira nobre, sofá de couro e recepção exclusiva.",
    col: "col-span-2 row-span-1",
  },
  {
    src: "/studio/studio-bancada.jpg",
    label: "Bancada de Precisão",
    desc: "Ferramentas profissionais esterilizadas e máxima ergonomia para o seu atendimento.",
    col: "col-span-1 row-span-1",
  },
  {
    src: "/studio/cover-4.jpg",
    label: "A Estação Privativa",
    desc: "Espelho cápsula iluminado e poltrona ergonômica de alta precisão.",
    col: "col-span-1 row-span-1",
  },
  {
    src: "/studio/cover-5.jpg",
    label: "Ambiente Cênico",
    desc: "Linha profissional K'ENZZA e iluminação arquitetural acolhedora.",
    col: "col-span-1 row-span-1",
  },
  {
    src: "/studio/cover-3.jpg",
    label: "SPA da Barba",
    desc: "Toalha aquecida aromática, óleos essenciais e navalha clássica relaxante.",
    col: "col-span-1 row-span-1",
  },
  {
    src: "/studio/conforto-lounge-real.jpg",
    label: "Conforto Sem Pressa",
    desc: "Café expresso de boas-vindas, frigobar executivo e lounge de descanso privativo.",
    col: "col-span-1 row-span-1",
  },
  {
    src: "/studio/cover-1.jpg",
    label: "Estrutura Completa",
    desc: "Cosméticos nobres L'Occitane & K'ENZZA e máxima higiene.",
    col: "col-span-2 row-span-1",
  },
];

const HORARIOS = [
  { dia: "Segunda – Sexta", hora: "08:00 – 20:00" },
  { dia: "Sábado", hora: "08:00 – 18:00" },
  { dia: "Domingo", hora: "Fechado" },
];

// Card do Vídeo Tour em Formato Maior e Interativo
function VideoTourCard() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      onClick={togglePlay}
      className="relative overflow-hidden rounded-3xl cursor-pointer col-span-1 row-span-2 border border-[#DFBA73]/30 shadow-[0_20px_60px_rgba(223,186,115,0.12)] group bg-[#080A0E]"
      style={{ minHeight: 520 }}
    >
      {/* Vídeo */}
      <video
        ref={videoRef}
        src="/studio/las-studio-video.mp4"
        autoPlay
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Gradientes de contraste para controles e textos */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050608]/95 via-[#050608]/20 to-[#050608]/70 pointer-events-none" />

      {/* Topo: Badge Tour VIP */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
        <span className="px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest bg-[#050608]/90 text-[#DFBA73] border border-[#DFBA73]/40 backdrop-blur-md flex items-center gap-1.5 shadow-lg font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Tour em Vídeo
        </span>
        <span className="text-[10px] text-gray-300 font-serif italic bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
          LAS Barber Studio
        </span>
      </div>

      {/* Centro: Botão Play/Pause Flutuante */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <motion.div
          animate={{ scale: isPlaying ? 0.9 : 1.1, opacity: isPlaying ? 0 : 1 }}
          className="w-16 h-16 rounded-full bg-[#DFBA73] text-black flex items-center justify-center shadow-2xl transition-opacity duration-300 group-hover:opacity-90"
        >
          {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1 fill-current" />}
        </motion.div>
      </div>

      {/* Base: Informações e Botão de Som */}
      <div className="absolute bottom-0 left-0 w-full p-5 md:p-6 z-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[#DFBA73] text-[10px] uppercase tracking-[0.3em] font-bold mb-1 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5" /> Ao Vivo
            </p>
            <h3 className="text-white font-serif text-2xl leading-tight drop-shadow-md">Nosso Estúdio</h3>
            <p className="text-gray-300 text-xs mt-1 font-light leading-snug drop-shadow-sm max-w-[220px]">
              Assista ao tour e veja cada detalhe do espaço privativo.
            </p>
          </div>

          {/* Botão de Som */}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Ativar som do vídeo" : "Silenciar vídeo"}
            className="p-3 rounded-full bg-[#050608]/90 border border-[#DFBA73]/50 text-[#DFBA73] hover:bg-[#DFBA73] hover:text-black transition-all duration-300 shadow-xl backdrop-blur-md shrink-0 flex items-center gap-1.5 active:scale-95"
            title={isMuted ? "Clique para ativar som" : "Clique para silenciar"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline font-mono">
              {isMuted ? "Som" : "Ativo"}
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Card de Avaliação no Google (Google Reviews)
function GoogleReviewCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl col-span-1 row-span-1 border border-[#DFBA73]/30 bg-gradient-to-br from-white/[0.05] via-[#DFBA73]/[0.06] to-transparent p-6 flex flex-col justify-between shadow-2xl group hover:border-[#DFBA73]/60 transition-all duration-500"
      style={{ minHeight: 220 }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#DFBA73]/10 rounded-full blur-2xl pointer-events-none" />

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 text-[#DFBA73]">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-[#DFBA73] text-[#DFBA73]" />
            ))}
          </div>
          <span className="text-[11px] font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
            5.0 ★
          </span>
        </div>

        <h3 className="text-white font-serif text-xl leading-tight">Avaliações no Google</h3>
        <p className="text-gray-300 text-xs mt-1.5 font-light leading-relaxed">
          LAS Barber Studio · A sua opinião faz parte da nossa trajetória de excelência e discrição.
        </p>
      </div>

      <a
        href={GOOGLE_REVIEW_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 w-full bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#DFBA73]/20 hover:brightness-110 active:scale-[0.99] transition-all font-mono"
      >
        <Star className="w-3.5 h-3.5 fill-black" />
        <span>Avaliar no Google</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </motion.div>
  );
}

function GalleryCard({
  item,
  index,
}: {
  item: (typeof GALLERY_PHOTOS)[0];
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative overflow-hidden rounded-2xl cursor-pointer ${item.col}`}
      style={{
        minHeight: item.col.includes("row-span-2") ? 500 : item.col.includes("col-span-2") ? 250 : 220,
      }}
    >
      <motion.div
        animate={{ scale: hovered ? 1.07 : 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${item.src})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050608]/90 via-[#050608]/20 to-transparent" />
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 bg-gradient-to-br from-[#DFBA73]/15 via-transparent to-transparent pointer-events-none"
      />
      <motion.div
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#DFBA73] to-transparent origin-left"
      />
      <div className="absolute bottom-0 left-0 w-full p-5 md:p-6">
        <motion.p
          animate={{ y: hovered ? 0 : 6, opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.35 }}
          className="text-[#DFBA73] text-[10px] uppercase tracking-[0.3em] mb-1 font-semibold font-mono"
        >
          {item.label}
        </motion.p>
        <h3 className="text-white font-serif text-xl leading-tight">{item.label}</h3>
        <motion.p
          animate={{ y: hovered ? 0 : 10, opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="text-gray-300 text-sm mt-1 font-light"
        >
          {item.desc}
        </motion.p>
      </div>
    </motion.div>
  );
}

export default function NossaAreaSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const titleY = useTransform(scrollYProgress, [0, 0.35], [50, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.25], [0, 1]);

  return (
    <section
      ref={sectionRef}
      id="nossa-area"
      className="relative bg-[#02050A] py-28 md:py-40 px-5 md:px-12 lg:px-24 overflow-hidden"
    >
      {/* Luzes atmosféricas douradas nobres (GPU otimizadas) */}
      <div className="absolute -top-60 -left-40 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,_rgba(223,186,115,0.08)_0%,_transparent_70%)] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_rgba(184,139,56,0.08)_0%,_transparent_70%)] rounded-full pointer-events-none" />
      <div className="absolute left-5 md:left-12 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/5 to-transparent" />

      {/* ── HEADER ── */}
      <div className="max-w-7xl mx-auto mb-16 md:mb-20">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12">

          {/* Título Monumental Oficial */}
          <motion.div style={{ y: titleY, opacity: titleOpacity }} className="flex-1">
            <p className="text-[#DFBA73] uppercase tracking-[0.45em] text-xs font-semibold flex items-center gap-3 mb-8 font-mono">
              <span className="w-10 h-[1px] bg-[#DFBA73]" />
              Nossa Área
            </p>
            <h2 className="text-4xl sm:text-5xl md:text-7xl font-serif leading-[0.95] tracking-tight text-white">
              Um Espaço{" "}
              <span className="text-transparent [-webkit-text-stroke:1px_#DFBA73] italic">
                Criado
              </span>
              <br /> Para{" "}
              <span className="text-[#DFBA73]">Você.</span>
            </h2>
            <p className="text-gray-300 font-light text-base leading-relaxed mt-8 max-w-md">
              Cada detalhe do nosso estúdio privativo foi pensado para que você se sinta em
              casa — com o conforto, tranquilidade e o requinte que você merece.
            </p>
          </motion.div>

          {/* ── CARD DE LOCALIZAÇÃO, HORÁRIO & AVALIAÇÃO GOOGLE ── */}
          <motion.div
            initial={{ opacity: 0, x: 50, y: 20 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full lg:w-[340px] shrink-0"
          >
            <div className="relative rounded-3xl border border-[#DFBA73]/40 bg-[#080A0E] backdrop-blur-xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_25px_rgba(223,186,115,0.16)] transition-all duration-500 hover:border-[#DFBA73]/70 hover:shadow-[0_30px_90px_rgba(223,186,115,0.22)]">

              {/* Fundo dourado sutil */}
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#DFBA73]/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#DFBA73]/10 rounded-full blur-2xl pointer-events-none" />

              {/* Cabeçalho do card — Logo + Nome */}
              <div className="relative flex flex-col items-center py-8 px-6 border-b border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent">
                <LogoLasBarber variant="emblem" size={96} className="mb-3 opacity-95 drop-shadow-[0_0_15px_rgba(223,186,115,0.4)]" />
                <p className="text-white font-serif text-xl tracking-wide">LAS Barber Studio</p>
                <p className="text-[#DFBA73] text-[10px] uppercase tracking-[0.45em] mt-1 font-mono font-bold">Estúdio Privativo • Lucas Augusto</p>
              </div>

              {/* Horários de Funcionamento */}
              <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-[#DFBA73]" />
                  <span className="text-[10px] uppercase tracking-[0.3em] text-gray-300 font-mono font-semibold">Horário de Funcionamento</span>
                </div>
                <div className="space-y-3">
                  {HORARIOS.map((h, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm font-light">{h.dia}</span>
                      <span className={`text-sm font-semibold font-mono tracking-wider ${h.hora === 'Fechado' ? 'text-gray-400' : 'text-white'}`}>
                        {h.hora}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Endereço / Localização Oficial */}
              <div className="relative px-6 pt-5 pb-5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-[#DFBA73]" />
                  <span className="text-[10px] uppercase tracking-[0.3em] text-gray-300 font-mono font-semibold">Localização Oficial</span>
                </div>
                <p className="text-gray-200 text-sm font-light leading-relaxed">
                  Rua dos Ipês, Nº 360<br />
                  <span className="text-gray-400">Centro · CEP 78310-000</span><br />
                  <span className="text-[#DFBA73] text-xs font-semibold tracking-wide">Comodoro – MT</span>
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <a
                    href={GOOGLE_MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#DFBA73] text-xs uppercase tracking-[0.2em] font-semibold group hover:text-white transition-colors"
                  >
                    Ver no Google Maps
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>

              {/* Bloco de Avaliações no Google */}
              <div className="relative px-6 py-5 bg-[#DFBA73]/[0.05]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-[#DFBA73] text-[#DFBA73]" />
                    ))}
                    <span className="text-xs font-bold text-white ml-1">5.0</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-[#DFBA73] font-bold font-mono">Google</span>
                </div>
                <a
                  href={GOOGLE_REVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-2 bg-white/5 hover:bg-[#DFBA73] text-gray-200 hover:text-[#050608] border border-white/10 hover:border-[#DFBA73] py-2 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 font-mono"
                >
                  <Star className="w-3.5 h-3.5 fill-[#DFBA73] group-hover:fill-[#050608]" />
                  <span>Avaliar Barbearia no Google</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Faixa editorial */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-14 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-t border-b border-white/[0.06] py-7"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-gray-500 mb-1 font-mono">Especialidade</p>
              <p className="text-white font-serif text-2xl">Corte & Barba</p>
            </div>
            <div className="hidden sm:block w-[1px] h-8 bg-white/10" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-gray-500 mb-1 font-mono">Atendimento</p>
              <p className="text-white font-serif text-2xl">1 a 1 Exclusivo</p>
            </div>
            <div className="hidden sm:block w-[1px] h-8 bg-white/10" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-gray-500 mb-1 font-mono">Experiência</p>
              <p className="text-white font-serif text-2xl">Estúdio Privativo</p>
            </div>
          </div>
          <div className="flex items-center gap-4 max-w-xs">
            <div className="w-10 h-[1px] bg-[#DFBA73]/50 shrink-0" />
            <p className="text-gray-300 text-sm font-light italic leading-snug">
              "Não fazemos apenas cortes. Moldamos identidades."
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── GALERIA COM VÍDEO TOUR EM FORMATO MAIOR E FOTOS REAIS DO ESTÚDIO ── */}
      <div className="max-w-7xl mx-auto">

        {/* Versão Mobile: Vídeo Tour em Destaque Vertical Maior + Fotos */}
        <div className="flex flex-col gap-5 md:hidden">
          <VideoTourCard />

          {GALLERY_PHOTOS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, delay: i * 0.07 }}
              className="relative overflow-hidden rounded-2xl"
              style={{ height: 240 }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${item.src})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050608]/85 via-[#050608]/15 to-transparent" />
              <div className="absolute bottom-5 left-5">
                <p className="text-[#DFBA73] text-[10px] uppercase tracking-widest mb-1 font-semibold font-mono">{item.label}</p>
                <p className="text-gray-200 text-sm font-light">{item.desc}</p>
              </div>
            </motion.div>
          ))}

          <GoogleReviewCard />
        </div>

        {/* Versão Desktop: Bento Grid com Vídeo Tour em Formato Maior (2 Linhas) + Fotos Reais + Card Google Reviews */}
        <div className="hidden md:grid grid-cols-3 gap-4" style={{ gridAutoRows: "250px" }}>
          {/* 1. Vídeo Tour Maior ocupando 2 linhas inteiras */}
          <VideoTourCard />

          {/* 2. Fotos Oficiais do Estúdio */}
          {GALLERY_PHOTOS.map((item, i) => (
            <GalleryCard key={i} item={item} index={i} />
          ))}

          {/* 3. Card Google Reviews integrado ao Bento Grid */}
          <GoogleReviewCard />
        </div>
      </div>

      {/* ── RODAPÉ DA SEÇÃO ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="max-w-7xl mx-auto mt-14 flex flex-col md:flex-row items-center justify-between gap-6 pt-10 border-t border-white/[0.06]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-gray-400">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-[#DFBA73]" />
            <span className="text-sm font-light tracking-wide font-mono">
              Seg – Sex: <span className="text-white font-medium">08:00 – 20:00</span>
              <span className="mx-3 text-white/20">·</span>
              Sáb: <span className="text-white font-medium">08:00 – 18:00</span>
            </span>
          </div>

          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#DFBA73] hover:text-[#F5D799] font-semibold tracking-wider transition-colors font-mono"
          >
            <Star className="w-3.5 h-3.5 fill-[#DFBA73]" />
            <span>Avalie-nos no Google (5.0 ★)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <motion.a
          href="#servicos"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full md:w-auto text-center border border-[#DFBA73]/50 text-[#DFBA73] hover:bg-[#DFBA73] hover:text-black px-10 py-4 uppercase tracking-[0.2em] text-xs font-semibold transition-all duration-300 font-mono"
        >
          Agendar Horário
        </motion.a>
      </motion.div>
    </section>
  );
}
