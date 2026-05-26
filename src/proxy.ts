import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const publicPaths = ["/login", "/register", "/api/auth", "/api/health", "/"]
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))

  // NextAuth v5 (Auth.js) renamed the session cookie from
  // "next-auth.session-token" to "authjs.session-token".
  // On HTTPS (production) the cookie gets a __Secure- prefix.
  const isHttps = req.url.startsWith("https")
  const cookieName = isHttps
    ? "__Secure-authjs.session-token"
    : "authjs.session-token"

  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName })
  const isLoggedIn = !!token

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }
  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
}
