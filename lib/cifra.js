import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// Senha do certificado guardada cifrada (AES-256-GCM). A chave fica só na Vercel: usa
// NFSE_CHAVE_CERTIFICADOS se existir; senão, a chave secreta do Supabase que já está lá.
// Quem só vê as tabelas do banco não consegue usar o certificado.
// Se a chave usada for trocada, os certificados precisam ser reenviados.
const chave = (segredo = process.env.NFSE_CHAVE_CERTIFICADOS || process.env.SUPABASE_SERVICE_ROLE_KEY) => {
  if (!segredo || segredo.length < 16) throw new Error('Chave para cifrar o certificado não configurada na Vercel.')
  return createHash('sha256').update(segredo).digest()
}

export function cifrar(texto, segredo) {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', chave(segredo), iv)
  const dados = Buffer.concat([c.update(String(texto), 'utf8'), c.final()])
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), dados.toString('base64')].join(':')
}

export function decifrar(cifrado, segredo) {
  const [versao, iv, tag, dados] = String(cifrado || '').split(':')
  if (versao !== 'v1') throw new Error('Senha do certificado não cadastrada.')
  const d = createDecipheriv('aes-256-gcm', chave(segredo), Buffer.from(iv, 'base64'))
  d.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([d.update(Buffer.from(dados, 'base64')), d.final()]).toString('utf8')
}
