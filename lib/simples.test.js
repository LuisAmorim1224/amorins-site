import { test } from 'node:test'
import assert from 'node:assert/strict'
import { previaMei, previaSimples, somarMeses, somarPorMes } from './simples.js'

const nota = (data_emissao, valor) => ({ data_emissao, valor })

test('soma e desloca meses', () => {
  assert.equal(somarMeses('2026-01', -1), '2025-12')
  assert.equal(somarMeses('2026-11', 2), '2027-01')
  assert.deepEqual(somarPorMes([nota('2026-10-01', 100), nota('2026-10-20', 50.5), nota('2026-11-02', 10)]), {
    '2026-10': 150.5,
    '2026-11': 10,
  })
})

test('Simples com 12 meses: RBT12 é a soma dos 12 meses anteriores', () => {
  // 20 mil por mês de nov/2025 a out/2026 = RBT12 de 240 mil; anexo III, 2ª faixa.
  const notas = []
  for (let i = 1; i <= 12; i++) notas.push(nota(`${somarMeses('2026-11', -i)}-10`, 20000))
  notas.push(nota('2026-11-05', 25000))
  const p = previaSimples({ notas, anexo: 'III', competencia: '2026-11', dataAbertura: '2020-01-01' })
  assert.equal(p.rbt12, 240000)
  assert.equal(p.faixa, 2)
  // (240000 × 11,2% − 9360) / 240000 = 7,3%
  assert.equal(p.aliquotaEfetiva, 0.073)
  assert.equal(p.das, 1825)
  assert.equal(p.inicioAtividade, false)
})

test('primeira faixa usa a alíquota nominal', () => {
  const p = previaSimples({ notas: [nota('2026-11-01', 10000)], anexo: 'III', competencia: '2026-11', dataAbertura: '2020-01-01' })
  assert.equal(p.rbt12, 0)
  assert.equal(p.aliquotaEfetiva, 0.06)
  assert.equal(p.das, 600)
})

test('início de atividade: primeiro mês usa a receita × 12', () => {
  const p = previaSimples({ notas: [nota('2026-11-03', 10000)], anexo: 'I', competencia: '2026-11', dataAbertura: '2026-11-01' })
  assert.equal(p.rbt12, 120000)
  assert.equal(p.inicioAtividade, true)
  assert.equal(p.das, 400)
})

test('início de atividade: média dos meses anteriores × 12', () => {
  const notas = [nota('2026-09-10', 30000), nota('2026-10-10', 10000), nota('2026-11-10', 5000)]
  const p = previaSimples({ notas, anexo: 'III', competencia: '2026-11', dataAbertura: '2026-09-01' })
  // média de 20 mil × 12 = 240 mil
  assert.equal(p.rbt12, 240000)
})

test('sem anexo definido ou acima do limite', () => {
  assert.match(previaSimples({ notas: [], competencia: '2026-11' }).erro, /Anexo/)
  const notas = []
  for (let i = 1; i <= 12; i++) notas.push(nota(`${somarMeses('2026-11', -i)}-10`, 500000))
  assert.equal(previaSimples({ notas, anexo: 'III', competencia: '2026-11', dataAbertura: '2020-01-01' }).foraDoLimite, true)
})

test('MEI dentro do limite, em atenção e com excesso', () => {
  const ano = 2026
  assert.equal(previaMei({ notas: [nota('2026-03-01', 50000)], ano, dataAbertura: '2020-01-01' }).situacao, 'dentro')
  assert.equal(previaMei({ notas: [nota('2026-03-01', 70000)], ano, dataAbertura: '2020-01-01' }).situacao, 'atencao')
  const ate20 = previaMei({ notas: [nota('2026-03-01', 90000)], ano, dataAbertura: '2020-01-01' })
  assert.equal(ate20.situacao, 'excesso_ate_20')
  assert.equal(ate20.excesso, 9000)
  assert.match(ate20.mensagem, /1º de janeiro de 2027/)
  const acima = previaMei({ notas: [nota('2026-03-01', 100000)], ano, dataAbertura: '2020-01-01' })
  assert.equal(acima.situacao, 'excesso_acima_20')
  assert.match(acima.mensagem, /retroativo a 1º de janeiro de 2026/)
})

test('MEI aberto no meio do ano tem limite proporcional', () => {
  // Aberto em julho: 6 meses × R$ 6.750 = R$ 40.500
  const p = previaMei({ notas: [nota('2026-08-01', 45000)], ano: 2026, dataAbertura: '2026-07-15' })
  assert.equal(p.limite, 40500)
  assert.equal(p.situacao, 'excesso_ate_20')
  const p2 = previaMei({ notas: [nota('2026-08-01', 60000)], ano: 2026, dataAbertura: '2026-07-15' })
  assert.match(p2.mensagem, /abertura \(07\/2026\)/)
})

test('notas de outro ano não contam para o MEI', () => {
  const p = previaMei({ notas: [nota('2025-12-31', 80000), nota('2026-01-01', 1000)], ano: 2026 })
  assert.equal(p.receita, 1000)
})

test('anexoDoServico: obra vai para o Anexo IV, o resto fica no III', async () => {
  const { anexoDoServico } = await import('./simples.js')
  assert.equal(anexoDoServico('070202', 'III'), 'IV')
  assert.equal(anexoDoServico('07.03.01', 'IV'), 'IV')
  assert.equal(anexoDoServico('160201', 'IV'), 'III')
  assert.equal(anexoDoServico('170601', 'III'), 'III')
  assert.equal(anexoDoServico('', 'IV'), 'IV')
  assert.equal(anexoDoServico('170601', 'V'), 'V')
})

test('previaSimples: RBT12 soma todos os anexos, DAS só sobre a receita do anexo', () => {
  const todas = [nota('2026-10-10', 100000), nota('2026-11-05', 5000), nota('2026-11-06', 3000)]
  const p = previaSimples({ notas: [todas[1]], notasRbt12: todas, anexo: 'III', competencia: '2026-11', dataAbertura: '2020-01-01' })
  assert.equal(p.receitaMes, 5000)
  assert.equal(p.rbt12, 100000)
})
