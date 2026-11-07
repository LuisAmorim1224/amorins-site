import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assinatura, validarRecomendacao } from './recomendacoes.js'

const base = { nome: ' Maria  Souza ', texto: 'Atendimento excelente, regularizou meu CNPJ rápido.', autorizo: 'on' }

test('recomendação válida vira registro limpo', () => {
  const { registro } = validarRecomendacao({ ...base, empresa: '', nota: '5' })
  assert.equal(registro.nome, 'Maria Souza')
  assert.equal(registro.empresa, null)
  assert.equal(registro.nota, 5)
})

test('exige nome, texto mínimo e autorização', () => {
  assert.match(validarRecomendacao({ ...base, nome: '' }).erro, /nome/)
  assert.match(validarRecomendacao({ ...base, texto: 'bom' }).erro, /20 letras/)
  assert.match(validarRecomendacao({ ...base, autorizo: null }).erro, /autorização/)
})

test('nota fora de 1 a 5 é recusada', () => {
  assert.match(validarRecomendacao({ ...base, nota: '9' }).erro, /1 a 5/)
})

test('campo armadilha preenchido é tratado como robô', () => {
  assert.deepEqual(validarRecomendacao({ ...base, site: 'http://spam' }), { robo: true })
})

test('assinatura junta só o que foi informado', () => {
  assert.equal(assinatura({ nome: 'Maria', empresa: null, cidade: 'Salvador/BA' }), 'Maria · Salvador/BA')
})
