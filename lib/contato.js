// Dados de contato do escritório, usados no site e na Área do Cliente.
export const WHATSAPP = '5571999454356'
export const TELEFONE = '(71) 99945-4356'
export const EMAIL = 'amorinscontabil@gmail.com'
export const YOUTUBE = 'https://www.youtube.com/@AmorinsContabil'

export function linkWhatsapp(mensagem = 'Olá! Vim pelo site da Amorins Contábil.') {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`
}

// CNPJ do escritório: aparece no passo a passo da procuração eletrônica (e-CAC).
export const CNPJ_ESCRITORIO = '29195194000100'

// Link para o escritório chamar um contato no WhatsApp (número com DDD, sem o 55).
export function linkWhatsappPara(numero, mensagem = '') {
  const s = String(numero || '').replace(/\D/g, '')
  return `https://wa.me/${s.length <= 11 ? `55${s}` : s}?text=${encodeURIComponent(mensagem)}`
}
