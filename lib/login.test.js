import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cnpjDoEmailDeLogin, ehEmailDeLogin, emailDeLogin, erroNaNovaSenha, senhaInicial } from './login.js'

// CNPJ fictício.
const CNPJ = '11222333000181'

test('CNPJ com ou sem pontuação vira o e-mail interno', () => {
  assert.equal(emailDeLogin('11.222.333/0001-81'), `${CNPJ}@clientes.amorinscontabilidade.com.br`)
  assert.equal(emailDeLogin(` ${CNPJ} `), `${CNPJ}@clientes.amorinscontabilidade.com.br`)
})

test('e-mail comum continua igual, em minúsculas', () => {
  assert.equal(emailDeLogin(' Admin@Exemplo.com '), 'admin@exemplo.com')
})

test('documento que não é CNPJ não vira e-mail interno', () => {
  assert.equal(emailDeLogin('12345678909'), '12345678909')
})

test('reconhece o e-mail interno e extrai o CNPJ', () => {
  const email = emailDeLogin(CNPJ)
  assert.equal(ehEmailDeLogin(email), true)
  assert.equal(cnpjDoEmailDeLogin(email), CNPJ)
  assert.equal(ehEmailDeLogin('cliente@gmail.com'), false)
  assert.equal(cnpjDoEmailDeLogin('cliente@gmail.com'), null)
})

test('senha inicial são os 6 primeiros dígitos do CNPJ', () => {
  assert.equal(senhaInicial('11.222.333/0001-81'), '112223')
  assert.throws(() => senhaInicial('123'), /14 números/)
})

test('regras da senha nova', () => {
  assert.match(erroNaNovaSenha('1234567', '1234567', CNPJ), /8 caracteres/)
  assert.match(erroNaNovaSenha('senhaboa1', 'senhaboa2', CNPJ), /iguais/)
  assert.match(erroNaNovaSenha('11222333', '11222333', CNPJ), /CNPJ/)
  assert.match(erroNaNovaSenha(CNPJ, CNPJ, CNPJ), /CNPJ/)
  assert.match(erroNaNovaSenha(`x${CNPJ}`, `x${CNPJ}`, CNPJ), /CNPJ/)
  assert.equal(erroNaNovaSenha('Gelato#2026', 'Gelato#2026', CNPJ), null)
  assert.equal(erroNaNovaSenha('Gelato#2026', 'Gelato#2026', null), null)
})
