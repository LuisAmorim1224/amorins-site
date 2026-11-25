import { test } from 'node:test'
import assert from 'node:assert/strict'
import { montarEventoCapi } from './metaCapi.js'

const base = {
  evento: 'Lead',
  eventId: 'abc12345-xyz',
  url: 'https://www.amorinscontabilidade.com.br/trocar-de-contador',
  ip: '200.1.2.3',
  userAgent: 'Mozilla/5.0',
  cookies: 'outro=1; _fbp=fb.1.123.456; _fbc=fb.1.123.AbC',
  agora: 1_800_000_000_000,
}

test('monta o evento com os dados do navegador', () => {
  const corpo = montarEventoCapi(base)
  const e = corpo.data[0]
  assert.equal(e.event_name, 'Lead')
  assert.equal(e.event_id, 'abc12345-xyz')
  assert.equal(e.event_time, 1_800_000_000)
  assert.equal(e.action_source, 'website')
  assert.deepEqual(e.user_data, {
    client_ip_address: '200.1.2.3',
    client_user_agent: 'Mozilla/5.0',
    fbp: 'fb.1.123.456',
    fbc: 'fb.1.123.AbC',
  })
})

test('recusa evento fora da lista, id estranho ou outro site', () => {
  assert.equal(montarEventoCapi({ ...base, evento: 'Purchase' }), null)
  assert.equal(montarEventoCapi({ ...base, eventId: 'x' }), null)
  assert.equal(montarEventoCapi({ ...base, url: 'https://exemplo.com/' }), null)
})

test('funciona sem cookies da Meta', () => {
  const e = montarEventoCapi({ ...base, cookies: '' }).data[0]
  assert.equal(e.user_data.fbp, undefined)
})
