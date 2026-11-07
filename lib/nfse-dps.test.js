import { test } from 'node:test'
import assert from 'node:assert/strict'
import forge from 'node-forge'
import { buildDpsXml, NfseClient, Ambiente, validateDpsXml } from 'open-nfse'
import { issRetido, montarDps } from './nfse-dps.js'

// Dados de teste (CNPJs com dígito verificador válido, não são clientes reais).
const cliente = {
  cpf_cnpj: '11222333000181',
  nfse_municipio: '2927408',
  nfse_op_simples: '3',
  nfse_reg_esp_trib: '0',
  nfse_aliquota_sn: 6,
  nfse_serie: '1',
  nfse_ambiente: 'homologacao',
}
const concreto = { cod_trib_nac: '070202', cod_nbs: '101054000', exige_obra: true, retem_iss_tomador_pj: true }
const marketing = { cod_trib_nac: '170601', exige_obra: false, retem_iss_tomador_pj: false }
const pedido = {
  tomador_documento: '19131243000197',
  tomador_nome: 'Construtora Teste Ltda',
  descricao: 'Bombeamento de concreto - obra Pituba',
  valor: 1500,
  obra_cep: '41810-000',
  obra_logradouro: 'Rua Teste',
  obra_numero: '100',
  obra_bairro: 'Pituba',
}

test('retém ISS do serviço de obra quando o tomador é empresa', () => {
  assert.equal(issRetido({ pedido, servico: concreto }), true)
  assert.equal(issRetido({ pedido: { ...pedido, tomador_documento: '52998224725' }, servico: concreto }), false)
  assert.equal(issRetido({ pedido, servico: marketing }), false)
})

test('DPS de concretagem sai com obra, local da obra e ISS retido, válida no XSD', async () => {
  const dps = montarDps({ cliente, servico: concreto, pedido, nDPS: 7, obraMunicipio: '2927408' })
  const xml = buildDpsXml(dps)
  assert.match(xml, /<cTribNac>070202<\/cTribNac>/)
  assert.match(xml, /<obra><end><CEP>41810000<\/CEP>/)
  assert.match(xml, /<tpRetISSQN>2<\/tpRetISSQN>/)
  assert.match(xml, /<tpAmb>2<\/tpAmb>/)
  const r = await validateDpsXml(xml, { throwOnInvalid: false })
  assert.deepEqual(r.violations, [])
})

test('DPS de marketing sai sem obra e sem retenção, válida no XSD', async () => {
  const dps = montarDps({ cliente, servico: marketing, pedido: { ...pedido, descricao: 'Promoção de vendas' }, nDPS: 8 })
  const xml = buildDpsXml(dps)
  assert.doesNotMatch(xml, /<obra>/)
  assert.match(xml, /<tpRetISSQN>1<\/tpRetISSQN>/)
  const r = await validateDpsXml(xml, { throwOnInvalid: false })
  assert.deepEqual(r.violations, [])
})

test('avisa o que falta antes de emitir', () => {
  assert.throws(
    () => montarDps({ cliente: { ...cliente, nfse_aliquota_sn: null }, servico: concreto, pedido: { ...pedido, obra_cep: '' }, nDPS: 1 }),
    /alíquota aproximada do Simples.*CEP da obra/,
  )
})

test('assina a DPS com certificado A1 (sem enviar)', async () => {
  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date(Date.now() - 86400000)
  cert.validity.notAfter = new Date(Date.now() + 365 * 86400000)
  const nome = [{ name: 'commonName', value: 'EMPRESA TESTE:11222333000181' }]
  cert.setSubject(nome)
  cert.setIssuer(nome)
  cert.sign(keys.privateKey, forge.md.sha256.create())
  const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], 'senha', { algorithm: '3des' })
  const pfx = Buffer.from(forge.asn1.toDer(p12).getBytes(), 'binary')

  const nfse = new NfseClient({ ambiente: Ambiente.ProducaoRestrita, certificado: { pfx, password: 'senha' } })
  const dps = montarDps({ cliente, servico: concreto, pedido, nDPS: 9, obraMunicipio: '2927408' })
  const r = await nfse.emitirDpsPronta(dps, { dryRun: true, skipCepValidation: true })
  assert.match(r.xmlDpsAssinado, /<Signature[\s\S]*<SignatureValue>/)
  await nfse.close()
})
