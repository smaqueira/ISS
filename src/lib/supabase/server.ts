import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Todas las consultas de la app pasan por acá (server-side). Usamos el cliente
// plano de supabase-js con la service_role (secreta, solo server) — es el camino
// documentado para bypassar RLS de forma confiable (el createServerClient de
// @supabase/ssr no lo aplica bien). La app no usa Supabase Auth (el login es la
// cookie iss_session), así que no necesitamos el manejo de sesión por cookies.
// Fallback a la anon solo si la service_role no está seteada.
const SERVER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SERVER_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
