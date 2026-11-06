import { NextResponse } from "next/server";
import { getBarberByEmail, BARBERS } from "@/lib/barbers";
import { sendPasswordResetEmail } from "@/lib/resend";
import crypto from "crypto";

declare global {
  var __las_reset_tokens: Record<string, { email: string; expiresAt: number }> | undefined;
}

if (!global.__las_reset_tokens) {
  global.__las_reset_tokens = {};
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Por favor, informe um endereço de e-mail válido." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Localiza o usuário correspondente
    let userName = "Lucas Augusto";
    let targetPhone = "5569993783204";
    const matchedBarber = getBarberByEmail(cleanEmail);

    if (matchedBarber) {
      userName = matchedBarber.name;
      targetPhone = matchedBarber.phone;
    } else {
      userName = "Cliente VIP";
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 1000 * 60 * 60; // 1 hora

    if (!global.__las_reset_tokens) {
      global.__las_reset_tokens = {};
    }
    global.__las_reset_tokens[token] = {
      email: cleanEmail,
      expiresAt,
    };

    const origin = process.env.NEXTAUTH_URL || "https://las-barber-studio.vercel.app";
    const resetUrl = `${origin}/recuperar-senha?token=${token}`;

    const whatsappMsg = `Olá, ${userName}! Segue o link seguro para redefinir sua senha de acesso no LAS Barber Studio:\n\n${resetUrl}\n\n(Válido por 1 hora)`;
    const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(whatsappMsg)}`;

    let resendResult: any = null;
    try {
      resendResult = await sendPasswordResetEmail({
        to: cleanEmail,
        name: userName,
        resetUrl,
      });
    } catch (e: any) {
      resendResult = { success: false, error: e.message };
    }

    return NextResponse.json({
      success: true,
      message: "Instruções de redefinição de senha enviadas com sucesso.",
    });
  } catch (error: any) {
    console.error("Erro em forgot-password:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar recuperação de senha." },
      { status: 500 }
    );
  }
}
