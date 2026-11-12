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

test('empate entre notas anteriores: repete a mais recente', () => {
  const bomba = { id: 'b', nome: 'Locação de bomba', cod_trib_nac: '070201', palavras_chave: '' }
  const notas = [
    { descricao: 'Bombeamento de concreto obra Itapuã', cod_trib_nac: '070202', numero: '30', data_emissao: '2026-10-20' },
    { descricao: 'Bombeamento de concreto obra Brotas', cod_trib_nac: '070201', numero: '22', data_emissao: '2026-08-02' },
  ]
  const r = sugerirServico('Bombeamento de concreto', [concreto, bomba], notas)
  assert.equal(r.servico, concreto)
  assert.match(r.motivo, /nº 30/)
})

test('dois serviços com o mesmo código não travam a nota', () => {
  const copia = { ...concreto, id: 'c2' }
  assert.equal(sugerirServico('Bombeamento de concreto', [concreto, copia], historico).servico.cod_trib_nac, '070202')
})

test('nota mais recente vence mesmo com descrição mais longa (caso M3)', () => {
  const transporte = { id: 't', nome: 'Transporte municipal', cod_trib_nac: '160201', palavras_chave: '' }
  const isento = { id: 'i', nome: 'Sem ISS', cod_trib_nac: '990101', palavras_chave: '' }
  const notas = [
    { descricao: 'Bombeamento de 24m³ de concreto Usinado Fck 30 Mpa', cod_trib_nac: '160201', numero: '50', data_emissao: '2026-11-06' },
    { descricao: 'Bombeamento de concreto usinado.', cod_trib_nac: '990101', numero: '66', data_emissao: '2026-09-01' },
  ]
  const r = sugerirServico('Bombeamento de Concreto até 40 metros de Tubulação', [transporte, isento], notas)
  assert.equal(r.servico, transporte)
  assert.match(r.motivo, /nº 50/)
})

test('pergunta quando a descrição serve para os dois serviços', () => {
  const divulgacao = { ...marketing, palavras_chave: 'divulgação redes sociais' }
  const bombeamento = { ...concreto, palavras_chave: 'bombeamento concreto redes' }
  const r = sugerirServico('Bombeamento de concreto e divulgação nas redes sociais', [bombeamento, divulgacao], [])
  assert.equal(r.servico, null)
  assert.equal(r.candidatos.length, 2)
})

test('nota anterior parecida vale mais que as palavras-chave', () => {
  const transporte = { id: 't', nome: 'Transporte municipal', cod_trib_nac: '160201', palavras_chave: '' }
  const notas = [{ descricao: 'Bombeamento de 24m³ de concreto Usinado Fck 30 Mpa', cod_trib_nac: '160201', numero: '50', data_emissao: '2026-11-06' }]
  const r = sugerirServico('Bombeamento de concreto usinado', [concreto, transporte], notas)
  assert.equal(r.servico, transporte)
  assert.match(r.motivo, /nº 50/)
})
