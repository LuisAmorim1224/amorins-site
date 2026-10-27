import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getUsuario() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export function ehAdmin(user) {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  return Boolean(user && admin && user.email?.toLowerCase() === admin)
}

export async function exigirAdmin() {
  const user = await getUsuario()
  if (!ehAdmin(user)) redirect('/login')
  return user
}
