import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CLIENTES_ATENDIDOS, clientesPublicos } from './clientes-atendidos.js'

test('sem autorização o nome e o logo não vão para o site', () => {
  const [c] = clientesPublicos([{ nome: 'Empresa X', logo: '/x.png', segmento: 'Padaria', cidade: 'Salvador/BA', trabalho: 'Contabilidade', autorizado: false }])
  assert.equal(c.nome, null)
  assert.equal(c.logo, null)
  assert.equal(c.segmento, 'Padaria')
  assert.equal('autorizado' in c, false)
})

test('com autorização o nome e o logo aparecem', () => {
  const [c] = clientesPublicos([{ nome: 'Empresa X', logo: '/x.png', segmento: 'Padaria', cidade: 'Salvador/BA', trabalho: 'Contabilidade', autorizado: true }])
  assert.equal(c.nome, 'Empresa X')
  assert.equal(c.logo, '/x.png')
})

test('nenhum cliente da lista aparece identificado sem autorização', () => {
  for (const c of clientesPublicos()) {
    const original = CLIENTES_ATENDIDOS.find((o) => o.segmento === c.segmento && o.cidade === c.cidade && o.trabalho === c.trabalho)
    if (!original.autorizado) assert.equal(c.nome, null)
  }
})
