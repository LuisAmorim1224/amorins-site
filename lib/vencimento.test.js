import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hojeNaBahia, proximoVencimento } from './vencimento.js'

test('vence ainda este mês quando o dia não passou', () => {
  assert.equal(proximoVencimento(5, { ano: 2026, mes: 10, dia: 2 }), '2026-10-05')
})

test('vence no mês seguinte quando o dia já passou ou é hoje', () => {
  assert.equal(proximoVencimento(5, { ano: 2026, mes: 10, dia: 27 }), '2026-11-05')
  assert.equal(proximoVencimento(5, { ano: 2026, mes: 10, dia: 5 }), '2026-11-05')
})

test('vira o ano em dezembro', () => {
  assert.equal(proximoVencimento(5, { ano: 2026, mes: 12, dia: 20 }), '2027-01-05')
})

test('usa o fuso da Bahia', () => {
  // 01:00 UTC do dia 1 ainda é dia 31 à noite em Salvador (UTC-3).
  assert.deepEqual(hojeNaBahia(new Date('2026-11-01T01:00:00Z')), { ano: 2026, mes: 10, dia: 31 })
})
