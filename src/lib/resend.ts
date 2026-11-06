import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lasbarberstudio.com.br";
const DEFAULT_FROM = process.env.RESEND_FROM || "LAS Barber Studio <onboarding@resend.dev>";

/**
 * 1. Confirmação de Agendamento Enviada para o Cliente VIP
 */
export async function sendAppointmentConfirmationEmail({
  to,
  clientName,
  barberName,
  serviceName,
  servicePrice,
  serviceDuration,
  appointmentDate,
  appointmentTime,
  paymentMethod,
  clientEmail,
  clientPassword,
}: {
  to: string;
  clientName: string;
  barberName: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  appointmentDate: string;
  appointmentTime: string;
  paymentMethod: string;
  clientEmail: string;
  clientPassword?: string;
}) {
  if (!resend) {
    console.warn("⚠️ RESEND_API_KEY não configurada. Simulação de confirmação para:", to);
    return { success: true, simulated: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to,
      subject: `Atendimento Confirmado • LAS Barber Studio — ${appointmentDate} às ${appointmentTime}`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Atendimento Confirmado — LAS Barber Studio</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050608; color: #FFFFFF; margin: 0; padding: 40px 16px; }
            .container { max-width: 580px; margin: 0 auto; background: linear-gradient(180deg, #0A0D14 0%, #050608 100%); border: 1px solid rgba(223, 186, 115, 0.45); border-radius: 24px; padding: 40px 28px; box-shadow: 0 25px 70px rgba(0,0,0,0.95); }
            .emblem { text-align: center; margin-bottom: 24px; }
            .diamond { display: inline-block; width: 44px; height: 44px; border: 2px solid #DFBA73; transform: rotate(45deg); line-height: 44px; text-align: center; }
            .diamond-text { display: inline-block; transform: rotate(-45deg); color: #DFBA73; font-size: 20px; font-weight: bold; font-family: serif; }
            .logo-text { font-family: Georgia, serif; font-size: 22px; color: #FFFFFF; letter-spacing: 4px; text-transform: uppercase; text-align: center; margin: 14px 0 4px 0; font-weight: 700; }
            .tagline { color: #DFBA73; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; text-align: center; margin: 0 0 24px 0; font-weight: 600; font-family: monospace; }
            .divider { height: 1px; background: linear-gradient(to right, transparent, rgba(223, 186, 115, 0.4), transparent); margin: 24px 0; }
            .badge-success { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #10B981; font-size: 11px; text-transform: uppercase; font-family: monospace; font-weight: bold; letter-spacing: 2px; padding: 6px 14px; border-radius: 999px; display: inline-block; margin-bottom: 16px; }
            h2 { font-size: 22px; font-weight: 600; color: #FFFFFF; margin: 8px 0 12px 0; font-family: Georgia, serif; }
            p { color: #D1D5DB; font-size: 14px; line-height: 1.7; margin: 12px 0; }
            .card-details { background: rgba(255,255,255,0.03); border: 1px solid rgba(223, 186, 115, 0.3); border-radius: 16px; padding: 22px 20px; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; }
            .detail-row:last-child { border-bottom: none; padding-bottom: 0; }
            .detail-label { color: #9CA3AF; text-transform: uppercase; font-family: monospace; font-size: 11px; letter-spacing: 1px; }
            .detail-value { color: #FFFFFF; font-weight: 600; text-align: right; }
            .detail-gold { color: #DFBA73; font-weight: bold; }
            .vip-box { background: rgba(223, 186, 115, 0.08); border: 1px dashed rgba(223, 186, 115, 0.4); border-radius: 14px; padding: 18px 20px; margin: 22px 0; }
            .vip-title { color: #F5D799; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-family: monospace; font-weight: bold; margin-bottom: 8px; }
            .btn-wrap { text-align: center; margin: 32px 0 20px 0; }
            .btn { display: inline-block; background: linear-gradient(135deg, #F5D799 0%, #DFBA73 50%, #B88B38 100%); color: #050608 !important; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; padding: 16px 36px; border-radius: 12px; box-shadow: 0 8px 25px rgba(223, 186, 115, 0.35); font-family: monospace; }
            .footer { text-align: center; color: #6B7280; font-size: 10px; margin-top: 32px; letter-spacing: 1.5px; text-transform: uppercase; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="emblem">
              <div class="diamond">
                <span class="diamond-text">L</span>
              </div>
              <h1 class="logo-text">LAS BARBER STUDIO</h1>
              <p class="tagline">Lucas Augusto • Estúdio Privativo</p>
            </div>
            
            <div class="divider"></div>

            <div style="text-align: center;">
              <span class="badge-success">✓ Agendamento Confirmado</span>
              <h2>Olá, ${clientName}!</h2>
              <p>Seu atendimento privativo 1 a 1 no <strong>LAS Barber Studio</strong> foi reservado com sucesso e está na agenda exclusiva do Master Barber.</p>
            </div>

            <div class="card-details">
              <div class="detail-row">
                <span class="detail-label">Ritual Escolhido</span>
                <span class="detail-value detail-gold">${serviceName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Data</span>
                <span class="detail-value">${appointmentDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Horário</span>
                <span class="detail-value detail-gold">${appointmentTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Master Barber</span>
                <span class="detail-value">${barberName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Investimento</span>
                <span class="detail-value detail-gold">R$ ${servicePrice},00 (${serviceDuration} min)</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Forma de Pagamento</span>
                <span class="detail-value">${paymentMethod} (no estúdio)</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Localização</span>
                <span class="detail-value">Rua dos Ipês, Nº 360 · Centro, Comodoro - MT</span>
              </div>
            </div>

            <div class="vip-box">
              <div class="vip-title">★ Sua Conta VIP de Cliente</div>
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #E5E7EB;">
                Você pode acompanhar seus horários, remarcar ou solicitar novos atendimentos pelo seu Painel VIP:
              </p>
              <p style="margin: 4px 0; font-size: 12px; font-family: monospace; color: #DFBA73;">
                <strong>E-mail:</strong> ${clientEmail}<br>
                ${clientPassword ? `<strong>Senha inicial:</strong> ${clientPassword}` : ""}
              </p>
            </div>

            <div class="btn-wrap">
              <a href="${SITE_URL}/painel-cliente" class="btn" target="_blank">Acessar Meu Painel VIP</a>
            </div>

            <p style="font-size: 11px; color: #9CA3AF; text-align: center; margin-top: 20px;">
              Estúdio 100% climatizado • Café expresso & bebidas cortesia • Som ambiente relaxante
            </p>
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} LAS Barber Studio • Rua dos Ipês, Nº 360, Centro — Comodoro - MT
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Erro Resend envio confirmação:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    console.error("Exceção Resend confirmação:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * 2. Notificação Imediata de Novo Agendamento Enviada para o Barbeiro / Dono (Lucas Augusto)
 */
export async function sendNewBookingNotificationToBarber({
  to,
  barberEmail,
  barberName,
  clientName,
  clientEmail,
  clientPhone,
  serviceName,
  servicePrice,
  appointmentDate,
  appointmentTime,
  paymentMethod,
}: {
  to?: string;
  barberEmail?: string;
  barberName: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceName: string;
  servicePrice: number;
  appointmentDate: string;
  appointmentTime: string;
  paymentMethod: string;
}) {
  const recipient = to || barberEmail || "lucastj609@gmail.com";
  if (!resend) {
    console.warn("⚠️ RESEND_API_KEY não configurada. Simulação de notificação para barbeiro:", recipient);
    return { success: true, simulated: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: recipient,
      subject: `🔔 Novo Agendamento: ${clientName} — ${appointmentDate} às ${appointmentTime}`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Novo Agendamento — LAS Barber Studio</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050608; color: #FFFFFF; margin: 0; padding: 40px 16px; }
            .container { max-width: 580px; margin: 0 auto; background: linear-gradient(180deg, #0A0D14 0%, #050608 100%); border: 1px solid rgba(223, 186, 115, 0.45); border-radius: 24px; padding: 40px 28px; box-shadow: 0 25px 70px rgba(0,0,0,0.95); }
            .logo-text { font-family: Georgia, serif; font-size: 20px; color: #FFFFFF; letter-spacing: 4px; text-transform: uppercase; text-align: center; margin: 0 0 4px 0; font-weight: 700; }
            .tagline { color: #DFBA73; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; text-align: center; margin: 0 0 20px 0; font-family: monospace; }
            .divider { height: 1px; background: linear-gradient(to right, transparent, rgba(223, 186, 115, 0.4), transparent); margin: 20px 0; }
            .card-details { background: rgba(255,255,255,0.03); border: 1px solid rgba(223, 186, 115, 0.3); border-radius: 16px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #9CA3AF; text-transform: uppercase; font-family: monospace; font-size: 11px; }
            .detail-value { color: #FFFFFF; font-weight: 600; text-align: right; }
            .btn-wrap { text-align: center; margin: 28px 0; }
            .btn { display: inline-block; background: linear-gradient(135deg, #F5D799 0%, #DFBA73 50%, #B88B38 100%); color: #050608 !important; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-family: monospace; }
            .footer { text-align: center; color: #6B7280; font-size: 10px; margin-top: 24px; text-transform: uppercase; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="logo-text">LAS BARBER STUDIO</h1>
            <p class="tagline">Painel de Notificações do Master Barber</p>
            
            <div class="divider"></div>

            <h2 style="font-size: 19px; color: #FFFFFF; font-family: Georgia, serif; margin: 0 0 10px 0;">Olá, ${barberName}!</h2>
            <p style="color: #D1D5DB; font-size: 14px; line-height: 1.6;">Um novo agendamento acabou de ser realizado no estúdio privativo:</p>

            <div class="card-details">
              <div class="detail-row">
                <span class="detail-label">Cliente</span>
                <span class="detail-value" style="color: #F5D799;">${clientName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">WhatsApp</span>
                <span class="detail-value">${clientPhone}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">E-mail</span>
                <span class="detail-value">${clientEmail}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Ritual</span>
                <span class="detail-value" style="color: #DFBA73;">${serviceName} (R$ ${servicePrice},00)</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Data</span>
                <span class="detail-value">${appointmentDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Horário</span>
                <span class="detail-value" style="color: #DFBA73;">${appointmentTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Pagamento</span>
                <span class="detail-value">${paymentMethod}</span>
              </div>
            </div>

            <div class="btn-wrap">
              <a href="${SITE_URL}/dashboard/agenda" class="btn" target="_blank">Abrir Minha Agenda no Painel</a>
            </div>
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} LAS Barber Studio • Sistema Privativo
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Erro Resend notificação barbeiro:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    console.error("Exceção Resend notificação barbeiro:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * 3. Recuperação de Senha Segura
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  if (!resend) {
    console.warn("⚠️ RESEND_API_KEY não configurada. Simulação para:", to, "| Link:", resetUrl);
    return { success: true, simulated: true, message: "Envio simulado com sucesso." };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to,
      subject: "LAS Barber Studio — Redefinição de Senha",
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redefinição de Senha — LAS Barber Studio</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050608; color: #FFFFFF; margin: 0; padding: 40px 16px; }
            .container { max-width: 560px; margin: 0 auto; background: linear-gradient(180deg, #0A0D14 0%, #050608 100%); border: 1px solid rgba(223, 186, 115, 0.4); border-radius: 24px; padding: 44px 32px; box-shadow: 0 25px 60px rgba(0,0,0,0.9); }
            .emblem { text-align: center; margin-bottom: 24px; }
            .diamond { display: inline-block; width: 48px; height: 48px; border: 2px solid #DFBA73; transform: rotate(45deg); line-height: 48px; text-align: center; }
            .diamond-text { display: inline-block; transform: rotate(-45deg); color: #DFBA73; font-size: 22px; font-weight: bold; font-family: serif; }
            .logo-text { font-family: Georgia, serif; font-size: 24px; color: #FFFFFF; letter-spacing: 4px; text-transform: uppercase; text-align: center; margin: 16px 0 4px 0; font-weight: 700; }
            .tagline { color: #DFBA73; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; text-align: center; margin: 0 0 28px 0; font-weight: 600; font-family: monospace; }
            .divider { height: 1px; background: linear-gradient(to right, transparent, rgba(223, 186, 115, 0.4), transparent); margin: 24px 0; }
            h2 { font-size: 19px; font-weight: 600; color: #FFFFFF; margin-top: 0; font-family: Georgia, serif; }
            p { color: #D1D5DB; font-size: 14px; line-height: 1.7; margin: 16px 0; }
            .btn-wrap { text-align: center; margin: 32px 0; }
            .btn { display: inline-block; background: linear-gradient(135deg, #F5D799 0%, #DFBA73 50%, #B88B38 100%); color: #050608 !important; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; padding: 18px 40px; border-radius: 12px; box-shadow: 0 8px 25px rgba(223, 186, 115, 0.35); font-family: monospace; }
            .link-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(223, 186, 115, 0.2); padding: 14px; border-radius: 10px; font-size: 11px; color: #DFBA73; word-break: break-all; margin-top: 12px; font-family: monospace; }
            .security-note { font-size: 11px; color: #9CA3AF; margin-top: 24px; line-height: 1.6; }
            .footer { text-align: center; color: #6B7280; font-size: 11px; margin-top: 36px; letter-spacing: 1.5px; text-transform: uppercase; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="emblem">
              <div class="diamond">
                <span class="diamond-text">L</span>
              </div>
              <h1 class="logo-text">LAS BARBER STUDIO</h1>
              <p class="tagline">Lucas Augusto • Estúdio Privativo</p>
            </div>
            
            <div class="divider"></div>

            <h2>Olá, ${name}!</h2>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta no sistema do <strong>LAS Barber Studio</strong>.</p>
            <p>Para criar uma nova senha com total segurança, clique no botão dourado abaixo:</p>

            <div class="btn-wrap">
              <a href="${resetUrl}" class="btn" target="_blank">Redefinir Minha Senha</a>
            </div>

            <p style="font-size: 12px; color: #9CA3AF;">Se o botão acima não funcionar, copie e cole o link seguro diretamente no seu navegador:</p>
            <div class="link-box">${resetUrl}</div>

            <div class="divider"></div>

            <p class="security-note">
              * Este link de segurança expira automaticamente em 1 hora.<br>
              * Se você não solicitou esta redefinição, fique tranquilo: nenhuma alteração foi realizada e sua conta permanece totalmente protegida.
            </p>
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} LAS Barber Studio • Rua dos Ipês, Nº 360, Centro — Comodoro - MT
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Erro retornado pelo Resend:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Exceção ao enviar via Resend:", err);
    return { success: false, error: err.message || String(err) };
  }
}
