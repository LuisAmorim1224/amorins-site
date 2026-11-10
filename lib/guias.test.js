import { test } from 'node:test'
import assert from 'node:assert/strict'
import { guiasNovas, separarGuias, situacaoGuia } from './guias.js'

const hoje = '2026-11-10'

test('situação da guia', () => {
  assert.equal(situacaoGuia({ paga: true, validade: '2026-10-20' }, hoje), 'paga')
  assert.equal(situacaoGuia({ paga: false, validade: '2026-10-20' }, hoje), 'vencida')
  assert.equal(situacaoGuia({ paga: false, validade: '2026-11-20' }, hoje), 'a_pagar')
  assert.equal(situacaoGuia({ paga: false, validade: null }, hoje), 'a_pagar')
})

test('separa em aberto e pagas, ignorando outros documentos', () => {
  const { emAberto, pagas } = separarGuias(
    [
      { nome: 'DAS nov', tipo: 'guia', validade: '2026-12-20', data: '2026-11-09' },
      { nome: 'DARF', tipo: 'guia', validade: '2026-11-20', data: '2026-11-01' },
      { nome: 'DAS out', tipo: 'guia', validade: '2026-11-20', paga: true, paga_em: '2026-11-05', data: '2026-10-25' },
      { nome: 'Contrato', tipo: 'contrato_social', data: '2026-01-01' },
    ],
    hoje,
  )
  assert.deepEqual(emAberto.map((g) => g.nome), ['DARF', 'DAS nov'])
  assert.deepEqual(pagas.map((g) => g.nome), ['DAS out'])
})

test('guia nova = enviada nos últimos 7 dias', () => {
  const agora = new Date('2026-11-10T12:00:00Z')
  const novas = guiasNovas([{ nome: 'A', data: '2026-11-08T10:00:00Z' }, { nome: 'B', data: '2026-10-01T10:00:00Z' }], agora)
  assert.deepEqual(novas.map((g) => g.nome), ['A'])
})
