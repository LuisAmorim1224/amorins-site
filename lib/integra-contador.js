import 'server-only'
import https from 'node:https'
import { CNPJ_ESCRITORIO } from '@/lib/contato'

// Relatório de Situação Fiscal (SITFIS) pela API Integra Contador do Serpro.
// Requisitos (uma vez só, ver README):
//  - contrato do Integra Contador na loja do Serpro, que gera Consumer Key e Consumer Secret;
//  - e-CNPJ A1 do escritório (a autenticação no Serpro exige o certificado);
//  - o cliente dá procuração eletrônica no e-CAC para o CNPJ do escritório.
// Variáveis na Vercel: SERPRO_CONSUMER_KEY, SERPRO_CONSUMER_SECRET,
// SERPRO_CERTIFICADO_PFX_BASE64 (o .pfx em base64) e SERPRO_CERTIFICADO_SENHA.

const URL_AUTENTICACAO = 'https://autenticacao.sapi.serpro.gov.br/authenticate'
const URL_API = () => process.env.SERPRO_INTEGRA_URL || 'https://gateway.apiserpro.serpro.gov.br/integra-contador/v1'

export class ErroIntegra extends Error {
  constructor(mensagem, codigo) {
    super(mensagem)
    this.codigo = codigo // 'sem_procuracao' | 'configuracao' | 'serpro'
  }
}

export function integraConfigurado() {
  return Boolean(
    process.env.SERPRO_CONSUMER_KEY &&
      process.env.SERPRO_CONSUMER_SECRET &&
      process.env.SERPRO_CERTIFICADO_PFX_BASE64 &&
      process.env.SERPRO_CERTIFICADO_SENHA
  )
}

const somenteNumeros = (t) => String(t || '').replace(/\D/g, '')

function postarComCertificado(url, corpo, cabecalhos) {
  const pfx = Buffer.from(process.env.SERPRO_CERTIFICADO_PFX_BASE64, 'base64')
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        pfx,
        passphrase: process.env.SERPRO_CERTIFICADO_SENHA,
        headers: { ...cabecalhos, 'Content-Length': Buffer.byteLength(corpo) },
        timeout: 30_000,
      },
      (res) => {
        let dados = ''
        res.on('data', (c) => (dados += c))
        res.on('end', () => resolve({ status: res.statusCode, corpo: dados }))
      }
    )
    req.on('timeout', () => req.destroy(new Error('Tempo esgotado na autenticação do Serpro.')))
    req.on('error', reject)
    req.end(corpo)
  })
}

let tokenEmCache = null

async function autenticar() {
  if (tokenEmCache && tokenEmCache.validoAte > Date.now() + 60_000) return tokenEmCache
  const basic = Buffer.from(`${process.env.SERPRO_CONSUMER_KEY}:${process.env.SERPRO_CONSUMER_SECRET}`).toString('base64')
  let resposta
  try {
    resposta = await postarComCertificado(URL_AUTENTICACAO, 'grant_type=client_credentials', {
      Authorization: `Basic ${basic}`,
      'Role-Type': 'TERCEIROS',
      'Content-Type': 'application/x-www-form-urlencoded',
    })
  } catch (e) {
    const senha = /mac verify|password|passphrase/i.test(e.message)
    throw new ErroIntegra(senha ? 'Senha do e-CNPJ do escritório incorreta.' : `Falha ao autenticar no Serpro: ${e.message}`, 'configuracao')
  }
  if (resposta.status !== 200) {
    throw new ErroIntegra(`O Serpro recusou a autenticação (código ${resposta.status}). Confira as chaves e o e-CNPJ.`, 'configuracao')
  }
  const dados = JSON.parse(resposta.corpo)
  tokenEmCache = {
    access: dados.access_token,
    jwt: dados.jwt_token,
    validoAte: Date.now() + Number(dados.expires_in || 1800) * 1000,
  }
  return tokenEmCache
}

async function chamar(operacao, cnpjContribuinte, idServico, dados = '') {
  const token = await autenticar()
  const corpo = {
    contratante: { numero: CNPJ_ESCRITORIO, tipo: 2 },
    autorPedidoDados: { numero: CNPJ_ESCRITORIO, tipo: 2 },
    contribuinte: { numero: somenteNumeros(cnpjContribuinte), tipo: 2 },
    pedidoDados: { idSistema: 'SITFIS', idServico, versaoSistema: '2.0', dados },
  }
  const resposta = await fetch(`${URL_API()}/${operacao}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.access}`,
      jwt_token: token.jwt,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(corpo),
    cache: 'no-store',
  })
  const texto = await resposta.text()
  let json = {}
  try {
    json = JSON.parse(texto)
  } catch {
    // resposta sem JSON (ex.: erro do gateway)
  }
  const mensagens = (json.mensagens || []).map((m) => `${m.codigo || ''} ${m.texto || ''}`.trim()).join(' | ')
  if (!resposta.ok && resposta.status !== 202) {
    if (/procura|outorg|autoriza/i.test(mensagens)) {
      throw new ErroIntegra('A Receita ainda não encontrou a procuração eletrônica para a Amorins Contábil.', 'sem_procuracao')
    }
    throw new ErroIntegra(`O Serpro respondeu com erro (código ${resposta.status}). ${mensagens || texto.slice(0, 300)}`, 'serpro')
  }
  let conteudo = json.dados
  if (typeof conteudo === 'string' && conteudo) {
    try {
      conteudo = JSON.parse(conteudo)
    } catch {
      // mantém como texto
    }
  }
  return { status: resposta.status, dados: conteudo || {}, mensagens }
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Pede e baixa o Relatório de Situação Fiscal do CNPJ.
 * @returns Buffer com o PDF
 */
export async function baixarRelatorioSituacaoFiscal(cnpj, { limiteMs = 200_000 } = {}) {
  if (!integraConfigurado()) throw new ErroIntegra('O Integra Contador ainda não foi configurado.', 'configuracao')
  const inicio = Date.now()
  const pedido = await chamar('Apoiar', cnpj, 'SOLICITARPROTOCOLO91')
  const protocolo = pedido.dados.protocoloRelatorio
  if (!protocolo) {
    // Às vezes o relatório já sai direto.
    if (pedido.dados.pdf) return Buffer.from(pedido.dados.pdf, 'base64')
    throw new ErroIntegra(`O Serpro não devolveu o protocolo do relatório. ${pedido.mensagens}`, 'serpro')
  }
  let espera = Number(pedido.dados.tempoEspera) || 5_000
  for (;;) {
    await esperar(Math.min(Math.max(espera, 2_000), 30_000))
    const emitido = await chamar('Emitir', cnpj, 'RELATORIOSITFIS92', JSON.stringify({ protocoloRelatorio: protocolo }))
    if (emitido.dados.pdf) return Buffer.from(emitido.dados.pdf, 'base64')
    espera = Number(emitido.dados.tempoEspera) || 10_000
    if (Date.now() - inicio + espera > limiteMs) {
      throw new ErroIntegra('A Receita ainda está gerando o relatório. Tente de novo em alguns minutos.', 'serpro')
    }
  }
}
