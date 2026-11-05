// Login de clientes pelo CNPJ.
//
// O Supabase exige um e-mail por usuário. Para o cliente entrar só com o CNPJ, cada CNPJ vira
// um e-mail interno no domínio do escritório (o cliente nunca vê nem recebe nada nele).
// A senha inicial são os 6 primeiros dígitos do CNPJ e precisa ser trocada no primeiro acesso.

export const DOMINIO_LOGIN = 'clientes.amorinscontabilidade.com.br'

const somenteNumeros = (texto) => String(texto || '').replace(/\D/g, '')

// "66.901.942/0001-59" -> "66901942000159@clientes...". E-mails passam como estão (minúsculos).
export function emailDeLogin(identificador) {
  const texto = String(identificador || '').trim()
  if (!texto.includes('@')) {
    const numeros = somenteNumeros(texto)
    if (numeros.length === 14) return `${numeros}@${DOMINIO_LOGIN}`
  }
  return texto.toLowerCase()
}

export function ehEmailDeLogin(email) {
  return String(email || '').toLowerCase().endsWith(`@${DOMINIO_LOGIN}`)
}

// CNPJ guardado no e-mail interno, ou null para e-mails comuns.
export function cnpjDoEmailDeLogin(email) {
  if (!ehEmailDeLogin(email)) return null
  const numeros = String(email).split('@')[0]
  return /^\d{14}$/.test(numeros) ? numeros : null
}

export function senhaInicial(cnpj) {
  const numeros = somenteNumeros(cnpj)
  if (numeros.length !== 14) throw new Error('A senha inicial automática exige um CNPJ com 14 números.')
  return numeros.slice(0, 6)
}

// Regras da senha nova. Retorna a mensagem de erro, ou null se estiver tudo certo.
export function erroNaNovaSenha(senha, confirmacao, cnpj) {
  const s = String(senha || '')
  if (s.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.'
  if (s !== String(confirmacao || '')) return 'As duas senhas não são iguais.'
  const numeros = somenteNumeros(cnpj)
  if (numeros && (numeros.includes(s) || s.includes(numeros.slice(0, 8)))) {
    return 'Não use o CNPJ na senha: ele é público. Escolha outra senha.'
  }
  return null
}
