import { test } from 'node:test'
import assert from 'node:assert/strict'
import { linkCobrancaWhatsapp, mensagemCobranca, numeroWhatsapp } from './cobranca-whatsapp.js'

test('número do WhatsApp com DDI 55', () => {
  assert.equal(numeroWhatsapp('(71) 98888-7777'), '5571988887777')
  assert.equal(numeroWhatsapp('7133334444'), '557133334444')
  assert.equal(numeroWhatsapp('+55 71 98888-7777'), '5571988887777')
  assert.equal(numeroWhatsapp('(71) 98888-7777 / (71) 3333-4444'), '5571988887777')
  assert.equal(numeroWhatsapp(''), null)
  assert.equal(numeroWhatsapp('123'), null)
})

test('mensagem com valor, vencimento e link', () => {
  const m = mensagemCobranca({ nome: 'Empresa Exemplo Ltda', valor: 500, vencimento: '2026-12-05', link: 'https://exemplo.test/i/1' })
  assert.match(m, /^Olá, Empresa!/)
  assert.match(m, /R\$\s500,00/)
  assert.match(m, /05\/12\/2026/)
  assert.match(m, /https:\/\/exemplo\.test\/i\/1/)
})

test('link sem número deixa escolher o contato', () => {
  const l = linkCobrancaWhatsapp({ telefone: null, nome: 'X', valor: 1, vencimento: '2026-12-05', link: 'https://exemplo.test' })
  assert.ok(l.startsWith('https://wa.me/?text='))
  const l2 = linkCobrancaWhatsapp({ telefone: '71988887777', nome: 'X', valor: 1, vencimento: '2026-12-05', link: 'https://exemplo.test' })
  assert.ok(l2.startsWith('https://wa.me/5571988887777?text='))
})
