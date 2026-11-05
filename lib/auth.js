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

// Cliente que ainda está com a senha inicial (6 primeiros dígitos do CNPJ).
export function precisaTrocarSenha(user) {
  return user?.app_metadata?.trocar_senha === true
}

export async function exigirAdmin() {
  const user = await getUsuario()
  if (!ehAdmin(user)) redirect('/login')
  return user
}
