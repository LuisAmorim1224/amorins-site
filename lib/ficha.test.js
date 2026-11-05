import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fichaParaBanco, isoDe, pendenciasAutomaticas, tipoDocumento } from './ficha.js'

// Todos os dados abaixo são fictícios.
const ficha = {
  empresa: {
    cnpj: '11.222.333/0001-81',
    nome_empresarial_receita: 'MARIA DA SILVA 12345678909',
    nome_empresarial_contrato: 'SILVA CONTÁBIL LTDA',
    nome_fantasia: 'SILVA CONTABIL',
    data_abertura: '2020-01-15',
    porte: 'ME',
    natureza_juridica_receita: '213-5 - Empresário (Individual)',
    situacao_cadastral: 'ATIVA',
    cnae_principal: { codigo: '69.20-6-01', descricao: 'Atividades de contabilidade' },
    cnaes_secundarios: [{ codigo: '85.99-6-99', descricao: 'Outras atividades de ensino' }],
    capital_social: 10000,
    junta_comercial: { nire: '29200000000' },
    endereco: { logradouro: 'RUA DAS FLORES', numero: '100' },
    contato: { email: 'contato@exemplo.com', telefone: '(71) 3000-0000' },
  },
  socios: [
    {
      nome: 'MARIA DA SILVA',
      cpf: '123.456.789-09',
      rg: { numero: '0000000', orgao_emissor: 'SSP/BA' },
      data_nascimento: '1990-01-01',
      profissao: 'Contadora',
      participacao_percentual: 100,
      administrador: true,
      crc: { numero: 'BA-000000/O-0' },
    },
  ],
  documentos: [
    { tipo: 'cartao_cnpj', arquivo: 'Cartão CNPJ.pdf' },
    { tipo: 'cnh', arquivo: 'CNH.pdf', validade: '2030-01-01' },
  ],
  pendencias: ['Natureza jurídica divergente.'],
}

test('converte a ficha JSON para o banco', () => {
  const { cliente, socios, documentos } = fichaParaBanco(ficha)
  assert.equal(cliente.cpf_cnpj, '11222333000181')
  assert.equal(cliente.razao_social, 'SILVA CONTÁBIL LTDA')
  assert.equal(cliente.natureza_juridica, '213-5 - Empresário (Individual)')
  assert.equal(cliente.nire, '29200000000')
  assert.equal(cliente.telefone_receita, '(71) 3000-0000')
  assert.deepEqual(cliente.pendencias, ['Natureza jurídica divergente.'])
  assert.equal(socios.length, 1)
  assert.equal(socios[0].rg, '0000000 SSP/BA')
  assert.equal(socios[0].registro_profissional, 'CRC BA-000000/O-0')
  assert.equal(socios[0].qualificacao, 'Sócio-Administrador')
  assert.deepEqual(documentos[1], { arquivo: 'CNH.pdf', tipo: 'documento_pessoal', validade: '2030-01-01' })
})

test('recusa arquivo sem o bloco empresa', () => {
  assert.throws(() => fichaParaBanco({}), /empresa/)
  assert.throws(() => fichaParaBanco(null), /empresa/)
})

test('tipos desconhecidos viram "outro"', () => {
  assert.equal(tipoDocumento('carteira_crc_frente'), 'registro_profissional')
  assert.equal(tipoDocumento('qualquer'), 'outro')
  assert.equal(tipoDocumento('nota_fiscal'), 'nota_fiscal')
})

test('aponta documentos que faltam, sem exigir contrato de empresário individual', () => {
  const cliente = { cpf_cnpj: '11222333000181', situacao_cadastral: 'ATIVA', natureza_juridica: '213-5 - Empresário (Individual)' }
  const lista = pendenciasAutomaticas({
    cliente,
    socios: [{ nome: 'X' }],
    documentos: [{ nome: 'a.pdf', tipo: 'cartao_cnpj' }, { nome: 'b.pdf', tipo: 'documento_pessoal' }],
  })
  assert.deepEqual(lista, [
    'Falta documento: Comprovante de residência.',
    'Falta documento: Certificado digital.',
  ])
})

test('exige contrato social de sociedade limitada e avisa situação e sócios', () => {
  const lista = pendenciasAutomaticas({
    cliente: { cpf_cnpj: '11222333000181', situacao_cadastral: 'INAPTA', natureza_juridica: '206-2 - Sociedade Empresária Limitada' },
  })
  assert.ok(lista.includes('Situação cadastral na Receita: INAPTA.'))
  assert.ok(lista.includes('Nenhum sócio/responsável cadastrado.'))
  assert.ok(lista.includes('Falta documento: Contrato social / alteração.'))
})

test('avisa documento vencido e que vence em até 30 dias', () => {
  const hoje = isoDe({ ano: 2026, mes: 11, dia: 5 })
  const lista = pendenciasAutomaticas({
    cliente: { cpf_cnpj: '12345678909' },
    documentos: [
      { nome: 'velho.pdf', tipo: 'documento_pessoal', validade: '2026-11-04' },
      { nome: 'quase.pdf', tipo: 'comprovante_residencia', validade: '2026-12-05' },
      { nome: 'longe.pdf', tipo: 'outro', validade: '2026-12-06' },
    ],
    hoje,
  })
  assert.deepEqual(lista, ['Documento vencido: velho.pdf.', 'Documento vence em breve: quase.pdf.'])
})
