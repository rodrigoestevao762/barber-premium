import { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ShieldCheck, Lock, Eye, FileText, CheckCircle2, Mail, Phone, MapPin } from "lucide-react";
import { LogoLasBarber } from "@/components/LogoLasBarber";

export const metadata: Metadata = {
  title: "Política de Privacidade e Proteção de Dados (LGPD) | LAS Barber Studio",
  description: "Entenda como o LAS Barber Studio protege e respeita a privacidade de seus dados pessoais em total conformidade com a LGPD (Lei 13.709/2018).",
};

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#050B14] text-white selection:bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold selection:text-[#050B14] font-sans">
      {/* Topo / Barra Superior */}
      <header className="border-b border-amber-500/20 bg-[#070D18]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-400 hover:text-amber-400 transition-colors font-semibold"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar ao Início
          </Link>

          <Link href="/" className="flex items-center gap-2.5">
            <LogoLasBarber size={32} color="#F59E0B" />
            <span className="text-lg font-serif tracking-[0.25em] text-white uppercase">LAS BARBER STUDIO</span>
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        {/* Cabeçalho */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4">
            <ShieldCheck className="w-4 h-4" /> Lei Geral de Proteção de Dados (LGPD)
          </div>
          <h1 className="text-3xl md:text-5xl font-serif text-white tracking-tight leading-tight mb-4">
            Política de Privacidade & Termos de Proteção de Dados
          </h1>
          <p className="text-gray-400 text-sm md:text-base font-light max-w-2xl mx-auto leading-relaxed">
            No <strong>LAS Barber Studio</strong>, sob gestão do Master Barber <strong>Lucas Augusto</strong>, a sua privacidade e segurança são tratadas com o mais alto rigor técnico em conformidade com a <strong>Lei Federal nº 13.709/2018 (LGPD)</strong>.
          </p>
          <p className="text-gray-500 text-xs mt-3">Última atualização: Novembro de 2026</p>
        </div>

        {/* Artigos e Cláusulas */}
        <div className="space-y-10 text-gray-300 text-sm md:text-base leading-relaxed">
          
          {/* Seção 1 */}
          <section className="p-6 md:p-8 rounded-3xl bg-[#070D18] border border-white/5 space-y-4">
            <h2 className="text-xl md:text-2xl font-serif text-white flex items-center gap-3">
              <span className="text-amber-400 font-mono text-lg font-bold">01.</span>
              Quem Somos e Compromisso com a Privacidade
            </h2>
            <p className="text-gray-400 font-light leading-relaxed">
              O <strong>LAS Barber Studio</strong>, estúdio privado e individual de barbearia conduzido por Lucas Augusto, atua como controlador dos dados pessoais fornecidos pelos clientes através deste site e aplicativo móvel (PWA). Garantimos confidencialidade absoluta para cada informação coletada.
            </p>
          </section>

          {/* Seção 2 */}
          <section className="p-6 md:p-8 rounded-3xl bg-[#070D18] border border-white/5 space-y-4">
            <h2 className="text-xl md:text-2xl font-serif text-white flex items-center gap-3">
              <span className="text-amber-400 font-mono text-lg font-bold">02.</span>
              Quais Dados Coletamos
            </h2>
            <p className="text-gray-400 font-light">
              Coletamos estritamente os dados necessários para o atendimento exclusivo e seguro no estúdio:
            </p>
            <ul className="space-y-2.5 pt-2">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Nome Completo:</strong> Para identificação na recepção privativa e organização da agenda de Lucas Augusto.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Telefone / WhatsApp:</strong> Para confirmações de horário, lembretes de atendimento e suporte direto.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>E-mail (opcional):</strong> Para autenticação segura e comunicações importantes.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Senha Criptografada:</strong> Protegida em nosso banco de dados com hash irreversível de nível bancário.</span>
              </li>
            </ul>
          </section>

          {/* Seção 3 */}
          <section className="p-6 md:p-8 rounded-3xl bg-[#070D18] border border-white/5 space-y-4">
            <h2 className="text-xl md:text-2xl font-serif text-white flex items-center gap-3">
              <span className="text-amber-400 font-mono text-lg font-bold">03.</span>
              Finalidade do Tratamento (Art. 7º, V da LGPD)
            </h2>
            <p className="text-gray-400 font-light">
              Todos os dados são utilizados unicamente para execução do agendamento dos serviços de barbearia:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400 text-sm">
              <li>Reserva exclusiva de horário no estúdio privativo com Lucas Augusto;</li>
              <li>Histórico de cortes e preferências para controle do cartão fidelidade VIP;</li>
              <li>Comunicação operacional rápida via WhatsApp caso ocorra alguma remarcação.</li>
            </ul>
          </section>

          {/* Seção 4 */}
          <section className="p-6 md:p-8 rounded-3xl bg-[#070D18] border border-white/5 space-y-4">
            <h2 className="text-xl md:text-2xl font-serif text-white flex items-center gap-3">
              <Lock className="w-6 h-6 text-amber-400" />
              04. Segurança da Informação e Criptografia
            </h2>
            <p className="text-gray-400 font-light leading-relaxed">
              Adotamos medidas modernas de segurança para proteger todas as informações dos clientes:
            </p>
            <ul className="space-y-2 pt-2">
              <li className="flex items-center gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold" />
                <span><strong>Tráfego 100% Criptografado (HTTPS / SSL):</strong> Toda comunicação é protegida por certificados SSL de ponta a ponta.</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold" />
                <span><strong>Acesso Restrito:</strong> Somente você e Lucas Augusto têm acesso aos seus agendamentos registrados.</span>
              </li>
            </ul>
          </section>

          {/* Seção 5 */}
          <section className="p-6 md:p-8 rounded-3xl bg-[#070D18] border border-white/5 space-y-4">
            <h2 className="text-xl md:text-2xl font-serif text-white flex items-center gap-3">
              <Eye className="w-6 h-6 text-amber-400" />
              05. Sigilo Absoluto e Não Compartilhamento
            </h2>
            <p className="text-gray-400 font-light leading-relaxed">
              <strong>NUNCA vendemos, alugamos ou comercializamos seus dados pessoais para terceiros.</strong> Seus dados são de uso restrito do LAS Barber Studio para a excelência do seu atendimento.
            </p>
          </section>

          {/* Seção 6 */}
          <section className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[#121c2c] via-[#070D18] to-[#070D18] border border-amber-500/30 space-y-4">
            <h2 className="text-xl md:text-2xl font-serif text-white flex items-center gap-3">
              <span className="text-amber-400 font-mono text-lg font-bold">06.</span>
              Canal de Atendimento do Titular & Contato
            </h2>
            <p className="text-gray-400 font-light leading-relaxed">
              Para exercer qualquer direito de titular ou tirar dúvidas sobre seus dados, fale diretamente com Lucas Augusto:
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-2">
              <a
                href="https://wa.me/5569993783204?text=Ol%C3%A1%20Lucas!%20Gostaria%20de%20uma%20informa%C3%A7%C3%A3o%20sobre%20meus%20dados%20no%20LAS%20Barber%20Studio."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 text-emerald-400 transition-all text-xs font-semibold"
              >
                <Phone className="w-4 h-4" /> (69) 99378-3204 (WhatsApp Studio)
              </a>
              <a
                href="https://www.instagram.com/lasbarberstudio_?utm_source=ig_web_button_share_sheet&srtk=ZDNlZDc0MzIxNw=="
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 text-amber-400 transition-all text-xs font-semibold"
              >
                <MapPin className="w-4 h-4" /> Rua dos Ypês, 365E - Centro (@lasbarberstudio_)
              </a>
              <a
                href="mailto:lucastj609@gmail.com"
                className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 text-gray-300 hover:text-white transition-all text-xs font-semibold font-mono"
              >
                <Mail className="w-4 h-4 text-amber-400" /> lucastj609@gmail.com
              </a>
            </div>
          </section>

        </div>

        {/* Rodapé da página */}
        <div className="mt-16 pt-8 border-t border-white/10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-bold hover:brightness-110 text-[#050B14] font-bold text-xs uppercase tracking-widest shadow-xl shadow-amber-500/20 transition-all"
          >
            Voltar à Página Principal
          </Link>
        </div>
      </main>
    </div>
  );
}
