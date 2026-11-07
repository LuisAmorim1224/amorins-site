import {
  buildDps,
  OpcaoSimplesNacional,
  RegimeApuracaoSimplesNacional,
  TipoAmbienteDps,
  TipoRetISSQN,
} from 'open-nfse'

const numeros = (v) => String(v || '').replace(/\D/g, '')

// Data de hoje na Bahia como Date (meio-dia UTC, para não virar o dia em nenhum fuso).
export function competenciaHoje(agora = new Date()) {
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia' }).format(agora)
  return new Date(`${iso}T12:00:00Z`)
}

export function issRetido({ pedido, servico }) {
  const tomadorPj = numeros(pedido.tomador_documento).length === 14
  return Boolean(pedido.iss_retido || (servico.retem_iss_tomador_pj && tomadorPj))
}

/**
 * Monta a DPS (Declaração de Prestação de Serviço) a partir do cadastro fiscal do cliente,
 * do serviço escolhido e do pedido. Sem rede: só monta os dados.
 * @param obraMunicipio código IBGE do município da obra (obrigatório quando o serviço exige obra)
 */
export function montarDps({ cliente, servico, pedido, nDPS, obraMunicipio, agora = new Date() }) {
  const faltando = []
  if (numeros(cliente.cpf_cnpj).length !== 14) faltando.push('CNPJ do cliente')
  if (cliente.nfse_op_simples === '3' && !(Number(cliente.nfse_aliquota_sn) > 0))
    faltando.push('alíquota aproximada do Simples (%)')
  if (servico.exige_obra) {
    if (numeros(pedido.obra_cep).length !== 8) faltando.push('CEP da obra')
    if (!pedido.obra_logradouro) faltando.push('endereço da obra')
    if (!pedido.obra_bairro) faltando.push('bairro da obra')
    if (!/^\d{7}$/.test(String(obraMunicipio || ''))) faltando.push('município da obra')
  }
  if (faltando.length) throw new Error(`Falta preencher: ${faltando.join(', ')}.`)

  const opSimpNac = cliente.nfse_op_simples || OpcaoSimplesNacional.MeEpp
  const tomadorDoc = numeros(pedido.tomador_documento)
  const retido = issRetido({ pedido, servico })
  const localPrestacao = servico.exige_obra ? obraMunicipio : cliente.nfse_municipio

  const dps = buildDps({
    emitente: {
      cnpj: numeros(cliente.cpf_cnpj),
      codMunicipio: cliente.nfse_municipio,
      inscricaoMunicipal: cliente.nfse_inscricao_municipal || undefined,
      regime: {
        opSimpNac,
        regEspTrib: cliente.nfse_reg_esp_trib || '0',
        regApTribSN: opSimpNac === OpcaoSimplesNacional.MeEpp ? RegimeApuracaoSimplesNacional.FederalEMunicipalPeloSN : undefined,
      },
    },
    serie: String(cliente.nfse_serie || '1'),
    nDPS: String(nDPS),
    tpAmb: cliente.nfse_ambiente === 'producao' ? TipoAmbienteDps.Producao : TipoAmbienteDps.Homologacao,
    dhEmi: new Date(agora.getTime() - 60_000), // um minuto antes: evita "data de emissão no futuro"
    dCompet: competenciaHoje(agora),
    verAplic: 'amorins-portal-1.0',
    servico: {
      cTribNac: servico.cod_trib_nac,
      cNBS: servico.cod_nbs || undefined,
      cTribMun: servico.cod_trib_mun || undefined,
      descricao: pedido.descricao,
      codMunicipioPrestacao: localPrestacao,
    },
    valores: {
      vServ: Number(pedido.valor),
      tpRetISSQN: retido ? TipoRetISSQN.RetidoPeloTomador : TipoRetISSQN.NaoRetido,
      aliqIss: servico.aliquota_iss != null && servico.aliquota_iss !== '' ? Number(servico.aliquota_iss) : undefined,
      pTotTribSN: opSimpNac === OpcaoSimplesNacional.MeEpp ? Number(cliente.nfse_aliquota_sn) : undefined,
    },
    tomador: {
      documento: tomadorDoc.length === 14 ? { CNPJ: tomadorDoc } : { CPF: tomadorDoc },
      nome: pedido.tomador_nome,
      email: pedido.tomador_email || undefined,
    },
  })

  const serv = { ...dps.infDPS.serv }
  if (servico.exige_obra) {
    serv.obra = {
      identificacao: {
        end: {
          CEP: numeros(pedido.obra_cep),
          xLgr: pedido.obra_logradouro,
          nro: pedido.obra_numero || 'S/N',
          xBairro: pedido.obra_bairro,
        },
      },
    }
  }
  if (pedido.observacoes) serv.infoCompl = { xInfComp: String(pedido.observacoes).slice(0, 2000) }
  return { ...dps, infDPS: { ...dps.infDPS, serv } }
}
