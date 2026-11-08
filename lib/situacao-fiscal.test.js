import { test } from 'node:test'
import assert from 'node:assert/strict'
import { orcar, resumirRelatorio } from './situacao-fiscal.js'

// Texto fictício imitando a estrutura do Relatório de Situação Fiscal.
const relatorio = `
MINISTÉRIO DA FAZENDA
Diagnóstico Fiscal na Receita Federal e Procuradoria-Geral da Fazenda Nacional
Pendência - Débito (SIEF)
Receita PA/Exerc. Dt. Vcto Vl.Original Sdo.Devedor Situação
1507-01 - MULTA OMISSAO 01/2023 10/03/2023 50,00 50,00 DEVEDOR
Pendência - Omissão de Declaração
DASN SIMEI 2022, 2023
DCTFWeb 01/2024 02/2024
Pendência - Inscrição (SIDA)
Inscrição: 50.4.24.000000-00 Receita: 1001 - SIMPLES NACIONAL Situação: ATIVA EM COBRANÇA
Débito com Exigibilidade Suspensa (SIEF)
Pendência que não deve contar 2019
Final do Relatório
`

test('resume pendências por tipo, com declarações e anos', () => {
  const r = resumirRelatorio(relatorio)
  assert.equal(r.semPendencias, false)
  assert.deepEqual(r.pendencias.map((p) => p.tipo), ['omissao', 'debito', 'divida_ativa'])
  const omissao = r.pendencias[0]
  assert.deepEqual(omissao.declaracoes.sort(), ['DASN-SIMEI', 'DCTFWeb'])
  assert.deepEqual(omissao.anos, ['2022', '2023', '2024'])
  assert.equal(omissao.quantidade, 2)
})

test('relatório sem pendências', () => {
  const r = resumirRelatorio(
    'Diagnóstico Fiscal\nNão foram detectadas pendências/exigibilidades suspensas nos controles da Receita Federal e da Procuradoria-Geral da Fazenda Nacional.'
  )
  assert.equal(r.semPendencias, true)
  assert.equal(r.lido, true)
  assert.deepEqual(r.pendencias, [])
})

test('texto que não parece relatório não é dado como lido', () => {
  assert.equal(resumirRelatorio('qualquer coisa').lido, false)
})

test('orçamento só fecha quando todo tipo tem preço', () => {
  const { pendencias } = resumirRelatorio(relatorio)
  const parcial = orcar(pendencias, [{ tipo: 'omissao', valor: 100, por_item: true }])
  assert.equal(parcial.total, null)
  assert.deepEqual(parcial.faltaPreco, ['debito', 'divida_ativa'])

  const completo = orcar(pendencias, [
    { tipo: 'omissao', valor: 100, por_item: true },
    { tipo: 'debito', valor: 150, por_item: false },
    { tipo: 'divida_ativa', valor: 300, por_item: false },
  ])
  assert.equal(completo.total, 650)
  assert.equal(completo.itens[0].valor, 200)
})

test('preço vazio conta como sem preço', () => {
  const r = orcar([{ tipo: 'debito', quantidade: 1 }], [{ tipo: 'debito', valor: null }])
  assert.equal(r.total, null)
})
