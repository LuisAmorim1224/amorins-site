import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Acesso total, só para o administrador. Nunca use em código que roda no navegador.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
