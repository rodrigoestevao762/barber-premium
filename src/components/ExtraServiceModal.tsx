"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Plus, X, Sparkles, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { OFFICIAL_SERVICES } from "@/lib/services";
import type { AppointmentAddonItem } from "@/lib/appointment-addons";

interface ExtraServiceModalProps {
  appointment: any | null;
  onClose: () => void;
  onUpdated: (message?: string) => Promise<void> | void;
}

export function ExtraServiceModal({
  appointment,
  onClose,
  onUpdated,
}: ExtraServiceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [addons, setAddons] = useState<AppointmentAddonItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (appointment) {
      setAddons(Array.isArray(appointment.addons) ? appointment.addons : []);
      setErrorMsg("");
    }
  }, [appointment]);

  useEffect(() => {
    if (!appointment) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [appointment, onClose]);

  if (!mounted || !appointment || typeof document === "undefined") {
    return null;
  }

  const basePrice = Number(appointment.basePrice ?? appointment.service?.price ?? 0);
  const extraTotal = addons.reduce((acc, a) => acc + Number(a.price || 0), 0);
  const totalWithExtras = basePrice + extraTotal;

  // Destaca os serviços mais comuns para adicionar na hora (Sobrancelha, Depilação, Hidratação, Barba...)
  const prioritizedIds = [
    "sobrancelha",
    "depilacao-nariz-orelha",
    "hidratacao",
    "pigmentacao-barba",
    "barba",
    "corte-cabelo",
  ];
  const sortedServices = [...OFFICIAL_SERVICES].sort((a, b) => {
    const idxA = prioritizedIds.indexOf(a.id);
    const idxB = prioritizedIds.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });

  const handleAddExtra = async (serviceId: string) => {
    setIsSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/addons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      const data = await res.json();
      if (!res.ok || !data.addon) {
        setErrorMsg(data.error || "Não foi possível adicionar o serviço extra.");
        return;
      }
      const nextAddons = [...addons, data.addon];
      setAddons(nextAddons);
      await onUpdated(
        `Serviço extra "${data.addon.serviceName}" (+ R$ ${Number(data.addon.price).toFixed(2)}) adicionado para ${appointment.user?.name || "o cliente"}!`
      );
    } catch {
      setErrorMsg("Erro de conexão ao adicionar serviço extra.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveExtra = async (addonId: string) => {
    setIsSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch(
        `/api/appointments/${appointment.id}/addons?addonId=${encodeURIComponent(addonId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        setErrorMsg("Não foi possível remover este serviço extra.");
        return;
      }
      setAddons((prev) => prev.filter((a) => a.id !== addonId));
      await onUpdated("Serviço extra removido do atendimento.");
    } catch {
      setErrorMsg("Erro de conexão ao remover serviço extra.");
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      >
        <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="extra-service-modal-title"
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}
          className="relative w-full max-w-lg bg-[#080A0E] border border-[#DFBA73]/40 rounded-3xl shadow-2xl z-10 max-h-[90vh] flex flex-col text-white overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-white/10 shrink-0 flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#DFBA73]/20 text-[#F5D799] border border-[#DFBA73]/30 font-mono mb-2">
                <Sparkles className="w-3 h-3" /> Serviço Extra no Atendimento
              </span>
              <h3 id="extra-service-modal-title" className="text-xl sm:text-2xl font-serif text-white">
                Adicionar <span className="text-[#DFBA73] italic">Serviço Extra</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Cliente:{" "}
                <strong className="text-white">{appointment.user?.name || "Cliente"}</strong> •{" "}
                <span className="text-[#F5D799]">{appointment.service?.name}</span> (R${" "}
                {basePrice.toFixed(2)})
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modal de serviço extra"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 pt-4 overflow-y-auto space-y-5 flex-1">
            {errorMsg && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Resumo dos serviços já inclusos */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#DFBA73]/15 via-[#0E1117] to-emerald-950/20 border border-[#DFBA73]/35 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-300">Serviço agendado:</span>
                <span className="text-white font-semibold tabular-nums">
                  {appointment.service?.name} • R$ {basePrice.toFixed(2)}
                </span>
              </div>

              {addons.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#F5D799] block">
                    Extras adicionados neste atendimento:
                  </span>
                  {addons.map((addon) => (
                    <div
                      key={addon.id}
                      className="flex items-center justify-between gap-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-white truncate">{addon.serviceName}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-emerald-300 font-mono font-bold tabular-nums">
                          + R$ {Number(addon.price).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleRemoveExtra(addon.id)}
                          aria-label={`Remover ${addon.serviceName}`}
                          className="p-1 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-gray-300 font-bold">
                  Total Atual do Atendimento:
                </span>
                <span className="text-xl font-serif font-bold text-[#F5D799] tabular-nums">
                  R$ {totalWithExtras.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Lista para adicionar novo serviço extra com 1 toque */}
            <div>
              <label className="block text-gray-400 text-xs uppercase font-mono tracking-wider mb-2.5">
                Toque no serviço extra para adicionar:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sortedServices.map((svc) => (
                  <button
                    key={svc.id}
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleAddExtra(svc.id)}
                    className="p-3 rounded-2xl border border-white/10 hover:border-[#DFBA73]/60 bg-white/[0.02] hover:bg-[#DFBA73]/10 text-left transition-all flex items-center justify-between gap-2 cursor-pointer disabled:opacity-50 group"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate group-hover:text-[#F5D799]">
                        {svc.name}
                      </h4>
                      <p className="text-[10px] text-gray-500 font-mono">
                        +{svc.duration} min
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#DFBA73]/15 group-hover:bg-[#DFBA73] text-[#F5D799] group-hover:text-black font-mono font-bold text-xs shrink-0 transition-colors tabular-nums">
                      <Plus className="w-3 h-3" />
                      R$ {svc.price}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 pt-3 border-t border-white/10 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F5D799] via-[#DFBA73] to-[#B88B38] text-black font-bold uppercase tracking-widest text-xs font-mono hover:brightness-110 transition-all cursor-pointer"
            >
              Concluir • Total R$ {totalWithExtras.toFixed(2)}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
