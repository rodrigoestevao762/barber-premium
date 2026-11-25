import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMonthlyFinancialSummary } from "@/lib/financial-summary";
import { getBrazilNow } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (userRole !== "ADMIN" && userRole !== "BARBER")) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const todayBrazil = getBrazilNow().date;
    const dateParam = searchParams.get("date") || todayBrazil;
    const monthParam = searchParams.get("month") || dateParam.slice(0, 7);

    const summary = await getMonthlyFinancialSummary(monthParam, dateParam);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Erro ao gerar consolidado financeiro mensal:", error);
    return NextResponse.json(
      { error: "Erro ao gerar consolidado financeiro mensal" },
      { status: 500 }
    );
  }
}
