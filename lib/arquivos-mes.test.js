import { test } from 'node:test'
import assert from 'node:assert/strict'
import { agruparPorCompetencia, competenciaValida, nomeCompetencia, nomeNoArmazenamento, nomeParaMostrar } from './arquivos-mes.js'

test('competência válida e nome do mês', () => {
  assert.equal(competenciaValida('2026-10'), '2026-10')
  assert.equal(competenciaValida('2026-13'), null)
  assert.equal(competenciaValida(''), null)
  assert.equal(nomeCompetencia('2026-03'), 'Março de 2026')
})

test('nome do arquivo com o mês na frente', () => {
  assert.equal(nomeNoArmazenamento('DAS.pdf', '2026-10'), '2026-10 DAS.pdf')
  assert.equal(nomeNoArmazenamento('2026-10 DAS.pdf', '2026-10'), '2026-10 DAS.pdf')
  assert.equal(nomeNoArmazenamento('DAS.pdf', null), 'DAS.pdf')
  assert.equal(nomeParaMostrar('2026-10 DAS.pdf', '2026-10'), 'DAS.pdf')
})

test('agrupa do mês mais recente para o mais antigo', () => {
  const grupos = agruparPorCompetencia([
    { nome: '2026-09 Folha.pdf', competencia: '2026-09' },
    { nome: '2026-10 DAS.pdf', competencia: '2026-10' },
    { nome: '2026-10 Balancete.pdf', competencia: '2026-10' },
    { nome: 'Contrato.pdf', competencia: null },
  ])
  assert.deepEqual(grupos.map((g) => g.competencia), ['2026-10', '2026-09'])
  assert.deepEqual(grupos[0].itens.map((d) => d.nomeExibido), ['Balancete.pdf', 'DAS.pdf'])
  assert.equal(grupos[0].nome, 'Outubro de 2026')
})
