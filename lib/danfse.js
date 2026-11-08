import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

// DANFSe no modelo oficial v2.0 (o mesmo PDF que o portal do Emissor Nacional entrega), montado a
// partir do XML da nota. Desde 03/08/2026 a API do PDF oficial está suspensa (NT 008/2026), então o
// portal gera o documento aqui, com os mesmos blocos e campos do modelo da Receita.

const URL_CONSULTA = {
  1: 'https://adn.nfse.gov.br/contribuintes/consulta',
  2: 'https://adn.producaorestrita.nfse.gov.br/contribuintes/consulta',
}

const TEXTOS = {
  tpEmit: { 1: 'Prestador', 2: 'Tomador', 3: 'Intermediário' },
  cStat: { 100: 'NFS-e Gerada', 101: 'NFS-e de Substituição Gerada', 102: 'NFS-e de Decisão Judicial', 103: 'NFS-e Avulsa' },
  opSimpNac: {
    1: 'Não Optante',
    2: 'Optante - Microempreendedor Individual (MEI)',
    3: 'Optante - Microempresa ou Empresa de Pequeno Porte (ME/EPP)',
  },
  regApTribSN: {
    1: 'Regime de apuração dos tributos federais e municipal pelo Simples Nacional',
    2: 'Regime de apuração dos tributos federais pelo SN e o ISSQN pela NFS-e conforme respectiva legislação municipal do tributo',
    3: 'Regime de apuração dos tributos federais e municipal pela NFS-e conforme respectivas legislações federal e municipal de cada tributo',
  },
  tribISSQN: { 1: 'Operação Tributável', 2: 'Imunidade', 3: 'Exportação de Serviço', 4: 'Não Incidência' },
  tpRetISSQN: { 1: 'Não Retido', 2: 'Retido pelo Tomador', 3: 'Retido pelo Intermediário' },
}

// ---------- formatação ----------
const so = (v) => String(v ?? '').replace(/\D/g, '')
const vazio = (v) => v === undefined || v === null || v === ''
const ou = (v) => (vazio(v) ? '-' : String(v))
export const fmt = {
  doc(id = {}) {
    if (id.CNPJ) return so(id.CNPJ).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    if (id.CPF) return so(id.CPF).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
    return id.NIF || '-'
  },
  cep: (v) => (vazio(v) ? '-' : so(v).replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2-$3')),
  ibge: (v) => (vazio(v) ? '-' : so(v).replace(/^(\d{2})(\d{5})$/, '$1.$2')),
  fone(v) {
    const d = so(v)
    if (!d) return '-'
    if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
    if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
    return d
  },
  trib: (v) => (vazio(v) ? '-' : so(v).replace(/^(\d{2})(\d{2})(\d{2})$/, '$1.$2.$3')),
  nbs: (v) => (vazio(v) ? '-' : so(v).replace(/^(\d)(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3.$4')),
  reais: (v) => (vazio(v) ? '-' : `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`),
  pct: (v) => (vazio(v) ? '-' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`),
  data: (d) => (d instanceof Date ? d.toISOString().slice(0, 10).split('-').reverse().join('/') : ou(d)),
  dataHora(d) {
    if (!(d instanceof Date)) return ou(d)
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        .formatToParts(d)
        .map((x) => [x.type, x.value]),
    )
    return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`
  },
}

// Nome do município pelo código IBGE (o XML só traz o código para prestador e tomador).
const cacheMunicipios = new Map()
async function municipio(cMun) {
  const cod = so(cMun)
  if (cod.length !== 7) return null
  if (cacheMunicipios.has(cod)) return cacheMunicipios.get(cod)
  try {
    const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${cod}`, { signal: AbortSignal.timeout(4000) })
    const j = r.ok ? await r.json() : null
    const uf = j?.microrregiao?.mesorregiao?.UF?.sigla || j?.['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla
    const nome = j?.nome ? `${j.nome} / ${uf || ''}`.trim() : null
    cacheMunicipios.set(cod, nome)
    return nome
  } catch {
    return null
  }
}

const endereco = (e) => (e ? [e.xLgr, e.nro, e.xCpl, e.xBairro].filter((x) => !vazio(x)).join(', ') : '-')

// ---------- desenho ----------
const MARGEM = 20
const LARGURA = 595.28 - MARGEM * 2
const COL = LARGURA / 4
const CINZA = '#e6e6e6'

function grade(doc, y, titulo, celulas) {
  // celulas: [{ r: rótulo, v: valor, span?: colunas }] distribuídas em linhas de 4 colunas;
  // a primeira linha começa na coluna 2 quando há título de seção.
  const linhas = []
  let linha = []
  let usadas = titulo ? 1 : 0
  for (const c of celulas) {
    const span = c.span || 1
    if (usadas + span > 4) {
      linhas.push(linha)
      linha = []
      usadas = 0
    }
    linha.push({ ...c, col: usadas, span })
    usadas += span
  }
  if (linha.length) linhas.push(linha)
  const inicio = y
  linhas.forEach((cs, i) => {
    let altura = 0
    for (const c of cs) {
      doc.font('Helvetica').fontSize(7.5)
      const h = doc.heightOfString(ou(c.v), { width: COL * c.span - 6 })
      altura = Math.max(altura, 8 + h + 4)
    }
    if (i === 0 && titulo) {
      doc.rect(MARGEM, y, COL, altura).fill(CINZA)
      doc.fillColor('black').font('Helvetica-Bold').fontSize(8).text(titulo, MARGEM + 3, y + 3, { width: COL - 6 })
    }
    for (const c of cs) {
      const x = MARGEM + COL * c.col + 3
      doc.fillColor('black').font('Helvetica-Bold').fontSize(6).text(c.r || '', x, y + 2, { width: COL * c.span - 6 })
      doc.font('Helvetica').fontSize(7.5).text(ou(c.v), x, y + 9, { width: COL * c.span - 6 })
    }
    y += altura
  })
  doc.moveTo(MARGEM, y).lineTo(MARGEM + LARGURA, y).lineWidth(0.6).stroke()
  return Math.max(y, inicio)
}

function faixa(doc, y, texto) {
  doc.font('Helvetica').fontSize(7.5).text(texto, MARGEM, y + 2, { width: LARGURA, align: 'center' })
  y += 11
  doc.moveTo(MARGEM, y).lineTo(MARGEM + LARGURA, y).lineWidth(0.6).stroke()
  return y
}

export async function gerarDanfseOficial(nfse) {
  const inf = nfse.infNFSe
  const dps = inf.DPS.infDPS
  const prest = dps.prest || {}
  const toma = dps.toma
  const serv = dps.serv || {}
  const val = dps.valores || {}
  const trib = val.trib || {}
  const tribMun = trib.tribMun || {}
  const tribFed = trib.tribFed || {}
  const v = inf.valores || {}
  const tpAmb = Number(dps.tpAmb) || 1
  const urlConsulta = `${URL_CONSULTA[tpAmb] || URL_CONSULTA[1]}?chave=${inf.chaveAcesso}`
  const qr = await QRCode.toBuffer(urlConsulta, { errorCorrectionLevel: 'M', margin: 0, width: 140 })

  const cMunEmit = inf.emit?.enderNac?.cMun
  const cMunToma = toma?.end?.localidade?.endNac?.cMun
  const ufEmit = inf.emit?.enderNac?.UF
  let [munEmit, munToma, munEmissor] = await Promise.all([municipio(cMunEmit), municipio(cMunToma), municipio(dps.cLocEmi)])
  // Sem a consulta ao IBGE, usa os nomes que a própria nota traz.
  munEmissor ||= inf.xLocEmi && `${inf.xLocEmi}${ufEmit ? ` / ${ufEmit}` : ''}`
  if (!munEmit && so(cMunEmit) === so(dps.cLocEmi)) munEmit = munEmissor
  if (!munToma && so(cMunToma) === so(dps.serv?.locPrest?.cLocPrestacao) && inf.xLocPrestacao) munToma = inf.xLocPrestacao

  const totTrib = trib.totTrib || {}
  const tot = totTrib.vTotTrib || totTrib.pTotTrib || {}
  const totais = `Totais aproximados dos Tributos cfe. Lei n° 12.741/2012: Federais: ${ou(tot.vTotTribFed ?? tot.pTotTribFed)}; Estaduais: ${ou(tot.vTotTribEst ?? tot.pTotTribEst)}; Municipais: ${ou(tot.vTotTribMun ?? tot.pTotTribMun)};`
  const descontoIncond = val.vDescCondIncond?.vDescIncond
  const descontoCond = val.vDescCondIncond?.vDescCond
  const temIbsCbs = Boolean(inf.IBSCBS)

  return await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGEM, info: { Title: `DANFSe ${inf.chaveAcesso}` } })
    const partes = []
    doc.on('data', (c) => partes.push(c))
    doc.on('end', () => resolve(Buffer.concat(partes)))
    doc.on('error', reject)
    try {
      // Cabeçalho
      let y = MARGEM
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#1a7a3a').text('NFS', MARGEM + 2, y + 4, { continued: true }).fillColor('#1d4f9c').text('e')
      doc.fillColor('black').font('Helvetica').fontSize(6).text('Nota Fiscal de\nServiço eletrônica', MARGEM + 46, y + 6)
      doc.font('Helvetica-Bold').fontSize(9).text('DANFSe v2.0', MARGEM, y + 4, { width: LARGURA, align: 'center' })
      doc.font('Helvetica').fontSize(8).text('Documento Auxiliar da NFS-e', MARGEM, y + 15, { width: LARGURA, align: 'center' })
      doc.fontSize(8).text(`Município: ${(munEmissor || inf.xLocEmi || '').replace(' / ', ' - ')}`, MARGEM + COL * 3, y + 2, { width: COL })
      doc.fontSize(6).text(`Ambiente Gerador: ${ou(inf.ambGer)}\nTipo de Ambiente: ${tpAmb}`, MARGEM + COL * 3, y + 12, { width: COL })
      y += 32
      doc.rect(MARGEM, MARGEM - 4, LARGURA, 800).lineWidth(0.6).stroke()
      doc.moveTo(MARGEM, y).lineTo(MARGEM + LARGURA, y).stroke()

      if (tpAmb === 2) {
        doc.save().rotate(-35, { origin: [300, 420] }).font('Helvetica-Bold').fontSize(42).fillColor('#cccccc', 0.5)
        doc.text('SEM VALOR FISCAL', 90, 400, { width: 420, align: 'center' })
        doc.restore().fillColor('black', 1)
      }

      // Identificação da nota + QR
      const yIdent = y
      const cel = (r, val2, x, yy, w) => {
        doc.font('Helvetica-Bold').fontSize(6).text(r, x, yy, { width: w })
        doc.font('Helvetica').fontSize(7.5).text(ou(val2), x, yy + 7, { width: w })
      }
      cel('CHAVE DE ACESSO DA NFS-e', inf.chaveAcesso, MARGEM + 3, y + 2, COL * 3)
      y += 20
      cel('NÚMERO DA NFS-e', inf.nNFSe, MARGEM + 3, y, COL)
      cel('COMPETÊNCIA DA NFS-e', fmt.data(dps.dCompet), MARGEM + COL + 3, y, COL)
      cel('DATA E HORA DA EMISSÃO DA NFS-e', fmt.dataHora(inf.dhProc), MARGEM + COL * 2 + 3, y, COL)
      y += 20
      cel('NÚMERO DA DPS', dps.nDPS, MARGEM + 3, y, COL)
      cel('SÉRIE DA DPS', dps.serie, MARGEM + COL + 3, y, COL)
      cel('DATA E HORA DA EMISSÃO DA DPS', fmt.dataHora(dps.dhEmi), MARGEM + COL * 2 + 3, y, COL)
      y += 20
      doc.rect(MARGEM, y, COL, 18).fill(CINZA).fillColor('black')
      cel('EMITENTE DA NFS-e', TEXTOS.tpEmit[dps.tpEmit], MARGEM + 3, y + 1, COL)
      cel('SITUAÇÃO DA NFS-e', TEXTOS.cStat[inf.cStat] || inf.cStat, MARGEM + COL + 3, y + 1, COL)
      cel('FINALIDADE', dps.finNFSe && String(dps.finNFSe) !== '0' ? dps.finNFSe : '-', MARGEM + COL * 2 + 3, y + 1, COL)
      doc.image(qr, MARGEM + COL * 3 + 40, yIdent + 4, { width: 52 })
      doc.font('Helvetica').fontSize(5.5).text('A autenticidade desta NFS-e pode ser verificada pela leitura deste código QR ou pela consulta da chave de acesso no portal nacional da NFS-e', MARGEM + COL * 3 + 3, yIdent + 58, { width: COL - 6 })
      y += 20
      doc.moveTo(MARGEM, y).lineTo(MARGEM + LARGURA, y).stroke()

      // Prestador
      y = grade(doc, y, 'PRESTADOR / FORNECEDOR', [
        { r: 'CNPJ / CPF / NIF', v: fmt.doc(inf.emit?.identificador) },
        { r: 'Indicador Municipal (Inscrição)', v: inf.emit?.IM },
        { r: 'Telefone', v: fmt.fone(inf.emit?.fone || prest.fone) },
        { r: 'Nome / Nome Empresarial', v: inf.emit?.xNome, span: 2 },
        { r: 'Município / Sigla UF', v: munEmit || `${ou(cMunEmit)} / ${ou(inf.emit?.enderNac?.UF)}` },
        { r: 'Código IBGE / CEP', v: `${fmt.ibge(cMunEmit)} / ${fmt.cep(inf.emit?.enderNac?.CEP)}` },
        { r: 'Endereço', v: endereco(inf.emit?.enderNac), span: 2 },
        { r: 'E-mail', v: inf.emit?.email || prest.email, span: 2 },
        { r: 'Simples Nacional na Data de Competência', v: TEXTOS.opSimpNac[prest.regTrib?.opSimpNac] },
        { r: 'Regime de Apuração Tributária pelo SN', v: TEXTOS.regApTribSN[prest.regTrib?.regApTribSN], span: 3 },
      ])

      // Tomador
      if (toma) {
        y = grade(doc, y, 'TOMADOR / ADQUIRENTE', [
          { r: 'CNPJ / CPF / NIF', v: fmt.doc(toma.identificador) },
          { r: 'Indicador Municipal (Inscrição)', v: toma.IM },
          { r: 'Telefone', v: fmt.fone(toma.fone) },
          { r: 'Nome / Nome Empresarial', v: toma.xNome, span: 2 },
          { r: 'Município / Sigla UF', v: munToma || ou(cMunToma) },
          { r: 'Código IBGE / CEP', v: `${fmt.ibge(cMunToma)} / ${fmt.cep(toma.end?.localidade?.endNac?.CEP)}` },
          { r: 'Endereço', v: endereco(toma.end), span: 2 },
          { r: 'E-mail', v: toma.email, span: 2 },
        ])
      } else {
        y = faixa(doc, y, 'TOMADOR DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e')
      }
      y = faixa(doc, y, 'DESTINATÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e')
      y = dps.interm ? y : faixa(doc, y, 'INTERMEDIÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e')

      // Serviço
      y = grade(doc, y, 'SERVIÇO PRESTADO', [
        { r: 'Código de Tributação Nacional/Municipal', v: `${fmt.trib(serv.cServ?.cTribNac)}${serv.cServ?.cTribMun ? ` / ${serv.cServ.cTribMun}` : ''}` },
        { r: 'Código da NBS', v: fmt.nbs(serv.cServ?.cNBS) },
        { r: 'Local da Prestação / Sigla UF / País', v: `${ou(inf.xLocPrestacao)} / -` },
        { r: '', v: String(inf.xTribNac || '').toUpperCase(), span: 4 },
        { r: 'Descrição do Serviço', v: serv.cServ?.xDescServ, span: 4 },
      ])

      // ISSQN
      y = grade(doc, y, 'TRIBUTAÇÃO MUNICIPAL (ISSQN)', [
        { r: 'Tipo de Tributação do ISSQN', v: TEXTOS.tribISSQN[tribMun.tribISSQN] },
        { r: 'Município / Sigla UF / País de Incidência do ISSQN', v: inf.xLocIncid ? `${inf.xLocIncid} / -` : '-', span: 2 },
        { r: 'BC ISSQN', v: vazio(v.vBC) ? '-' : fmt.reais(v.vBC) },
        { r: 'Alíquota Aplicada', v: vazio(v.pAliqAplic) ? '-' : fmt.pct(v.pAliqAplic) },
        { r: 'Retenção do ISSQN', v: TEXTOS.tpRetISSQN[tribMun.tpRetISSQN] },
        { r: 'ISSQN Apurado', v: vazio(v.vISSQN) ? '-' : fmt.reais(v.vISSQN) },
      ])

      // Federais
      y = grade(doc, y, 'TRIBUTAÇÃO FEDERAL (EXCETO CBS)', [
        { r: 'IRRF', v: vazio(tribFed.vRetIRRF) ? '-' : fmt.reais(tribFed.vRetIRRF) },
        { r: 'Contribuição Previdenciária - Retida', v: vazio(tribFed.vRetCP) ? '-' : fmt.reais(tribFed.vRetCP) },
        { r: 'Contribuições Sociais - Retidas', v: vazio(tribFed.vRetCSLL) ? '-' : fmt.reais(tribFed.vRetCSLL) },
        { r: 'PIS - Débito Apuração Própria', v: vazio(tribFed.piscofins?.vPis) ? '-' : fmt.reais(tribFed.piscofins.vPis) },
        { r: 'COFINS - Débito Apuração Própria', v: vazio(tribFed.piscofins?.vCofins) ? '-' : fmt.reais(tribFed.piscofins.vCofins) },
        { r: 'Descrição Contrib. Sociais - Retidas', v: '-', span: 2 },
      ])

      // IBS/CBS (vazio enquanto as notas não trazem o grupo)
      y = grade(doc, y, 'TRIBUTAÇÃO IBS/CBS', [
        { r: 'CST / cClassTrib', v: '- / -' },
        { r: 'Indicador de Operação / Código IBGE Incidência / Município Incidência / Sigla UF', v: '- / - / - / -', span: 2 },
        { r: 'Exclusões e Reduções da Base de Cálculo', v: 'R$ 0,00' },
        { r: 'Base de Cálculo Após Exclusões e Reduções', v: '-' },
        { r: 'Red. Alíquota IBS / Red. Alíquota CBS', v: '- / - / -' },
        { r: 'Alíquota - IBS UF / IBS Mun', v: '- / -' },
        { r: 'Alíq. Efetiva Municipal - IBS', v: '-' },
        { r: 'Valor Apurado Municipal - IBS', v: '-' },
        { r: 'Alíq. Efetiva Estadual - IBS', v: '-' },
        { r: 'Valor Apurado Estadual - IBS', v: '-' },
        { r: 'Valor Total Apurado - IBS', v: '-' },
        { r: 'Alíquota - CBS', v: '-' },
        { r: 'Alíquota Efetiva - CBS', v: '-' },
        { r: 'Valor Total Apurado - CBS', v: '-' },
      ])

      // Totais
      y = grade(doc, y, 'VALOR TOTAL DA NFS-e', [
        { r: 'VALOR DA OPERAÇÃO / SERVIÇO', v: fmt.reais(val.vServPrest?.vServ) },
        { r: 'Desconto Incondicionado', v: vazio(descontoIncond) ? '-' : fmt.reais(descontoIncond) },
        { r: 'Desconto Condicionado', v: vazio(descontoCond) ? '-' : fmt.reais(descontoCond) },
        { r: 'Total das Retenções (ISSQN / Federais)', v: vazio(v.vTotalRet) || Number(v.vTotalRet) === 0 ? '-' : fmt.reais(v.vTotalRet) },
        { r: 'VALOR LÍQUIDO DA NFS-e', v: fmt.reais(v.vLiq) },
        { r: 'Total do IBS/CBS', v: 'R$ 0,00' },
        { r: 'VALOR LÍQUIDO DA NFS-e + IBS/CBS', v: temIbsCbs ? fmt.reais(v.vLiq) : 'R$ 0,00' },
      ])

      // Informações complementares
      doc.font('Helvetica-Bold').fontSize(8).text('INFORMAÇÕES COMPLEMENTARES', MARGEM + 3, y + 3)
      const info = [serv.infoCompl?.xInfComp, inf.xOutInf, totais].filter(Boolean).join('\n\n')
      doc.font('Helvetica').fontSize(7.5).text(info, MARGEM + 3, y + 20, { width: LARGURA - 6 })

      // Canhoto
      const yc = MARGEM + 800 - 34
      doc.rect(MARGEM + 3, yc, LARGURA - 6, 22).lineWidth(0.6).stroke()
      doc.font('Helvetica-Bold').fontSize(6)
      doc.text('DATA CIENTIFICAÇÃO:', MARGEM + 6, yc + 3)
      doc.text('IDENTIFICAÇÃO E ASSINATURA', MARGEM + 6 + COL, yc + 3)
      doc.text('N° NFS-e / CHAVE NFS-e', MARGEM + 6 + COL * 2, yc + 3)
      doc.font('Helvetica').fontSize(7.5).text(`${inf.nNFSe} / ${inf.chaveAcesso}`, MARGEM + 6 + COL * 2, yc + 11, { width: COL * 2 - 10 })
      doc.end()
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}
