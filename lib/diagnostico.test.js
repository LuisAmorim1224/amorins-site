import { test } from 'node:test'
import assert from 'node:assert/strict'
import { diagnosticar, piorNivel } from './diagnostico.js'

// Dados fictícios no formato da BrasilAPI.
const base = {
  cnpj: '11222333000181',
  razao_social: 'EMPRESA FICTICIA LTDA',
  descricao_situacao_cadastral: 'ATIVA',
  data_situacao_cadastral: '2020-05-04',
  descricao_motivo_situacao_cadastral: 'SEM MOTIVO',
  opcao_pelo_simples: true,
  data_opcao_pelo_simples: '2020-05-04',
  opcao_pelo_mei: false,
  cnae_fiscal: 4520001,
  cnae_fiscal_descricao: 'Serviços de manutenção',
}

test('empresa ativa no Simples não tem alerta grave', () => {
  const r = diagnosticar(base)
  assert.equal(r.nivel, 'info')
  assert.equal(r.alertas[0].titulo, 'CNPJ ativo na Receita Federal')
  assert.ok(r.alertas.some((a) => /Simples Nacional/.test(a.titulo)))
  assert.equal(r.empresa.razao_social, 'EMPRESA FICTICIA LTDA')
})

test('CNPJ inapto por omissão de declarações é grave e explica a saída', () => {
  const r = diagnosticar({
    ...base,
    descricao_situacao_cadastral: 'INAPTA',
    descricao_motivo_situacao_cadastral: 'OMISSAO DE DECLARACOES',
  })
  assert.equal(r.nivel, 'grave')
  assert.match(r.alertas[0].titulo, /inapto/)
  assert.match(r.alertas[0].texto, /omissao de declaracoes/)
  assert.match(r.alertas[0].texto, /declarações em atraso/)
})

test('MEI desenquadrado e excluído do Simples geram atenção', () => {
  const r = diagnosticar({
    ...base,
    opcao_pelo_simples: false,
    data_exclusao_do_simples: '2024-01-01',
    opcao_pelo_mei: false,
    data_exclusao_do_mei: '2024-01-01',
  })
  assert.equal(r.nivel, 'atencao')
  assert.ok(r.alertas.some((a) => /Desenquadrada do MEI/.test(a.titulo)))
  assert.ok(r.alertas.some((a) => /Excluída do Simples/.test(a.titulo)))
})

test('MEI ativo recebe lembrete da DASN-SIMEI e não mostra regras do Simples', () => {
  const r = diagnosticar({ ...base, opcao_pelo_mei: true, data_opcao_pelo_mei: '2021-02-01' })
  assert.ok(r.alertas.some((a) => /DASN-SIMEI/.test(a.texto)))
  assert.ok(!r.alertas.some((a) => /PGDAS-D/.test(a.texto)))
})

test('baixada é grave; situação desconhecida é atenção', () => {
  assert.equal(diagnosticar({ ...base, descricao_situacao_cadastral: 'BAIXADA' }).nivel, 'grave')
  assert.equal(diagnosticar({ ...base, descricao_situacao_cadastral: '' }).nivel, 'atencao')
})

test('piorNivel escolhe o mais grave', () => {
  assert.equal(piorNivel([{ nivel: 'info' }, { nivel: 'atencao' }]), 'atencao')
  assert.equal(piorNivel([]), 'ok')
})

import { validarPedido } from './diagnostico.js'

test('validarPedido', () => {
  assert.deepEqual(validarPedido({ site: 'x' }), { robo: true })
  assert.match(validarPedido({ nome: 'A' }).erro, /nome/)
  assert.match(validarPedido({ nome: 'Ana', whatsapp: '123' }).erro, /WhatsApp/)
  assert.match(validarPedido({ nome: 'Ana', whatsapp: '71999990000' }).erro, /autorização/)
  assert.deepEqual(
    validarPedido({ nome: ' Ana  Souza ', whatsapp: '+55 (71) 99999-0000', email: 'Ana@X.com', consentimento: 'on' }),
    { registro: { nome: 'Ana Souza', whatsapp: '71999990000', email: 'ana@x.com' } }
  )
})
