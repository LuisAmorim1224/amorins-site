import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cnpjValido, dadosDaReceita, formatarCnae, formatarCnpj, formatarNatureza, sociosDaReceita } from './cnpj.js'

// Todos os dados abaixo são fictícios.

test('formata CNAE, natureza jurídica e CNPJ', () => {
  assert.equal(formatarCnae(6920601), '69.20-6-01')
  assert.equal(formatarCnae('8599699'), '85.99-6-99')
  assert.equal(formatarCnae(0), null)
  assert.equal(formatarNatureza(2135), '213-5')
  assert.equal(formatarCnpj('11222333000181'), '11.222.333/0001-81')
})

test('valida os dígitos do CNPJ', () => {
  assert.equal(cnpjValido('11.222.333/0001-81'), true)
  assert.equal(cnpjValido('11222333000182'), false)
  assert.equal(cnpjValido('11111111111111'), false)
  assert.equal(cnpjValido('123'), false)
})

const exemplo = {
  cnpj: '11222333000181',
  razao_social: 'MARIA DA SILVA 12345678909',
  nome_fantasia: 'SILVA CONTABIL',
  codigo_natureza_juridica: 2135,
  natureza_juridica: 'Empresário (Individual)',
  descricao_porte: 'MICRO EMPRESA',
  opcao_pelo_simples: true,
  opcao_pelo_mei: false,
  data_inicio_atividade: '2020-01-15',
  descricao_situacao_cadastral: 'ATIVA',
  data_situacao_cadastral: '2020-01-15',
  cnae_fiscal: 6920601,
  cnae_fiscal_descricao: 'Atividades de contabilidade',
  cnaes_secundarios: [{ codigo: 8599699, descricao: 'Outras atividades de ensino' }, { codigo: 0, descricao: '' }],
  descricao_tipo_de_logradouro: 'RUA',
  logradouro: 'DAS FLORES',
  numero: '100',
  complemento: '',
  bairro: 'CENTRO',
  municipio: 'SALVADOR',
  uf: 'BA',
  cep: '40000000',
  email: 'CONTATO@EXEMPLO.COM',
  ddd_telefone_1: '7130000000',
  capital_social: 10000,
  qsa: [{ nome_socio: 'FULANO DE TAL', cnpj_cpf_do_socio: '***456789**', qualificacao_socio: 'Sócio-Administrador' }],
}

test('converte a resposta da Receita nas colunas do cadastro', () => {
  const d = dadosDaReceita(exemplo)
  assert.equal(d.razao_social, 'MARIA DA SILVA 12345678909')
  assert.equal(d.natureza_juridica, '213-5 - Empresário (Individual)')
  assert.equal(d.regime_tributario, 'Simples Nacional')
  assert.deepEqual(d.cnae_principal, { codigo: '69.20-6-01', descricao: 'Atividades de contabilidade' })
  assert.deepEqual(d.cnaes_secundarios, [{ codigo: '85.99-6-99', descricao: 'Outras atividades de ensino' }])
  assert.equal(d.endereco.logradouro, 'RUA DAS FLORES')
  assert.equal(d.endereco.complemento, null)
  assert.equal(d.endereco.cep, '40000-000')
  assert.equal(d.telefone_receita, '(71) 3000-0000')
  assert.equal(d.email_receita, 'contato@exemplo.com')
})

test('MEI tem prioridade sobre Simples e sem opção o regime fica em branco', () => {
  assert.equal(dadosDaReceita({ ...exemplo, opcao_pelo_mei: true }).regime_tributario, 'MEI')
  assert.equal(dadosDaReceita({ ...exemplo, opcao_pelo_simples: false }).regime_tributario, null)
})

test('lê os sócios publicados', () => {
  assert.deepEqual(sociosDaReceita(exemplo), [
    { nome: 'FULANO DE TAL', cpf: '***456789**', qualificacao: 'Sócio-Administrador', administrador: true },
  ])
  assert.deepEqual(sociosDaReceita({}), [])
})
