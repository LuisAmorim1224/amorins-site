// Link do WhatsApp com a cobrança pronta para o escritório enviar ao cliente (sem custo, envio manual).
import { dataBR, reais } from './formato.js'

// Número no formato do wa.me (55 + DDD + número). Aceita "(71) 99999-9999 / (71) 3333-3333".
export function numeroWhatsapp(telefone) {
  const primeiro = String(telefone || '').split(/[\/,;]/)[0]
  let n = primeiro.replace(/\D/g, '').replace(/^0+/, '')
  if (n.length === 10 || n.length === 11) n = `55${n}`
  return /^55\d{10,11}$/.test(n) ? n : null
}

export function mensagemCobranca({ nome, valor, vencimento, link }) {
  const saudacao = nome ? `Olá, ${String(nome).split(' ')[0]}!` : 'Olá!'
  return [
    `${saudacao} Segue a cobrança dos honorários da Amorins Contábil.`,
    '',
    `Valor: ${reais(valor)}`,
    `Vencimento: ${dataBR(vencimento)}`,
    '',
    `Pague por boleto ou PIX neste link: ${link}`,
    '',
    'Ela também fica disponível na sua Área do Cliente: www.amorinscontabilidade.com.br',
  ].join('\n')
}

// Sem número cadastrado, o WhatsApp abre para escolher o contato.
export function linkCobrancaWhatsapp({ telefone, ...dados }) {
  const numero = numeroWhatsapp(telefone)
  return `https://wa.me/${numero || ''}?text=${encodeURIComponent(mensagemCobranca(dados))}`
}
