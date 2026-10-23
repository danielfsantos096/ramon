import { NextResponse, type NextRequest } from "next/server";

/** Comparação em tempo (quase) constante — o Edge Runtime não tem timingSafeEqual. */
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function unauthorized() {
  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Dashboard BF2026", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  // Sem credenciais configuradas: em produção bloqueia (fail closed); em dev libera.
  if (!user || !pass) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        "Proteção não configurada: defina BASIC_AUTH_USER e BASIC_AUTH_PASSWORD.",
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.next();
  }

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  let decoded = "";
  try {
    const bytes = Uint8Array.from(atob(header.slice(6).trim()), (c) => c.charCodeAt(0));
    decoded = new TextDecoder().decode(bytes);
  } catch {
    return unauthorized();
  }

  const sep = decoded.indexOf(":");
  if (sep < 0) return unauthorized();
  const givenUser = decoded.slice(0, sep);
  const givenPass = decoded.slice(sep + 1);

  // avalia os dois para não vazar qual campo falhou
  const okUser = safeEqual(givenUser, user);
  const okPass = safeEqual(givenPass, pass);
  if (!(okUser && okPass)) return unauthorized();

  return NextResponse.next();
}

export const config = {
  // Protege tudo (páginas e /api/*), exceto assets estáticos do Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
