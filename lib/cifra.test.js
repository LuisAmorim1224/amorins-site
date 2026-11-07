import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cifrar, decifrar } from './cifra.js'

const segredo = 'segredo-de-teste-com-32-caracteres'

test('cifra e decifra a senha do certificado', () => {
  const c = cifrar('Senha@123', segredo)
  assert.notEqual(c, 'Senha@123')
  assert.equal(decifrar(c, segredo), 'Senha@123')
})

test('não decifra com outra chave', () => {
  assert.throws(() => decifrar(cifrar('x', segredo), 'outra-chave-qualquer-123456'))
})
