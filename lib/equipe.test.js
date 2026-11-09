import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clientesDoSocio, ehSocio, filtrarClientes, podeVerCliente } from './equipe.js'

const socio = { app_metadata: { papel: 'socio', clientes: ['a', 'b'] } }
const cliente = { app_metadata: {} }

test('sócio só vê os clientes liberados', () => {
  assert.equal(ehSocio(socio), true)
  assert.equal(ehSocio(cliente), false)
  assert.deepEqual(clientesDoSocio(socio), ['a', 'b'])
  assert.equal(podeVerCliente(socio, 'a'), true)
  assert.equal(podeVerCliente(socio, 'c'), false)
  assert.equal(podeVerCliente(cliente, 'a'), false)
  assert.equal(podeVerCliente(null, 'a', true), true)
})

test('filtra lista de clientes e de pedidos', () => {
  const clientes = [{ id: 'a' }, { id: 'c' }]
  const pedidos = [{ id: 'p1', cliente_id: 'b' }, { id: 'p2', cliente_id: 'c' }]
  assert.deepEqual(filtrarClientes(socio, clientes).map((c) => c.id), ['a'])
  assert.deepEqual(filtrarClientes(socio, pedidos).map((p) => p.id), ['p1'])
  assert.equal(filtrarClientes(null, clientes, true).length, 2)
})
