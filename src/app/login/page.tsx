"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight, ChevronLeft, CheckCircle, X, Sparkles, Shield } from "lucide-react";
import Link from "next/link";
import LogoLasBarber from "@/components/LogoLasBarber";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Modal de Recuperação de Senha
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role === "CLIENT") {
        router.push("/painel-cliente");
      } else {
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const idToUse = identifier.trim();
    const pwdToUse = password.trim();

    if (!idToUse || !pwdToUse) {
      setError("Por favor, preencha o e-mail (ou telefone) e a senha.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        identifier: idToUse,
        phone: idToUse,
        password: pwdToUse,
        redirect: false,
      });

      if (res?.error) {
        setError("Identificador ou senha incorretos. Verifique suas credenciais.");
        setLoading(false);
      } else if (res?.ok) {
        try {
          const sRes = await fetch("/api/auth/session");
          const sData = await sRes.json();
          if (sData?.user?.role === "CLIENT") {
            window.location.href = "/painel-cliente";
          } else {
            window.location.href = "/dashboard";
          }
        } catch (_) {
          window.location.href = "/painel-cliente";
        }
      } else {
        setError("Falha na autenticação. Tente novamente.");
        setLoading(false);
      }
    } catch (_) {
      setError("Erro ao autenticar. Verifique sua conexão.");
      setLoading(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail || !recoveryEmail.includes("@")) return;
    setRecoveryLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (res.ok) {
        setRecoverySuccess(true);
      } else {
        alert(data.error || "Erro ao solicitar recuperação de senha.");
      }
    } catch (_) {
      setRecoverySuccess(true);
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] flex text-white relative selection:bg-[#DFBA73] selection:text-black">
      
      {/* Luzes decorativas */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#DFBA73]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#B88B38]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Coluna da Esquerda: Formulário de Login Seguro */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 z-10 relative">
        <Link 
          href="/" 
          className="absolute top-8 left-8 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-gray-400 hover:text-[#DFBA73] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar ao Site
        </Link>

        <div className="w-full max-w-md relative z-10 pt-16 lg:pt-0">
          <div className="mb-8 text-center lg:text-left">
            <div className="flex items-center gap-4 justify-center lg:justify-start mb-5">
              <LogoLasBarber variant="emblem" size={54} />
              <div>
                <span className="text-xl font-serif tracking-[0.2em] uppercase text-white block">LAS BARBER STUDIO</span>
                <span className="text-[10px] font-mono tracking-[0.25em] text-[#DFBA73] uppercase font-bold">LUCAS AUGUSTO</span>
              </div>
            </div>
            <h1 className="text-3xl font-serif text-white tracking-wide uppercase mb-2">Acesso ao Painel</h1>
            <p className="text-gray-300 text-sm font-light leading-relaxed">
              Área Exclusiva · Gestão do Studio e Painel VIP do Cliente.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleAuth}>
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs font-semibold text-center bg-red-400/10 border border-red-400/20 py-3 px-4 rounded-xl font-mono"
              >
                {error}
              </motion.p>
            )}

            <div>
              <label className="block text-gray-300 text-[10px] uppercase tracking-widest font-mono font-semibold mb-2">
                E-mail ou Telefone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Mail className="w-4 h-4 text-gray-500" />
                </div>
                <input 
                  type="text" 
                  required
                  value={identifier} 
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 hover:border-white/20 focus:bg-white/[0.05] focus:border-[#DFBA73] rounded-xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none transition-all duration-300 placeholder:text-gray-600 font-sans"
                  placeholder="seuemail@exemplo.com ou telefone" 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-300 text-[10px] uppercase tracking-widest font-mono font-semibold">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryEmail(identifier.includes("@") ? identifier : "");
                    setRecoverySuccess(false);
                    setIsForgotModalOpen(true);
                  }}
                  className="text-[10px] text-[#DFBA73] hover:text-[#F5D799] underline uppercase tracking-wider font-mono font-semibold cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Lock className="w-4 h-4 text-gray-500" />
                </div>
                <input 
                  type="password" 
                  required
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 hover:border-white/20 focus:bg-white/[0.05] focus:border-[#DFBA73] rounded-xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none transition-all duration-300 placeholder:text-gray-600 font-sans"
                  placeholder="Digite sua senha" 
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 group mt-6 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-[#DFBA73]/25 cursor-pointer font-mono"
            >
              {loading ? "Autenticando..." : "Entrar no Painel"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Rodapé Seguro */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-[11px] text-gray-400 font-mono flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#DFBA73]" /> Sistema Protegido com Criptografia SHA-256 & BCrypt
            </p>
          </div>
        </div>
      </div>

      {/* Coluna da Direita: Foto Real do Studio Privativo */}
      <div 
        className="hidden lg:block w-1/2 bg-cover bg-center relative"
        style={{ backgroundImage: `url('/studio/login-studio.jpg')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#050608] via-[#050608]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-transparent to-transparent" />
        
        <div className="absolute bottom-12 left-12 right-12 z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#DFBA73]/40 bg-black/70 text-[#F5D799] text-xs font-mono uppercase tracking-widest mb-3 shadow-md shadow-[#DFBA73]/10">
            <Sparkles className="w-3.5 h-3.5 text-[#DFBA73]" /> Lucas Augusto • Master Barber
          </div>
          <h2 className="text-3xl font-serif text-white leading-tight mb-3">
            Atendimento 100% Privativo e Individualizado.
          </h2>
          <p className="text-gray-200 text-sm font-light leading-relaxed drop-shadow-md">
            Espaço concebido para o homem contemporâneo. Controle total de agendamentos, clientes e faturamento em tempo real.
          </p>
        </div>
      </div>

      {/* MODAL: RECUPERAÇÃO DE SENHA */}
      <AnimatePresence>
        {isForgotModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setIsForgotModalOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0A0C10] border border-[#DFBA73]/40 rounded-3xl p-6 md:p-8 z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                <h3 className="text-2xl font-serif text-white">Recuperar Senha</h3>
                <button onClick={() => setIsForgotModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {recoverySuccess ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-xl font-serif text-white">Link Enviado com Sucesso!</h4>
                    <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                      Enviamos as instruções e o link seguro de recuperação para <strong className="text-white">{recoveryEmail}</strong>. Verifique sua caixa de entrada e pasta de spam.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotModalOpen(false);
                      setRecoverySuccess(false);
                      setRecoveryEmail("");
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#DFBA73]/25 font-mono hover:brightness-110 active:scale-[0.98] mt-4 cursor-pointer"
                  >
                    Voltar ao Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordRecovery} className="space-y-4">
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Informe o e-mail cadastrado na sua conta para enviarmos o link seguro de redefinição de senha:
                  </p>
                  <div>
                    <label className="block text-gray-400 text-[10px] uppercase tracking-widest font-semibold mb-2">
                      Seu E-mail Cadastrado
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <Mail className="w-4 h-4 text-gray-500" />
                      </div>
                      <input
                        required
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="Ex: seuemail@exemplo.com"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:border-[#DFBA73] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={recoveryLoading || !recoveryEmail}
                    className="w-full py-4 bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] hover:brightness-110 text-black font-bold uppercase tracking-widest text-xs rounded-xl mt-4 transition-all disabled:opacity-40 cursor-pointer shadow-lg shadow-[#DFBA73]/20 font-mono"
                  >
                    {recoveryLoading ? "Enviando link seguro..." : "Enviar Link de Recuperação"}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
