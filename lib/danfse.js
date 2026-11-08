import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { FONTE_NEGRITO, FONTE_REGULAR, LOGO_NFSE } from './danfse-recursos.js'

// DANFSe no modelo oficial v2.0 (o mesmo PDF que o portal do Emissor Nacional entrega), montado a
// partir do XML da nota. Desde 03/08/2026 a API do PDF oficial está suspensa (NT 008/2026), então o
// portal gera o documento aqui, com os mesmos blocos e campos do modelo da Receita.

// Mesmo endereço do código QR do DANFSe oficial (consulta pública do portal nacional).
const URL_CONSULTA = 'https://www.nfse.gov.br/ConsultaPublica?tpc=1&chave='

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

// Sigla da UF pelos dois primeiros dígitos do código IBGE (quando a consulta ao IBGE não responde).
const UF_IBGE = { 11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF' }
const ufDoCodigo = (cMun) => UF_IBGE[so(cMun).slice(0, 2)]

const endereco = (e) => (e ? [e.xLgr, e.nro, e.xCpl, e.xBairro].filter((x) => !vazio(x)).join(', ') : '-')

// ---------- desenho ----------
// Coordenadas, fontes, cores e espessuras copiadas do DANFSe v2.0 que o Emissor Nacional entrega
// (página A4, em pontos, origem no canto superior esquerdo).
const COLX = [8.5, 153.1, 297.6, 442.2, 586.8]
const RECUO = 3.4
const TX = COLX.map((x) => x + RECUO)
const CINZA = '#f2f2f2'
const LINHA = 7.9 // altura de cada linha de valor (fonte 7)
const ALTURA_LINHA_GRADE = 19.1
const ALTURA_SEM_ROTULO = 12.25

function escrever(doc, texto, x, base, { negrito = false, tam = 7, largura, centro } = {}) {
  doc.font(negrito ? 'B' : 'R').fontSize(tam).fillColor('black')
  const s = String(texto ?? '')
  const px = centro !== undefined ? centro - doc.widthOfString(s) / 2 : x
  doc.text(s, px, base, { lineBreak: false, baseline: 'alphabetic', ...(largura ? { width: largura } : {}) })
}

// Quebra em linhas que cabem na largura (como o modelo oficial faz com nome e descrições).
function quebrar(doc, texto, largura, tam = 7) {
  doc.font('R').fontSize(tam)
  const linhas = []
  for (const paragrafo of String(texto ?? '').split(/\r?\n/)) {
    let atual = ''
    for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra
      if (!atual || doc.widthOfString(tentativa) <= largura) atual = tentativa
      else {
        linhas.push(atual)
        atual = palavra
      }
    }
    linhas.push(atual)
  }
  return linhas
}

// Corta com " ..." quando não cabe (como no campo do Simples Nacional do modelo oficial).
function cortar(doc, texto, largura, tam = 7) {
  doc.font('R').fontSize(tam)
  const s = String(texto ?? '')
  if (doc.widthOfString(s) <= largura) return s
  const palavras = s.split(' ')
  while (palavras.length > 1 && doc.widthOfString(`${palavras.join(' ')} ...`) > largura) palavras.pop()
  return `${palavras.join(' ')} ...`
}

const linhaH = (doc, y, x1 = COLX[0], x2 = COLX[4], w = 0.5) => doc.moveTo(x1, y).lineTo(x2, y).lineWidth(w).strokeColor('black').stroke()
const larguraDe = (span) => 144.6 * span - RECUO * 2

// Seção em grade de 4 colunas. linhas: [[{ r, v, col, span, corta, cinza }]]
function secao(doc, topo, titulo, linhas) {
  let y = topo + 0.2
  linhas.forEach((cels, i) => {
    const valores = cels.map((c) => {
      const w = larguraDe(c.span || 1)
      return c.corta ? [cortar(doc, ou(c.v), w)] : quebrar(doc, ou(c.v), w)
    })
    const n = Math.max(1, ...valores.map((v) => v.length))
    const semRotulo = cels.every((c) => !c.r)
    // A primeira linha de cada seção é um pouco mais alta no modelo oficial.
    const altura = (semRotulo ? ALTURA_SEM_ROTULO : ALTURA_LINHA_GRADE) + (i === 0 ? 0.15 : 0) + LINHA * (n - 1)
    if (i === 0 && titulo) {
      doc.rect(COLX[0], topo + 0.2, COLX[1] - COLX[0], 19.1).fill(CINZA)
      escrever(doc, titulo, TX[0], topo + 6.8, { negrito: true })
    }
    cels.forEach((c, k) => {
      if (c.cinza) doc.rect(COLX[c.col], y, COLX[c.col + (c.span || 1)] - COLX[c.col], 19.1).fill(CINZA)
      if (c.r) escrever(doc, c.r, TX[c.col], y + 5.7, { negrito: true, tam: 6 })
      const base = semRotulo ? y + 6.35 : y + 13.4
      valores[k].forEach((l, j) => escrever(doc, l, TX[c.col], base + LINHA * j))
    })
    y += altura
  })
  linhaH(doc, y)
  return y
}

function faixa(doc, topo, texto) {
  escrever(doc, texto, 0, topo + 6.7, { centro: (COLX[0] + COLX[4]) / 2 })
  linhaH(doc, topo + 8.45)
  return topo + 8.45
}

const munUf = (nomeUf, nome, cMun) => nomeUf || (vazio(nome) ? '-' : [nome, ufDoCodigo(cMun)].filter(Boolean).join(' / '))

export async function gerarDanfseOficial(nfse) {
  const inf = nfse.infNFSe
  const dps = inf.DPS.infDPS
  const prest = dps.prest || {}
  const toma = dps.toma
  const interm = dps.interm
  const serv = dps.serv || {}
  const val = dps.valores || {}
  const trib = val.trib || {}
  const tribMun = trib.tribMun || {}
  const tribFed = trib.tribFed || {}
  const v = inf.valores || {}
  const tpAmb = Number(dps.tpAmb) || 1
  // Mesma codificação do QR oficial (modo byte, correção M, margem de 2 módulos).
  const qr = await QRCode.toBuffer([{ data: `${URL_CONSULTA}${inf.chaveAcesso}`, mode: 'byte' }], { errorCorrectionLevel: 'M', margin: 2, width: 450 })

  const cMunEmit = inf.emit?.enderNac?.cMun
  const cMunToma = toma?.end?.endNac?.cMun ?? toma?.end?.localidade?.endNac?.cMun
  const cMunInterm = interm?.end?.endNac?.cMun ?? interm?.end?.localidade?.endNac?.cMun
  const ufEmit = inf.emit?.enderNac?.UF
  const [munEmit, munToma, munInterm, munEmissor, munPrest, munIncid] = await Promise.all(
    [cMunEmit, cMunToma, cMunInterm, dps.cLocEmi, serv.locPrest?.cLocPrestacao, inf.cLocIncid].map(municipio),
  )
  // Sem a consulta ao IBGE, usa os nomes que a própria nota traz.
  const emissor = munEmissor || (inf.xLocEmi && `${inf.xLocEmi} / ${ufEmit || ufDoCodigo(dps.cLocEmi) || ''}`.replace(/ \/ $/, '')) || '-'
  // Nome do município pelo que a nota já traz (emissão, prestação, incidência) quando o código bate.
  const nomeLocal = (cMun) => {
    const c = so(cMun)
    if (!c) return null
    if (c === so(dps.cLocEmi) && inf.xLocEmi) return munUf(null, inf.xLocEmi, c)
    if (c === so(serv.locPrest?.cLocPrestacao) && inf.xLocPrestacao) return munUf(null, inf.xLocPrestacao, c)
    if (c === so(inf.cLocIncid) && inf.xLocIncid) return munUf(null, inf.xLocIncid, c)
    return null
  }
  const prestador = munEmit || nomeLocal(cMunEmit) || '-'
  const tomadorMun = munToma || nomeLocal(cMunToma)
  const intermMun = munInterm || nomeLocal(cMunInterm)
  const localPrest = serv.locPrest?.cPaisPrestacao
    ? `${ou(inf.xLocPrestacao)} / - / ${serv.locPrest.cPaisPrestacao}`
    : `${munUf(munPrest, inf.xLocPrestacao, serv.locPrest?.cLocPrestacao)} / -`
  const localIncid = vazio(inf.xLocIncid) && !munIncid ? '-' : `${munUf(munIncid, inf.xLocIncid, inf.cLocIncid)} / -`

  const totTrib = trib.totTrib || {}
  const tot = totTrib.vTotTrib || totTrib.pTotTrib || {}
  const totais = `Totais aproximados dos Tributos cfe. Lei n° 12.741/2012: Federais: ${ou(tot.vTotTribFed ?? tot.pTotTribFed)}; Estaduais: ${ou(tot.vTotTribEst ?? tot.pTotTribEst)}; Municipais: ${ou(tot.vTotTribMun ?? tot.pTotTribMun)};`
  const descontoIncond = val.vDescCondIncond?.vDescIncond
  const descontoCond = val.vDescCondIncond?.vDescCond
  const temIbsCbs = Boolean(inf.IBSCBS)
  const dinheiro = (x) => (vazio(x) ? '-' : fmt.reais(x))

  return await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [595, 842], margin: 0, info: { Title: `DANFSe ${inf.chaveAcesso}`, Creator: 'Amorins Contábil' } })
    const partes = []
    doc.on('data', (c) => partes.push(c))
    doc.on('end', () => resolve(Buffer.concat(partes)))
    doc.on('error', reject)
    try {
      doc.registerFont('R', FONTE_REGULAR)
      doc.registerFont('B', FONTE_NEGRITO)

      // Cabeçalho
      doc.rect(COLX[0], 5.7, COLX[4] - COLX[0], 34).fill(CINZA)
      doc.image(LOGO_NFSE, 11.9, 10.3, { width: 115.7, height: 22.9 })
      const meio = (COLX[0] + COLX[4]) / 2
      escrever(doc, 'DANFSe v2.0', 0, 20.8, { negrito: true, tam: 9, centro: meio })
      escrever(doc, 'Documento Auxiliar da NFS-e', 0, 31.1, { negrito: true, tam: 9, centro: meio })
      escrever(doc, `Município: ${emissor.replace(' / ', ' - ')}`, TX[3], 18.7, { tam: 8 })
      escrever(doc, `Ambiente Gerador: ${ou(inf.ambGer)}`, TX[3], 25.9, { tam: 6 })
      escrever(doc, `Tipo de Ambiente: ${tpAmb}`, TX[3], 32.7, { tam: 6 })
      linhaH(doc, 39.9)

      if (tpAmb === 2) {
        doc.save().rotate(-35, { origin: [297.5, 421] }).font('B').fontSize(46).fillColor('#bbbbbb').fillOpacity(0.35)
        doc.text('SEM VALOR FISCAL', 60, 400, { width: 475, align: 'center', lineBreak: false })
        doc.restore().fillOpacity(1).fillColor('black')
      }

      // Identificação da nota + QR
      const campo = (r, valor, col, base) => {
        escrever(doc, r, TX[col], base, { negrito: true })
        escrever(doc, ou(valor), TX[col], base + 7.9)
      }
      campo('CHAVE DE ACESSO DA NFS-e', inf.chaveAcesso, 0, 51.0)
      campo('NÚMERO DA NFS-e', inf.nNFSe, 0, 71.2)
      campo('COMPETÊNCIA DA NFS-e', fmt.data(dps.dCompet), 1, 71.2)
      campo('DATA E HORA DA EMISSÃO DA NFS-e', fmt.dataHora(inf.dhProc), 2, 71.2)
      campo('NÚMERO DA DPS', dps.nDPS, 0, 91.5)
      campo('SÉRIE DA DPS', dps.serie, 1, 91.5)
      campo('DATA E HORA DA EMISSÃO DA DPS', fmt.dataHora(dps.dhEmi), 2, 91.5)
      doc.rect(COLX[0], 105.1, COLX[1] - COLX[0], 20.2).fill(CINZA)
      campo('EMITENTE DA NFS-e', TEXTOS.tpEmit[dps.tpEmit], 0, 111.7)
      campo('SITUAÇÃO DA NFS-e', TEXTOS.cStat[inf.cStat] || inf.cStat, 1, 111.7)
      campo('FINALIDADE', dps.finNFSe && String(dps.finNFSe) !== '0' ? dps.finNFSe : '-', 2, 111.7)
      doc.image(qr, 492, 44.8, { width: 45, height: 45 })
      ;['A autenticidade desta NFS-e pode ser verificada', 'pela leitura deste código QR ou pela consulta da', 'chave de acesso no portal nacional da NFS-e'].forEach((l, i) =>
        escrever(doc, l, TX[3], 97.4 + 6.8 * i, { tam: 6 }),
      )
      linhaH(doc, 125.6)

      // Prestador
      let y = secao(doc, 125.6, 'PRESTADOR / FORNECEDOR', [
        [
          { col: 1, r: 'CNPJ / CPF / NIF', v: fmt.doc(inf.emit?.identificador) },
          { col: 2, r: 'Indicador Municipal (Inscrição)', v: inf.emit?.IM },
          { col: 3, r: 'Telefone', v: fmt.fone(prest.fone || inf.emit?.fone) },
        ],
        [
          { col: 0, span: 2, r: 'Nome / Nome Empresarial', v: inf.emit?.xNome },
          { col: 2, r: 'Município / Sigla UF', v: prestador },
          { col: 3, r: 'Código IBGE / CEP', v: `${fmt.ibge(cMunEmit)} / ${fmt.cep(inf.emit?.enderNac?.CEP)}` },
        ],
        [
          { col: 0, span: 2, r: 'Endereço', v: endereco(inf.emit?.enderNac) },
          { col: 2, span: 2, r: 'E-mail', v: prest.email || inf.emit?.email },
        ],
        [
          { col: 0, r: 'Simples Nacional na Data de Competência', v: TEXTOS.opSimpNac[prest.regTrib?.opSimpNac], corta: true },
          { col: 1, span: 3, r: 'Regime de Apuração Tributária pelo SN', v: TEXTOS.regApTribSN[prest.regTrib?.regApTribSN], corta: true },
        ],
      ])

      // Tomador e intermediário
      const pessoa = (titulo, p, mun, cMun) => {
        const endNac = p.end?.endNac || p.end?.localidade?.endNac || {}
        y = secao(doc, y, titulo, [
          [
            { col: 1, r: 'CNPJ / CPF / NIF', v: fmt.doc(p.identificador || p) },
            { col: 2, r: 'Indicador Municipal (Inscrição)', v: p.IM },
            { col: 3, r: 'Telefone', v: fmt.fone(p.fone) },
          ],
          [
            { col: 0, span: 2, r: 'Nome / Nome Empresarial', v: p.xNome },
            { col: 2, r: 'Município / Sigla UF', v: mun || '-' },
            { col: 3, r: 'Código IBGE / CEP', v: `${fmt.ibge(cMun)} / ${fmt.cep(endNac.CEP)}` },
          ],
          [
            { col: 0, span: 2, r: 'Endereço', v: p.end ? endereco({ ...p.end, ...endNac }) : '-' },
            { col: 2, span: 2, r: 'E-mail', v: p.email },
          ],
        ])
      }
      if (toma) pessoa('TOMADOR / ADQUIRENTE', toma, tomadorMun, cMunToma)
      else y = faixa(doc, y, 'TOMADOR DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e')
      y = faixa(doc, y, 'DESTINATÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e')
      if (interm) pessoa('INTERMEDIÁRIO DA OPERAÇÃO', interm, intermMun, cMunInterm)
      else y = faixa(doc, y, 'INTERMEDIÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e')

      // Serviço
      y = secao(doc, y, 'SERVIÇO PRESTADO', [
        [
          { col: 1, r: 'Código de Tributação Nacional/Municipal', v: `${fmt.trib(serv.cServ?.cTribNac)} / ${ou(serv.cServ?.cTribMun)}` },
          { col: 2, r: 'Código da NBS', v: fmt.nbs(serv.cServ?.cNBS) },
          { col: 3, r: 'Local da Prestação / Sigla UF / País', v: localPrest },
        ],
        [{ col: 0, span: 4, v: String(inf.xTribNac || '').toUpperCase() }],
        [{ col: 0, span: 4, r: 'Descrição do Serviço', v: serv.cServ?.xDescServ }],
      ])

      // ISSQN
      y = secao(doc, y, 'TRIBUTAÇÃO MUNICIPAL (ISSQN)', [
        [
          { col: 1, r: 'Tipo de Tributação do ISSQN', v: TEXTOS.tribISSQN[tribMun.tribISSQN] },
          { col: 2, span: 2, r: 'Município / Sigla UF / País de Incidência do ISSQN', v: localIncid },
        ],
        [
          { col: 0, r: 'BC ISSQN', v: dinheiro(v.vBC) },
          { col: 1, r: 'Alíquota Aplicada', v: vazio(v.pAliqAplic) ? '-' : fmt.pct(v.pAliqAplic) },
          { col: 2, r: 'Retenção do ISSQN', v: TEXTOS.tpRetISSQN[tribMun.tpRetISSQN] },
          { col: 3, r: 'ISSQN Apurado', v: dinheiro(v.vISSQN) },
        ],
      ])

      // Federais
      y = secao(doc, y, 'TRIBUTAÇÃO FEDERAL (EXCETO CBS)', [
        [
          { col: 1, r: 'IRRF', v: dinheiro(tribFed.vRetIRRF) },
          { col: 2, r: 'Contribuição Previdenciária - Retida', v: dinheiro(tribFed.vRetCP) },
          { col: 3, r: 'Contribuições Sociais - Retidas', v: dinheiro(tribFed.vRetCSLL) },
        ],
        [
          { col: 0, r: 'PIS - Débito Apuração Própria', v: dinheiro(tribFed.piscofins?.vPis) },
          { col: 1, r: 'COFINS - Débito Apuração Própria', v: dinheiro(tribFed.piscofins?.vCofins) },
          { col: 2, span: 2, r: 'Descrição Contrib. Sociais - Retidas', v: '-' },
        ],
      ])

      // IBS/CBS (vazio enquanto as notas não trazem o grupo)
      y = secao(doc, y, 'TRIBUTAÇÃO IBS/CBS', [
        [
          { col: 1, r: 'CST / cClassTrib', v: '- / -' },
          { col: 2, span: 2, r: 'Indicador de Operação / Código IBGE Incidência / Município Incidência / Sigla UF', v: '- / - / - / -' },
        ],
        [
          { col: 0, r: 'Exclusões e Reduções da Base de Cálculo', v: 'R$ 0,00' },
          { col: 1, r: 'Base de Cálculo Após Exclusões e Reduções', v: '-' },
          { col: 2, r: 'Red. Alíquota IBS / Red. Alíquota CBS', v: '- / - / -' },
          { col: 3, r: 'Alíquota - IBS UF / IBS Mun', v: '- / -' },
        ],
        [
          { col: 0, r: 'Alíq. Efetiva Municipal - IBS', v: '-' },
          { col: 1, r: 'Valor Apurado Municipal - IBS', v: '-' },
          { col: 2, r: 'Alíq. Efetiva Estadual - IBS', v: '-' },
          { col: 3, r: 'Valor Apurado Estadual - IBS', v: '-' },
        ],
        [
          { col: 0, r: 'Valor Total Apurado - IBS', v: '-' },
          { col: 1, r: 'Alíquota - CBS', v: '-' },
          { col: 2, r: 'Alíquota Efetiva - CBS', v: '-' },
          { col: 3, r: 'Valor Total Apurado - CBS', v: '-' },
        ],
      ])

      // Totais
      y = secao(doc, y, 'VALOR TOTAL DA NFS-e', [
        [
          { col: 1, r: 'VALOR DA OPERAÇÃO / SERVIÇO', v: fmt.reais(val.vServPrest?.vServ) },
          { col: 2, r: 'Desconto Incondicionado', v: dinheiro(descontoIncond) },
          { col: 3, r: 'Desconto Condicionado', v: dinheiro(descontoCond) },
        ],
        [
          { col: 0, r: 'Total das Retenções (ISSQN / Federais)', v: vazio(v.vTotalRet) || Number(v.vTotalRet) === 0 ? '-' : fmt.reais(v.vTotalRet) },
          { col: 1, r: 'VALOR LÍQUIDO DA NFS-e', v: fmt.reais(v.vLiq) },
          { col: 2, r: 'Total do IBS/CBS', v: 'R$ 0,00' },
          { col: 3, r: 'VALOR LÍQUIDO DA NFS-e + IBS/CBS', v: temIbsCbs ? fmt.reais(v.vLiq) : 'R$ 0,00', cinza: true },
        ],
      ])

      // Informações complementares: primeira linha com as informações da DPS (vazia quando não há),
      // depois os totais aproximados, como no modelo oficial.
      escrever(doc, 'INFORMAÇÕES COMPLEMENTARES', TX[0], y + 6.9, { negrito: true })
      const larguraInfo = COLX[4] - COLX[0] - RECUO * 2
      const linhasInfo = [
        ...(vazio(serv.infoCompl?.xInfComp) && vazio(inf.xOutInf) ? [''] : quebrar(doc, [serv.infoCompl?.xInfComp, inf.xOutInf].filter((x) => !vazio(x)).join('\n'), larguraInfo)),
        ...quebrar(doc, totais, larguraInfo),
      ]
      linhasInfo.slice(0, 30).forEach((l, i) => escrever(doc, l, TX[0], y + 19.1 + LINHA * i))

      // Canhoto
      doc.lineWidth(1).strokeColor('black')
      doc.moveTo(8.5, 795.8).lineTo(587.8, 795.8).stroke()
      doc.moveTo(8.5, 815.9).lineTo(587.8, 815.9).stroke()
      for (const x of [9.0, 153.6, 298.1, 587.3]) doc.moveTo(x, 796.3).lineTo(x, 816.4).stroke()
      escrever(doc, 'DATA CIENTIFICAÇÃO:', 12.9, 801.9, { negrito: true, tam: 6 })
      escrever(doc, 'IDENTIFICAÇÃO E ASSINATURA', 157.5, 801.9, { negrito: true, tam: 6 })
      escrever(doc, 'N° NFS-e / CHAVE NFS-e', 302.0, 801.9, { negrito: true, tam: 6 })
      escrever(doc, `${inf.nNFSe} / ${inf.chaveAcesso}`, 302.0, 809.7)

      // Borda da página
      doc.rect(5, 5, 585, 832).lineWidth(1).stroke()
      doc.end()
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}
