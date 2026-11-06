import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Rotas protegidas
const rotasProtegidasBarbeiro = ["/dashboard"];
const rotasProtegidasCliente = ["/painel-cliente"];

// --- RATE LIMITING NO EDGE (In-Memory por isolate) ---
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_MAX = 80; // máx 80 requisições
const RATE_LIMIT_WINDOW = 60 * 1000; // janela de 1 minuto em ms

// --- FIREWALL WAF AVANÇADO ---
const BLOCKED_USER_AGENTS = [
  "wget", "python-requests", "nikto", "sqlmap", "nmap", 
  "gobuster", "dirbuster", "wpscan", "hydra", "acunetix", "havij", "zgrab"
];

const BLOCKED_URL_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,       // Padrões de SQL Injection na URL
  /\.env|\.git|\.aws|\.docker|\.vscode/i, // Bloqueia arquivos e configs sensíveis
  /wp-admin|wp-login|xmlrpc\.php|phpmyadmin/i, // Scanners de WordPress e painéis externos
  /(\.\.\/|\.\.\\)/i,                     // Path traversal
  /\.php$/i,                              // Tentativas de execução remota de PHP
];

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || "super-secret-las-barber-key-2026";

export async function middleware(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const url = request.nextUrl.pathname;
  const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";

  // 1. FIREWALL WAF: Bloqueio de Scanners e Ferramentas Maliciosas
  if (BLOCKED_USER_AGENTS.some((bot) => userAgent.includes(bot))) {
    return new NextResponse("Forbidden - Malicious Scanner Blocked", { status: 403 });
  }

  // 2. FIREWALL WAF: Prevenção de Path Traversal e Injeção de Código na URL
  if (BLOCKED_URL_PATTERNS.some((pattern) => pattern.test(url))) {
    return new NextResponse("Forbidden - Suspicious Payload Detected", { status: 403 });
  }

  // 3. RATE LIMITING NO EDGE (Anti-DDoS / Força Bruta)
  const now = Date.now();
  const windowData = rateLimitMap.get(ip) || { count: 0, lastReset: now };

  if (now - windowData.lastReset > RATE_LIMIT_WINDOW) {
    windowData.count = 1;
    windowData.lastReset = now;
  } else {
    windowData.count++;
  }
  rateLimitMap.set(ip, windowData);

  if (windowData.count > RATE_LIMIT_MAX) {
    return new NextResponse("Too Many Requests - Rate Limit Exceeded", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  const isDashboardRoute = rotasProtegidasBarbeiro.some((r) => url.startsWith(r));
  const isClientRoute = rotasProtegidasCliente.some((r) => url.startsWith(r));
  const isLoginRoute = url === "/login";

  if (!isDashboardRoute && !isClientRoute && !isLoginRoute) {
    const res = NextResponse.next();
    res.headers.set("X-Powered-By", "LAS-Studio-Engine");
    return res;
  }

  // 4. AUTENTICAÇÃO E CONTROLE DE ACESSO RBAC (NextAuth JWT)
  // Tenta com token padrão seguro
  let token = await getToken({
    req: request,
    secret: AUTH_SECRET,
  });

  // Fallback 1: Cookie insecure com AUTH_SECRET
  if (!token) {
    token = await getToken({
      req: request,
      secret: AUTH_SECRET,
      cookieName: "next-auth.session-token",
    });
  }

  // Fallback 2: Cookie secure explícito com AUTH_SECRET
  if (!token) {
    token = await getToken({
      req: request,
      secret: AUTH_SECRET,
      cookieName: "__Secure-next-auth.session-token",
    });
  }

  // Fallback 3: Secret legado de transição
  if (!token) {
    token = await getToken({
      req: request,
      secret: "super-secret-barber-key-123",
    });
  }

  // Fallback 4: Secret legado com cookie insecure
  if (!token) {
    token = await getToken({
      req: request,
      secret: "super-secret-barber-key-123",
      cookieName: "next-auth.session-token",
    });
  }

  // Se tentar acessar rota protegida sem sessão ativa
  if (!token && (isDashboardRoute || isClientRoute)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", url);
    return NextResponse.redirect(loginUrl);
  }

  // Se cliente tentar acessar painel interno do barbeiro/gestor (/dashboard)
  if (token && isDashboardRoute && (token as any).role === "CLIENT") {
    return NextResponse.redirect(new URL("/painel-cliente", request.url));
  }

  // Se barbeiro/gestor tentar acessar painel de cliente (/painel-cliente)
  if (token && isClientRoute && (token as any).role !== "CLIENT") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Se já estiver logado e tentar abrir /login (exceto se vier de logout explícito)
  if (token && isLoginRoute && !request.nextUrl.searchParams.has("logout")) {
    const target = (token as any).role === "CLIENT" ? "/painel-cliente" : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  const response = NextResponse.next();
  response.headers.set("X-Powered-By", "LAS-Studio-Engine");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
