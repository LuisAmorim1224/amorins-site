import { test } from 'node:test'
import assert from 'node:assert/strict'
import { servicosDosCnaes } from './cnae-servicos.js'

test('CNAEs da M3 viram os códigos do Emissor Nacional usados nas notas', () => {
  const m3 = {
    cnae_principal: { codigo: '49.30-2-01', descricao: 'Transporte rodoviário de carga, municipal' },
    cnaes_secundarios: [
      { codigo: '73.19-0-02', descricao: 'Promoção de vendas' },
      { codigo: '77.32-2-01', descricao: 'Aluguel de máquinas sem operador' },
      { codigo: '99.99-9-99', descricao: 'Desconhecido' },
    ],
  }
  const r = servicosDosCnaes(m3, { 160201: 2, 170601: 10 })
  assert.equal(r[0].sugestoes[0].codigo, '16.02.01')
  assert.equal(r[0].sugestoes[0].notas, 2)
  assert.equal(r[0].principal, true)
  assert.equal(r[1].sugestoes[0].codigo, '17.06.01')
  assert.equal(r[2].semIss, true)
  assert.equal(r[3].conhecido, false)
})
