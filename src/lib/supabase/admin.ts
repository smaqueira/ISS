import { createClient } from '@supabase/supabase-js'

// Cliente con service_role — bypasea RLS. Solo usar en server-side (webhooks, cron jobs).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
