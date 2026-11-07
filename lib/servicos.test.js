import { test } from 'node:test'
import assert from 'node:assert/strict'
import { palavras, sugerirServico } from './servicos.js'

const concreto = { id: 'c', nome: 'Bombeamento de concreto', cod_trib_nac: '070202', palavras_chave: 'bombeamento concreto concretagem bomba lança' }
const marketing = { id: 'm', nome: 'Marketing', cod_trib_nac: '170601', palavras_chave: '' }
const historico = [
  { descricao: 'Serviço de bombeamento de concreto na obra Residencial Pituba', cod_trib_nac: '070202', numero: '12' },
  { descricao: 'Divulgação e promoção de vendas nas redes sociais - outubro', cod_trib_nac: '170601', numero: '15' },
]

test('normaliza palavras sem acento e sem palavras vazias', () => {
  assert.deepEqual(palavras('Promoção de Vendas, referente a outubro'), ['promo', 'venda', 'outub'])
})

test('cliente com um serviço só usa sempre ele', () => {
  assert.equal(sugerirServico('qualquer coisa', [concreto]).servico, concreto)
})

test('repete o código da nota anterior parecida', () => {
  const r = sugerirServico('Bombeamento de concreto obra Imbuí', [concreto, marketing], historico)
  assert.equal(r.servico, concreto)
  assert.match(r.motivo, /nº 12/)
  assert.equal(sugerirServico('Promoção de vendas em redes sociais novembro', [concreto, marketing], historico).servico, marketing)
})

test('usa as palavras-chave quando ainda não há nota anterior', () => {
  assert.equal(sugerirServico('Concretagem com bomba lança', [concreto, marketing], []).servico, concreto)
})

test('pergunta quando não há nota parecida', () => {
  const r = sugerirServico('Locação de equipamento', [concreto, marketing], historico)
  assert.equal(r.servico, null)
  assert.match(r.motivo, /Nenhuma nota anterior/)
})

test('pergunta quando a descrição serve para os dois serviços', () => {
  const r = sugerirServico('Bombeamento de concreto e divulgação nas redes sociais', [concreto, marketing], historico)
  assert.equal(r.servico, null)
  assert.equal(r.candidatos.length, 2)
})
