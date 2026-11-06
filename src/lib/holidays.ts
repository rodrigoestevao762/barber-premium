import { isDateClosed } from "./barber-availability";

/**
 * Calendário de Funcionamento Oficial do LAS Barber Studio.
 * Regras:
 * - Aberto todos os dias do ano (segunda a sábado).
 * - Fechado aos Domingos.
 * - Fechamento manual apenas quando Lucas Augusto ativa "Studio Fechado" para uma data específica.
 */

export interface DayStatus {
  isClosed: boolean;
  isSunday: boolean;
  isHoliday: boolean;
  isStudioClosed?: boolean;
  reason: string;
}

/**
 * Verifica se uma data específica ("YYYY-MM-DD") está fechada.
 */
export function checkDayStatus(dateStr: string): DayStatus {
  if (!dateStr || dateStr.length < 10) {
    return { isClosed: false, isSunday: false, isHoliday: false, reason: "" };
  }

  const cleanDateStr = dateStr.substring(0, 10);
  const [yStr, mStr, dStr] = cleanDateStr.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);

  // Verifica se é domingo no calendário civil
  // Usamos meio-dia UTC para evitar distorções de fuso horário
  const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const isSunday = dateObj.getUTCDay() === 0;

  if (isSunday) {
    return {
      isClosed: true,
      isSunday: true,
      isHoliday: false,
      reason: "O estúdio fecha aos domingos. Agendamentos disponíveis de segunda a sábado.",
    };
  }

  // Verifica se Lucas Augusto fechou esta data específica via Dashboard ("Studio Fechado")
  if (isDateClosed(cleanDateStr)) {
    return {
      isClosed: true,
      isSunday: false,
      isHoliday: false,
      isStudioClosed: true,
      reason: "O estúdio estará fechado nesta data pelo Master Barber Lucas Augusto.",
    };
  }

  // Todos os demais dias do ano (segunda a sábado) estão ABERTOS por padrão
  return {
    isClosed: false,
    isSunday: false,
    isHoliday: false,
    reason: "",
  };
}
