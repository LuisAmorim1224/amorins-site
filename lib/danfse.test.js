import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fmt, gerarDanfseOficial } from './danfse.js'

test('formatos do DANFSe iguais aos do modelo oficial', () => {
  assert.equal(fmt.doc({ CNPJ: '38291872000129' }), '38.291.872/0001-29')
  assert.equal(fmt.cep('41820774'), '41.820-774')
  assert.equal(fmt.ibge('2927408'), '29.27408')
  assert.equal(fmt.fone('71996102209'), '(71) 99610-2209')
  assert.equal(fmt.trib('160201'), '16.02.01')
  assert.equal(fmt.nbs('105011120'), '1.0501.11.20')
  assert.equal(fmt.reais(1850), 'R$ 1.850,00')
  assert.equal(fmt.dataHora(new Date('2026-11-06T20:42:19Z')), '06/11/2026 17:42:19')
})

test('gera o PDF do DANFSe a partir da nota', async () => {
  const nfse = {
    infNFSe: {
      chaveAcesso: '29274082238291872000129000000000005026110010742063', nNFSe: '50', xLocEmi: 'Salvador', xLocPrestacao: 'Camaçari',
      xTribNac: 'Outros serviços de transporte de natureza municipal.', ambGer: '2', cStat: '100', dhProc: new Date('2026-11-06T20:42:19Z'),
      emit: { identificador: { CNPJ: '38291872000129' }, xNome: 'EMPRESA TESTE', enderNac: { xLgr: 'RUA A', nro: '1', xBairro: 'CENTRO', cMun: '2927408', UF: 'BA', CEP: '41820774' } },
      valores: { vLiq: 1850 },
      DPS: { infDPS: { tpAmb: '2', dhEmi: new Date(), serie: '1', nDPS: '2', dCompet: new Date(), tpEmit: '1', cLocEmi: '2927408',
        prest: { regTrib: { opSimpNac: '3', regApTribSN: '1' } },
        serv: { cServ: { cTribNac: '160201', cTribMun: '001', xDescServ: 'Teste' } },
        valores: { vServPrest: { vServ: 1850 }, trib: { tribMun: { tribISSQN: '1', tpRetISSQN: '1' } } } } },
    },
  }
  const pdf = await gerarDanfseOficial(nfse)
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF')
})
