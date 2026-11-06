"use client";

import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, Sparkles } from "lucide-react";

export default function StudioVideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);

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

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    if (total > 0) {
      setProgress((current / total) * 100);
    }
  };

  return (
    <section className="relative py-28 md:py-36 px-6 md:px-16 bg-[#050608] overflow-hidden border-t border-white/5">
      {/* Luz ambiente de fundo - Ouro Nobre Vibrante (GPU otimizada) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[radial-gradient(ellipse_at_center,_rgba(223,186,115,0.12)_0%,_transparent_70%)] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#DFBA73]/40 bg-[#DFBA73]/10 text-[#F5D799] text-xs font-mono uppercase tracking-[0.3em] mb-6 shadow-md shadow-[#DFBA73]/10 font-bold"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#DFBA73]" />
            Tour Pelo Studio • Lucas Augusto
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-6xl font-serif leading-[1.1] text-white tracking-tight uppercase"
          >
            O SEU MOMENTO, EM UM <br className="hidden md:block" />
            <span className="italic bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] bg-clip-text text-transparent">
              AMBIENTE EXCLUSIVO.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-gray-300 font-light text-base md:text-lg leading-relaxed"
          >
            Sem fila de espera, sem barulho e sem pressa. Um estúdio privativo estruturado para quem valoriza conforto, pontualidade e acabamento de alto padrão.
          </motion.p>
        </div>

        {/* Player de Vídeo Ultra Premium */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-3xl overflow-hidden border border-white/10 hover:border-[#DFBA73]/50 shadow-[0_25px_80px_rgba(0,0,0,0.9)] bg-[#080A0E] group transition-all duration-500"
        >
          {/* Brilho da borda superior */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#DFBA73] to-transparent z-20 pointer-events-none" />

          {/* Vídeo */}
          <div className="relative aspect-[9/16] md:aspect-[16/9] max-h-[640px] w-full bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              src="/studio/las-studio-video.mp4"
              poster="/studio/cover-3.jpg"
              preload="metadata"
              className="w-full h-full object-cover md:object-contain cursor-pointer"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
            />

            {/* Overlay gradiente escuro quando pausado */}
            <div
              onClick={togglePlay}
              className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 flex items-center justify-center cursor-pointer ${
                isPlaying ? "opacity-0 group-hover:opacity-30" : "opacity-100"
              }`}
            >
              {!isPlaying && (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black flex items-center justify-center shadow-[0_0_40px_rgba(223,186,115,0.6)] transform scale-100 hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 fill-current ml-1" />
                </div>
              )}
            </div>

            {/* Barra de Controles Inferior */}
            <div className="absolute bottom-0 inset-x-0 p-4 md:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-3 z-30 transition-opacity duration-300 opacity-90 group-hover:opacity-100">
              {/* Barra de Progresso Dourada */}
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F5D799] to-[#DFBA73] transition-all duration-150 shadow-[0_0_10px_rgba(223,186,115,0.8)]"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#DFBA73]/20 hover:border-[#DFBA73]/40 border border-transparent backdrop-blur-md flex items-center justify-center text-white hover:text-[#F5D799] transition-colors cursor-pointer"
                    title={isPlaying ? "Pausar" : "Reproduzir"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <button
                    onClick={toggleMute}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#DFBA73]/20 hover:border-[#DFBA73]/40 border border-transparent backdrop-blur-md flex items-center justify-center text-white hover:text-[#F5D799] transition-colors cursor-pointer"
                    title={isMuted ? "Ativar Áudio" : "Mutar"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <span className="text-xs uppercase tracking-widest text-gray-300 font-mono hidden sm:inline-block">
                    {isMuted ? "Toque no som para ouvir" : "Áudio ativo"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-[#F5D799] uppercase tracking-wider bg-[#DFBA73]/15 px-3 py-1 rounded-full border border-[#DFBA73]/40 font-bold">
                    LAS Barber Studio
                  </span>
                  <button
                    onClick={toggleFullscreen}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-colors cursor-pointer"
                    title="Tela cheia"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
