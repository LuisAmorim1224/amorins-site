// Dados de contato do escritório, usados no site e na Área do Cliente.
export const WHATSAPP = '5571999454356'
export const TELEFONE = '(71) 99945-4356'
export const EMAIL = 'amorinscontabil@gmail.com'
export const YOUTUBE = 'https://www.youtube.com/@AmorinsContabil'

export function linkWhatsapp(mensagem = 'Olá! Vim pelo site da Amorins Contábil.') {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`
}
