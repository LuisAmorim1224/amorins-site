import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ehSocio, podeVerCliente } from '@/lib/equipe'

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

// Quem entra no painel do escritório: o administrador ou um sócio (com clientes liberados).
export function ehEquipe(user) {
  return ehAdmin(user) || ehSocio(user)
}

// Cliente (ou sócio) que ainda está com a senha inicial.
export function precisaTrocarSenha(user) {
  return user?.app_metadata?.trocar_senha === true
}

// ---------- Modo "ver como cliente" (teste do escritório) ----------
// O administrador ou sócio abre a Área do Cliente com os dados de um cliente liberado.
// Nada é enviado de verdade nesse modo: as ações do cliente só simulam.
export const COOKIE_VER_COMO = 'ver_como_cliente'

// Devolve o id do cliente que a equipe está vendo, ou null.
export async function clienteEmTeste(user) {
  if (!ehEquipe(user)) return null
  const id = (await cookies()).get(COOKIE_VER_COMO)?.value
  return id && podeVerCliente(user, id, ehAdmin(user)) ? id : null
}

// Cliente logado e já com senha própria. Retorna o usuário ou redireciona.
// No modo teste devolve { id: cliente, teste: true }.
export async function exigirCliente() {
  const user = await getUsuario()
  if (!user) redirect('/login')
  if (ehEquipe(user)) {
    const id = await clienteEmTeste(user)
    if (!id) redirect('/admin')
    return { id, teste: true, equipe: user }
  }
  if (precisaTrocarSenha(user)) redirect('/cliente')
  return user
}

// Só o administrador (cadastro de clientes, sócios, recomendações, rotinas de todos).
export async function exigirAdmin() {
  const user = await getUsuario()
  if (!ehAdmin(user)) redirect(ehSocio(user) ? '/admin' : '/login')
  return user
}

// Administrador ou sócio.
export async function exigirEquipe() {
  const user = await getUsuario()
  if (!ehEquipe(user)) redirect('/login')
  if (ehSocio(user) && precisaTrocarSenha(user)) redirect('/admin/primeiro-acesso')
  return user
}

// Administrador, ou sócio com este cliente liberado.
export async function exigirAcessoCliente(clienteId) {
  const user = await exigirEquipe()
  if (!podeVerCliente(user, clienteId, ehAdmin(user))) redirect('/admin')
  return user
}
