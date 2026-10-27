'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ehAdmin } from '@/lib/auth'

export async function entrar(_estado, formData) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')).trim(),
    password: String(formData.get('senha')),
  })
  if (error?.code === 'invalid_credentials') return { erro: 'E-mail ou senha incorretos.' }
  if (error) {
    // Outros erros costumam ser configuração (chaves do Supabase) e não senha errada.
    console.error('Erro no login:', error)
    return { erro: `Não foi possível entrar agora (${error.message}).` }
  }
  redirect(ehAdmin(data.user) ? '/admin' : '/cliente')
}

export async function sair() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function trocarSenha(_estado, formData) {
  const senha = String(formData.get('senha'))
  if (senha.length < 8) return { erro: 'A senha precisa ter pelo menos 8 caracteres.' }
  if (senha !== formData.get('confirmacao')) return { erro: 'As duas senhas não são iguais.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error) return { erro: 'Não foi possível trocar a senha. Tente de novo.' }
  return { ok: 'Senha alterada.' }
}
