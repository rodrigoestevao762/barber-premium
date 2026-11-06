import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
    console.warn(
      "⚠️ RESEND_API_KEY não configurada no ambiente. Modo de simulação para:",
      to,
      "| Link gerado:",
      resetUrl
    );
    return {
      success: true,
      simulated: true,
      message: "Envio simulado com sucesso (configure RESEND_API_KEY nas variáveis para envio real via SMTP/API)",
    };
  }

  try {
    // Permite configurar remetente customizado ou usa o padrão do Resend
    const fromSender = process.env.RESEND_FROM || "LAS Barber Studio <onboarding@resend.dev>";

    const { data, error } = await resend.emails.send({
      from: fromSender,
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
            .tagline { color: #DFBA73; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; text-align: center; margin: 0 0 28px 0; font-weight: 600; }
            .divider { height: 1px; background: linear-gradient(to right, transparent, rgba(223, 186, 115, 0.4), transparent); margin: 24px 0; }
            h2 { font-size: 19px; font-weight: 600; color: #FFFFFF; margin-top: 0; }
            p { color: #D1D5DB; font-size: 14px; line-height: 1.7; margin: 16px 0; }
            .btn-wrap { text-align: center; margin: 32px 0; }
            .btn { display: inline-block; background: linear-gradient(135deg, #F5D799 0%, #DFBA73 50%, #B88B38 100%); color: #050608 !important; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; padding: 18px 40px; border-radius: 12px; box-shadow: 0 8px 25px rgba(223, 186, 115, 0.35); }
            .link-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(223, 186, 115, 0.2); padding: 14px; border-radius: 10px; font-size: 11px; color: #DFBA73; word-break: break-all; margin-top: 12px; }
            .security-note { font-size: 11px; color: #9CA3AF; margin-top: 24px; line-height: 1.6; }
            .footer { text-align: center; color: #6B7280; font-size: 11px; margin-top: 36px; letter-spacing: 1.5px; text-transform: uppercase; }
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
