'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ehEquipe, getUsuario, precisaTrocarSenha } from '@/lib/auth'
import { cnpjDoEmailDeLogin, emailDeLogin, erroNaNovaSenha } from '@/lib/login'
import { validarRecomendacao } from '@/lib/recomendacoes'

export async function entrar(_estado, formData) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailDeLogin(formData.get('login')),
    password: String(formData.get('senha')),
  })
  if (error?.code === 'invalid_credentials') return { erro: 'CNPJ/e-mail ou senha incorretos.' }
  if (error) {
    // Outros erros costumam ser configuração (chaves do Supabase) e não senha errada.
    console.error('Erro no login:', error)
    return { erro: `Não foi possível entrar agora (${error.message}).` }
  }
  redirect(ehEquipe(data.user) ? '/admin' : '/cliente')
}

export async function sair() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function trocarSenha(_estado, formData) {
  const user = await getUsuario()
  if (!user) redirect('/login')
  const senha = String(formData.get('senha'))
  const erro = erroNaNovaSenha(senha, formData.get('confirmacao'), cnpjDoEmailDeLogin(user.email))
  if (erro) return { erro }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error) return { erro: 'Não foi possível trocar a senha. Tente de novo.' }
  return { ok: 'Senha alterada.' }
}

// Primeiro acesso: troca a senha inicial (6 dígitos do CNPJ) e libera a Área do Cliente.
// A marca "trocar_senha" fica no app_metadata, que só o servidor consegue alterar; as regras
// do banco (RLS) escondem os dados enquanto ela estiver ligada.
export async function definirSenhaPrimeiroAcesso(_estado, formData) {
  const user = await getUsuario()
  if (!user) redirect('/login')
  if (!precisaTrocarSenha(user)) redirect('/cliente')

  const senha = String(formData.get('senha'))
  const erro = erroNaNovaSenha(senha, formData.get('confirmacao'), cnpjDoEmailDeLogin(user.email))
  if (erro) return { erro }

  const { error } = await createAdminClient().auth.admin.updateUserById(user.id, {
    password: senha,
    app_metadata: { ...user.app_metadata, trocar_senha: false },
  })
  if (error) {
    console.error('Erro ao definir senha no primeiro acesso:', error)
    return { erro: 'Não foi possível salvar a senha. Tente de novo.' }
  }

  // Entra de novo para a sessão receber a marca atualizada.
  const supabase = await createClient()
  const { error: erroLogin } = await supabase.auth.signInWithPassword({ email: user.email, password: senha })
  if (erroLogin) redirect('/login')
  redirect(ehEquipe(user) ? '/admin' : '/cliente')
}

// Recomendação deixada no site por quem já foi atendido. Fica guardada até o escritório aprovar.
export async function enviarRecomendacao(_estado, formData) {
  const { erro, robo, registro } = validarRecomendacao(Object.fromEntries(formData))
  if (erro) return { erro }
  const ok = { ok: 'Obrigado pela recomendação! Ela aparece no site depois de revisada.' }
  if (robo) return ok
  const { error } = await createAdminClient().from('recomendacoes').insert(registro)
  if (error) {
    console.error('Erro ao salvar recomendação:', error)
    return { erro: 'Não foi possível enviar agora. Tente de novo em instantes ou mande pelo WhatsApp.' }
  }
  return ok
}
