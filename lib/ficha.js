// Regras da ficha cadastral: tipos de documento, importação da ficha JSON e pendências.

export const TIPOS_DOCUMENTO = {
  cartao_cnpj: 'Cartão CNPJ',
  contrato_social: 'Contrato social / alteração',
  documento_pessoal: 'Documento pessoal (RG/CNH)',
  comprovante_residencia: 'Comprovante de residência',
  certificado_digital: 'Certificado digital',
  registro_profissional: 'Registro profissional (CRC, OAB...)',
  nota_fiscal: 'Nota fiscal',
  guia: 'Guia de imposto (DAS, DARF...)',
  outro: 'Outro',
}

export const REGIMES = ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real']

const somenteNumeros = (texto) => String(texto || '').replace(/\D/g, '')

// Nomes de tipo usados em fichas antigas -> tipos do site.
const TIPOS_EQUIVALENTES = {
  cnh: 'documento_pessoal',
  rg: 'documento_pessoal',
  carteira_crc: 'registro_profissional',
  carteira_crc_frente: 'registro_profissional',
  carteira_crc_verso: 'registro_profissional',
}

export function tipoDocumento(tipo) {
  const t = String(tipo || '').toLowerCase()
  if (TIPOS_DOCUMENTO[t]) return t
  return TIPOS_EQUIVALENTES[t] || 'outro'
}

// "2026-11-05" de um { ano, mes, dia }
export function isoDe({ ano, mes, dia }) {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function somarDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

const dataValida = (texto) => (/^\d{4}-\d{2}-\d{2}$/.test(String(texto || '')) ? texto : null)

// Converte a ficha (cadastro-cliente.json) em { cliente, socios, documentos } para o banco.
export function fichaParaBanco(ficha) {
  if (!ficha || typeof ficha !== 'object' || !ficha.empresa) {
    throw new Error('Arquivo inválido: a ficha precisa ter o bloco "empresa".')
  }
  const e = ficha.empresa
  const natureza = [e.natureza_juridica_receita, e.natureza_juridica_contrato].filter(Boolean)
  const cliente = {
    razao_social: e.nome_empresarial_contrato || e.nome_empresarial_receita || e.razao_social || null,
    nome_fantasia: e.nome_fantasia || null,
    natureza_juridica: e.natureza_juridica || natureza[0] || null,
    porte: e.porte || null,
    regime_tributario: e.regime_tributario || null,
    data_abertura: dataValida(e.data_abertura),
    situacao_cadastral: e.situacao_cadastral || null,
    data_situacao_cadastral: dataValida(e.data_situacao_cadastral),
    cnae_principal: e.cnae_principal || null,
    cnaes_secundarios: Array.isArray(e.cnaes_secundarios) ? e.cnaes_secundarios : [],
    endereco: e.endereco || null,
    capital_social: e.capital_social ?? null,
    nire: e.junta_comercial?.nire || e.nire || null,
    email_receita: e.contato?.email || null,
    telefone_receita: e.contato?.telefone || null,
    pendencias: Array.isArray(ficha.pendencias) ? ficha.pendencias.map(String) : [],
  }
  const cpfCnpj = somenteNumeros(e.cnpj)
  if (cpfCnpj.length === 14) cliente.cpf_cnpj = cpfCnpj

  const socios = (ficha.socios || [])
    .filter((s) => s && s.nome)
    .map((s) => ({
      nome: s.nome,
      cpf: s.cpf || null,
      rg: s.rg ? [s.rg.numero, s.rg.orgao_emissor].filter(Boolean).join(' ') : null,
      data_nascimento: dataValida(s.data_nascimento),
      qualificacao: s.qualificacao || (s.administrador ? 'Sócio-Administrador' : 'Sócio'),
      participacao: s.participacao_percentual ?? s.participacao ?? null,
      administrador: Boolean(s.administrador),
      profissao: s.profissao || null,
      registro_profissional: s.crc?.numero ? `CRC ${s.crc.numero}` : s.registro_profissional || null,
    }))

  const documentos = (ficha.documentos || [])
    .filter((d) => d && d.arquivo)
    .map((d) => ({ arquivo: d.arquivo, tipo: tipoDocumento(d.tipo), validade: dataValida(d.validade) }))

  return { cliente, socios, documentos }
}

// Pendências calculadas automaticamente a partir do cadastro e dos documentos enviados.
// documentos: [{ nome, tipo, validade }]
export function pendenciasAutomaticas({ cliente, socios = [], documentos = [], hoje }) {
  const lista = []
  const ehCnpj = somenteNumeros(cliente?.cpf_cnpj).length === 14

  if (ehCnpj && !cliente.dados_receita_em && !cliente.situacao_cadastral) {
    lista.push('Dados da Receita Federal ainda não consultados.')
  }
  if (cliente?.situacao_cadastral && cliente.situacao_cadastral.toUpperCase() !== 'ATIVA') {
    lista.push(`Situação cadastral na Receita: ${cliente.situacao_cadastral}.`)
  }
  if (ehCnpj && !socios.length) lista.push('Nenhum sócio/responsável cadastrado.')

  const tipos = new Set(documentos.map((d) => d.tipo))
  const faltando = ehCnpj
    ? ['cartao_cnpj', 'contrato_social', 'documento_pessoal', 'comprovante_residencia', 'certificado_digital']
    : ['documento_pessoal', 'comprovante_residencia']
  // Empresário individual e MEI não têm contrato social.
  const semContrato = /^213|empres[aá]rio \(individual\)/i.test(cliente?.natureza_juridica || '') ||
    cliente?.regime_tributario === 'MEI'
  for (const tipo of faltando) {
    if (tipo === 'contrato_social' && semContrato) continue
    if (!tipos.has(tipo)) lista.push(`Falta documento: ${TIPOS_DOCUMENTO[tipo]}.`)
  }

  if (hoje) {
    const limite = somarDias(hoje, 30)
    for (const d of documentos) {
      // Guia tem vencimento de pagamento, não de documento: fica na seção de guias.
      if (!d.validade || d.tipo === 'guia') continue
      if (d.validade < hoje) lista.push(`Documento vencido: ${d.nome}.`)
      else if (d.validade <= limite) lista.push(`Documento vence em breve: ${d.nome}.`)
    }
  }
  return lista
}
