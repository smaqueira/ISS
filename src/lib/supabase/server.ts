import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Todas las consultas de la app pasan por acá (server-side). Usamos la
// service_role (secreta, solo server) para poder activar RLS en las tablas y
// bloquear el acceso público con la anon key. Si por algún motivo la
// service_role no está seteada, caemos a la anon para no romper — pero en ese
// caso, con RLS activo, las consultas fallarían: la service_role debe existir.
const SERVER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function createClient() {
  const store = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SERVER_KEY,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)) } catch {} },
      },
    }
  )
}
