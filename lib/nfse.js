import 'server-only'
import { Ambiente, NfseClient, parseNfseXml, parsePfx, ReceitaRejectionError, StatusDistribuicao, TipoDocumento } from 'open-nfse'
import { cifrar, decifrar } from '@/lib/cifra'
import { PASTA } from '@/lib/documentos'
import { montarDps } from '@/lib/nfse-dps'
import { sugerirServico } from '@/lib/servicos'

export const PASTA_CERTIFICADOS = 'certificados'

const ambienteDe = (cliente) => (cliente.nfse_ambiente === 'producao' ? Ambiente.Producao : Ambiente.ProducaoRestrita)

// ---------- Certificado A1 ----------

export async function salvarCertificado(supabase, clienteId, pfx, senha) {
  let cert
  try {
    cert = parsePfx(pfx, senha)
  } catch (e) {
    throw new Error(/password|senha|mac/i.test(e.message) ? 'Senha do certificado incorreta.' : `Certificado inválido: ${e.message}`)
  }
  if (cert.expiresOn < new Date()) throw new Error('Este certificado já venceu.')
  const caminho = `${clienteId}.pfx`
  const { error } = await supabase.storage
    .from(PASTA_CERTIFICADOS)
    .upload(caminho, pfx, { upsert: true, contentType: 'application/x-pkcs12' })
  if (error) throw new Error(`Não foi possível guardar o certificado: ${error.message}`)
  const { error: erroCliente } = await supabase
    .from('clientes')
    .update({
      certificado_caminho: caminho,
      certificado_senha: cifrar(senha),
      certificado_validade: cert.expiresOn.toISOString().slice(0, 10),
      certificado_titular: cert.subject.slice(0, 300),
    })
    .eq('id', clienteId)
  if (erroCliente) throw new Error(erroCliente.message)
  return cert
}

async function conexao(supabase, cliente) {
  if (!cliente.certificado_caminho) throw new Error('O cliente ainda não tem certificado A1 cadastrado.')
  const { data, error } = await supabase.storage.from(PASTA_CERTIFICADOS).download(cliente.certificado_caminho)
  if (error) throw new Error(`Não foi possível ler o certificado: ${error.message}`)
  return new NfseClient({
    ambiente: ambienteDe(cliente),
    certificado: { pfx: Buffer.from(await data.arrayBuffer()), password: decifrar(cliente.certificado_senha) },
    timeoutMs: 45_000,
  })
}

// ---------- Escolha do serviço ----------

export async function sugerirServicoDoPedido(supabase, clienteId, descricao) {
  const [{ data: servicos }, { data: historico }] = await Promise.all([
    supabase.from('servicos_nota').select('*').eq('cliente_id', clienteId).order('nome'),
    supabase
      .from('historico_notas')
      .select('descricao, cod_trib_nac, numero, data_emissao')
      .eq('cliente_id', clienteId)
      .order('data_emissao', { ascending: false })
      .limit(300),
  ])
  return sugerirServico(descricao, servicos || [], historico || [])
}

// ---------- Emissão ----------

async function municipioDoCep(cep) {
  const r = await fetch(`https://viacep.com.br/ws/${String(cep).replace(/\D/g, '')}/json/`, {
    signal: AbortSignal.timeout(10_000),
  })
  const dados = r.ok ? await r.json() : null
  if (!dados?.ibge) throw new Error('CEP da obra não encontrado.')
  return dados.ibge
}

async function guardarArquivo(supabase, clienteId, nome, conteudo, contentType) {
  const caminho = `${clienteId}/${nome}`
  const { error } = await supabase.storage.from(PASTA).upload(caminho, conteudo, { upsert: true, contentType })
  if (error) throw new Error(error.message)
  await supabase.from('documentos_info').upsert({ caminho, cliente_id: clienteId, tipo: 'nota_fiscal', origem: 'escritorio' })
  return caminho
}

function mensagemDeErro(e) {
  if (e instanceof ReceitaRejectionError) return `Recusada pelo Emissor Nacional [${e.codigo}]: ${e.descricao}`
  return e?.message || 'Erro desconhecido ao emitir.'
}

/**
 * Emite a NFS-e de um pedido no Emissor Nacional, guarda XML e PDF na pasta do cliente
 * e lança a nota na prévia de impostos. Em erro, o pedido fica com status "erro" e a mensagem.
 */
export async function emitirPedido(supabase, pedidoId) {
  const { data: pedido } = await supabase.from('pedidos_nota').select('*').eq('id', pedidoId).single()
  if (!pedido || !['pendente', 'erro'].includes(pedido.status)) throw new Error('Pedido não encontrado ou já resolvido.')
  if (!pedido.servico_id) throw new Error('Escolha o serviço (código) da nota antes de emitir.')
  const [{ data: cliente }, { data: servico }] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', pedido.cliente_id).single(),
    supabase.from('servicos_nota').select('*').eq('id', pedido.servico_id).single(),
  ])
  if (!cliente?.nfse_ativa) throw new Error('Emissão automática desligada para este cliente.')

  const falhar = async (mensagem) => {
    await supabase
      .from('pedidos_nota')
      .update({ status: 'erro', erro_emissao: mensagem, atualizado_em: new Date().toISOString() })
      .eq('id', pedidoId)
    return { erro: mensagem }
  }

  let nfse
  try {
    const obraMunicipio = servico.exige_obra && pedido.obra_cep ? await municipioDoCep(pedido.obra_cep) : undefined
    // O número da DPS fica gravado no pedido: se a rede cair, reenviar usa o mesmo número
    // e o Emissor Nacional não duplica a nota.
    let nDPS = pedido.n_dps
    if (!nDPS) {
      const { data, error } = await supabase.rpc('proximo_ndps', { p_cliente: cliente.id })
      if (error || !data) throw new Error(`Não foi possível numerar a DPS: ${error?.message || 'sem retorno'}`)
      nDPS = data
      await supabase.from('pedidos_nota').update({ n_dps: nDPS }).eq('id', pedidoId)
    }
    const dps = montarDps({ cliente, servico, pedido, nDPS, obraMunicipio })
    nfse = await conexao(supabase, cliente)
    const r = await nfse.emitirDpsPronta(dps, { skipCepValidation: true })

    const numero = r.nfse.infNFSe.nNFSe
    const hoje = new Date().toISOString().slice(0, 10)
    const caminhoXml = await guardarArquivo(supabase, cliente.id, `NFS-e ${numero}.xml`, r.xmlNfse, 'application/xml')
    try {
      const pdf = await nfse.gerarDanfse(r.nfse, { ambiente: ambienteDe(cliente) })
      await guardarArquivo(supabase, cliente.id, `NFS-e ${numero}.pdf`, pdf, 'application/pdf')
    } catch (e) {
      console.error('DANFSe não gerado (a nota foi emitida):', e)
    }

    await supabase
      .from('pedidos_nota')
      .update({
        status: 'emitida',
        numero_nota: numero,
        chave_acesso: r.chaveAcesso,
        erro_emissao: null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', pedidoId)
    await supabase.from('notas_emitidas').insert({
      cliente_id: cliente.id,
      numero,
      data_emissao: hoje,
      valor: pedido.valor,
      tomador: pedido.tomador_nome,
      caminho_arquivo: caminhoXml,
      caminho_xml: caminhoXml,
      chave_acesso: r.chaveAcesso,
      pedido_id: pedido.id,
      lancada_por: 'escritorio',
    })
    await supabase.from('historico_notas').upsert(
      {
        cliente_id: cliente.id,
        chave_acesso: r.chaveAcesso,
        numero,
        data_emissao: hoje,
        descricao: pedido.descricao,
        cod_trib_nac: servico.cod_trib_nac,
        cod_nbs: servico.cod_nbs,
        valor: pedido.valor,
        tomador: pedido.tomador_nome,
        origem: 'portal',
      },
      { onConflict: 'chave_acesso' },
    )
    const homologacao = cliente.nfse_ambiente !== 'producao' ? ' (HOMOLOGAÇÃO, sem valor fiscal)' : ''
    return { ok: `NFS-e nº ${numero} emitida${homologacao}. XML e PDF estão nos documentos do cliente.` }
  } catch (e) {
    console.error('Erro ao emitir NFS-e:', e)
    return falhar(mensagemDeErro(e))
  } finally {
    await nfse?.close().catch(() => {})
  }
}

// ---------- Notas anteriores do Emissor Nacional ----------

const numeros = (v) => String(v || '').replace(/\D/g, '')

/**
 * Baixa do Ambiente de Dados Nacional as notas que o cliente já emitiu (inclusive as feitas
 * à mão no site do gov.br) e guarda descrição + código de cada uma. Cria os serviços que
 * ainda não estão cadastrados.
 */
export async function importarNotasAnteriores(supabase, clienteId, { paginas = 20 } = {}) {
  const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single()
  const cnpj = numeros(cliente?.cpf_cnpj)
  const nfse = await conexao(supabase, cliente)
  let nsu = Number(cliente.nfse_ultimo_nsu || 0)
  const notas = []
  const vistos = { documentos: 0, nfse: 0, comoTomador: 0 }
  // O ADN às vezes derruba a conexão (ECONNRESET): tenta mais uma vez antes de desistir.
  const buscar = async (ultimoNsu) => {
    try {
      return await nfse.fetchByNsu({ ultimoNsu, lote: true, cnpjConsulta: cnpj })
    } catch (e) {
      await new Promise((ok) => setTimeout(ok, 2000))
      return nfse.fetchByNsu({ ultimoNsu, lote: true, cnpjConsulta: cnpj })
    }
  }
  try {
    for (let i = 0; i < paginas; i++) {
      const r = await buscar(nsu)
      if (r.status === StatusDistribuicao.Rejeicao) {
        const erros = r.erros.map((e) => `[${e.codigo}] ${e.descricao}${e.complemento ? ` (${e.complemento})` : ''}`).join('; ')
        throw new Error(`O Emissor Nacional recusou a consulta: ${erros || 'sem detalhe'}`)
      }
      vistos.documentos += r.documentos.length
      for (const doc of r.documentos) {
        if (doc.tipoDocumento !== TipoDocumento.Nfse) continue
        vistos.nfse++
        const inf = parseNfseXml(doc.xmlDocumento).infNFSe
        if (numeros(inf.emit.identificador.CNPJ) !== cnpj) {
          vistos.comoTomador++ // nota em que o cliente é só tomador
          continue
        }
        const dps = inf.DPS.infDPS
        notas.push({
          cliente_id: clienteId,
          chave_acesso: doc.chaveAcesso,
          numero: inf.nNFSe,
          data_emissao: dps.dCompet.toISOString().slice(0, 10),
          descricao: dps.serv.cServ.xDescServ,
          cod_trib_nac: dps.serv.cServ.cTribNac,
          cod_nbs: dps.serv.cServ.cNBS || null,
          valor: dps.valores.vServPrest.vServ,
          tomador: dps.toma?.xNome || null,
          origem: 'emissor_nacional',
          _nome: inf.xTribNac,
          _obra: Boolean(dps.serv.obra),
        })
      }
      if (r.ultimoNsu === nsu || !r.documentos.length) break
      nsu = r.ultimoNsu
    }
  } finally {
    await nfse.close().catch(() => {})
  }

  if (notas.length) {
    const { error } = await supabase
      .from('historico_notas')
      .upsert(notas.map(({ _nome, _obra, ...n }) => n), { onConflict: 'chave_acesso' })
    if (error) throw new Error(error.message)
  }
  await supabase.from('clientes').update({ nfse_ultimo_nsu: nsu }).eq('id', clienteId)

  // Serviço novo para cada código que aparece nas notas e ainda não está cadastrado.
  const { data: existentes } = await supabase.from('servicos_nota').select('cod_trib_nac').eq('cliente_id', clienteId)
  const conhecidos = new Set((existentes || []).map((s) => s.cod_trib_nac))
  const novos = new Map()
  for (const n of notas) {
    if (conhecidos.has(n.cod_trib_nac) || novos.has(n.cod_trib_nac)) continue
    novos.set(n.cod_trib_nac, {
      cliente_id: clienteId,
      nome: (n._nome || `Serviço ${n.cod_trib_nac}`).slice(0, 120),
      cod_trib_nac: n.cod_trib_nac,
      cod_nbs: n.cod_nbs,
      exige_obra: n._obra,
      retem_iss_tomador_pj: n._obra,
    })
  }
  if (novos.size) await supabase.from('servicos_nota').insert([...novos.values()])
  return { notas: notas.length, servicosNovos: novos.size, ...vistos, ambiente: cliente.nfse_ambiente }
}
