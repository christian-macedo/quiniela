import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";

// Create the next-intl middleware with locale detection from cookie
const handleI18nRouting = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "never",
  localeDetection: true,
});

export async function middleware(request: NextRequest) {
  // Get locale from cookie if it exists
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;

  // 1. Handle internationalization
  const response = handleI18nRouting(request);

  // Override the locale header if we have a valid cookie
  if (cookieLocale && locales.includes(cookieLocale as (typeof locales)[number])) {
    response.headers.set("x-next-intl-locale", cookieLocale);
  }

  // 2. Handle Supabase auth session refresh
  const authResponse = await updateSession(request);

  // If auth middleware returns a response (e.g., redirect), merge with i18n
  if (authResponse) {
    // Copy all cookies from i18n response to auth response
    response.cookies.getAll().forEach((cookie) => {
      authResponse.cookies.set(cookie);
    });

    // Copy locale header if set
    const locale = response.headers.get("x-next-intl-locale");
    if (locale) {
      authResponse.headers.set("x-next-intl-locale", locale);
    }

    return authResponse;
  }

  // Otherwise use the i18n response
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
