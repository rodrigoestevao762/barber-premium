"use client";

import { motion } from "framer-motion";
import { Sparkles, UserCheck, Flame, Coffee, Shield } from "lucide-react";

export default function ExperienciaSection() {
  return (
    <section 
      id="experiencia" 
      className="relative bg-[#050608] py-24 md:py-32 px-6 md:px-12 overflow-hidden border-t border-white/5"
    >
      {/* Luz ambiente de fundo em ouro vibrante (GPU otimizado via radial-gradient) */}
      <div className="absolute top-1/3 left-1/4 w-[700px] h-[350px] bg-[radial-gradient(ellipse_at_center,_rgba(223,186,115,0.12)_0%,_transparent_70%)] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_center,_rgba(184,139,56,0.10)_0%,_transparent_70%)] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16 md:mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#DFBA73]/15 border border-[#DFBA73]/40 text-[#F5D799] text-xs uppercase tracking-[0.25em] shadow-lg shadow-[#DFBA73]/10 font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#DFBA73]" />
            <span>O Padrão LAS Studio</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-serif text-white tracking-tight leading-[1.12]">
            Técnica Precisa, Produtos Nobres & <br className="hidden sm:block" />
            <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] font-medium">
              O Estúdio Só Para Você.
            </span>
          </h2>

          <p className="text-gray-300 text-sm md:text-base font-light leading-relaxed">
            Aqui você não disputa atenção em salão barulhento nem espera sentado em fila. O estúdio fecha as portas no seu horário para que você receba um atendimento calmo, exclusivo e de alto padrão.
          </p>
        </div>

        {/* Bloco Principal em Duas Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Coluna Esquerda: Foto de Lucas Augusto no Estúdio */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:col-span-6 relative"
          >
            <div className="relative rounded-3xl overflow-hidden border border-[#DFBA73]/40 shadow-[0_25px_80px_rgba(223,186,115,0.12)] bg-[#080A0E] group">
              <div className="aspect-[4/5] w-full relative overflow-hidden">
                <img
                  src="/barbers/lucas-augusto.jpg"
                  alt="Lucas Augusto Master Barber no LAS Barber Studio"
                  className="w-full h-full object-cover object-[center_20%] group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-transparent to-black/20" />
                <div className="absolute inset-0 border border-white/10 rounded-3xl pointer-events-none" />
              </div>

              {/* Tag Flutuante na Foto */}
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-[#080A0E]/90 backdrop-blur-md border border-[#DFBA73]/40 flex items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F5D799] to-[#DFBA73] flex items-center justify-center text-black shrink-0 shadow-md shadow-[#DFBA73]/20 font-bold">
                    <UserCheck className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h4 className="text-white font-serif text-sm font-bold">Lucas Augusto</h4>
                    <p className="text-[11px] text-[#DFBA73] uppercase tracking-wider font-mono font-semibold">Master Barber & Fundador</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-[#DFBA73]/20 border border-[#DFBA73]/40 text-[#F5D799] font-mono">
                  Atendimento 1 a 1
                </span>
              </div>
            </div>

            <div className="absolute -top-4 -left-4 w-24 h-24 border border-[#DFBA73]/30 rounded-full pointer-events-none -z-10" />
          </motion.div>

          {/* Coluna Direita: Os 3 Diferenciais Práticos */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
            className="lg:col-span-6 space-y-6"
          >
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#DFBA73] font-bold">
                Como Funciona o Atendimento
              </span>
              <h3 className="text-2xl sm:text-4xl font-serif text-white mt-1 leading-snug">
                Um horário reservado para o seu cuidado e descanso.
              </h3>
              <p className="text-gray-300 text-sm md:text-base font-light mt-3 leading-relaxed">
                Cada sessão é planejada para que você saia com o corte e a barba alinhados, sem correria e com a atenção total do profissional.
              </p>
            </div>

            {/* 3 Cartões de Diferenciais Práticos */}
            <div className="space-y-4 pt-2">
              
              {/* Diferencial 1 */}
              <div className="p-5 rounded-2xl bg-[#080A0E] border border-white/10 hover:border-[#DFBA73]/50 transition-all duration-300 flex items-start gap-4 group hover:shadow-xl hover:shadow-[#DFBA73]/10">
                <div className="w-12 h-12 rounded-xl bg-[#DFBA73]/15 border border-[#DFBA73]/40 flex items-center justify-center text-[#DFBA73] shrink-0 mt-0.5 group-hover:scale-105 transition-transform shadow-md shadow-[#DFBA73]/10">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-white font-serif text-lg font-bold group-hover:text-[#F5D799] transition-colors">
                    Estúdio 100% Privativo (1 a 1)
                  </h4>
                  <p className="text-xs md:text-sm text-gray-300 font-light leading-relaxed">
                    Você tem o estúdio inteiro reservado para o seu horário. Sem conversas paralelas, sem barulho e com privacidade garantida.
                  </p>
                </div>
              </div>

              {/* Diferencial 2 */}
              <div className="p-5 rounded-2xl bg-[#080A0E] border border-white/10 hover:border-[#DFBA73]/50 transition-all duration-300 flex items-start gap-4 group hover:shadow-xl hover:shadow-[#DFBA73]/10">
                <div className="w-12 h-12 rounded-xl bg-[#DFBA73]/15 border border-[#DFBA73]/40 flex items-center justify-center text-[#DFBA73] shrink-0 mt-0.5 group-hover:scale-105 transition-transform shadow-md shadow-[#DFBA73]/10">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-white font-serif text-lg font-bold group-hover:text-[#F5D799] transition-colors">
                    Corte Sob Medida & Alta Precisão
                  </h4>
                  <p className="text-xs md:text-sm text-gray-300 font-light leading-relaxed">
                    Técnica milimétrica alinhada ao caimento natural do seu cabelo e estilo pessoal, garantindo um visual marcante e de fácil manutenção no dia a dia.
                  </p>
                </div>
              </div>

              {/* Diferencial 3 */}
              <div className="p-5 rounded-2xl bg-[#080A0E] border border-white/10 hover:border-[#DFBA73]/50 transition-all duration-300 flex items-start gap-4 group hover:shadow-xl hover:shadow-[#DFBA73]/10">
                <div className="w-12 h-12 rounded-xl bg-[#DFBA73]/15 border border-[#DFBA73]/40 flex items-center justify-center text-[#DFBA73] shrink-0 mt-0.5 group-hover:scale-105 transition-transform shadow-md shadow-[#DFBA73]/10">
                  <Flame className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-white font-serif text-lg font-bold group-hover:text-[#F5D799] transition-colors">
                    Barboterapia com Toalha Quente & Vapor
                  </h4>
                  <p className="text-xs md:text-sm text-gray-300 font-light leading-relaxed">
                    Preparação da pele com toalhas aquecidas, vapor suave de ozônio e óleos hidratantes para um barbear rente, macio e sem irritações.
                  </p>
                </div>
              </div>

            </div>

          </motion.div>

        </div>

      </div>
    </section>
  );
}
