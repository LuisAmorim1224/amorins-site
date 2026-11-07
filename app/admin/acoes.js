'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { criarAssinatura, criarClienteAsaas } from '@/lib/asaas'
import { exigirAdmin } from '@/lib/auth'
import { buscarCnpj, dadosDaReceita, sociosDaReceita } from '@/lib/cnpj'
import { nomeSeguro, PASTA } from '@/lib/documentos'
import { fichaParaBanco, REGIMES, tipoDocumento } from '@/lib/ficha'
import { cnpjDoEmailDeLogin, emailDeLogin, senhaInicial } from '@/lib/login'
import { createAdminClient } from '@/lib/supabase/admin'
import { DIA_VENCIMENTO } from '@/lib/vencimento'
import { emitirPedido, importarNotasAnteriores, salvarCertificado } from '@/lib/nfse'

const somenteNumeros = (texto) => String(texto || '').replace(/\D/g, '')

export async function cadastrarCliente(_estado, formData) {
  await exigirAdmin()
  const dados = {
    nome: String(formData.get('nome')).trim(),
    email: String(formData.get('email') || '').trim().toLowerCase(),
    cpf_cnpj: somenteNumeros(formData.get('cpf_cnpj')),
    telefone: somenteNumeros(formData.get('telefone')) || null,
  }
  if (!dados.nome) return { erro: 'Preencha o nome ou razão social.' }
  if (![11, 14].includes(dados.cpf_cnpj.length)) return { erro: 'Informe um CPF (11 números) ou CNPJ (14 números).' }

  // CNPJ: o cliente entra com o próprio CNPJ e a senha inicial são os 6 primeiros dígitos,
  // trocada obrigatoriamente no primeiro acesso. O e-mail vira só contato (opcional).
  // CPF: continua entrando com e-mail e senha definida aqui.
  const porCnpj = dados.cpf_cnpj.length === 14
  let acesso
  if (porCnpj) {
    acesso = {
      email: emailDeLogin(dados.cpf_cnpj),
      password: senhaInicial(dados.cpf_cnpj),
      app_metadata: { trocar_senha: true },
    }
    if (!dados.email) dados.email = acesso.email
  } else {
    const senha = String(formData.get('senha') || '')
    if (!dados.email) return { erro: 'Para cliente com CPF, informe o e-mail de acesso.' }
    if (senha.length < 8) return { erro: 'A senha inicial precisa ter pelo menos 8 caracteres.' }
    acesso = { email: dados.email, password: senha }
  }

  const supabase = createAdminClient()
  const { data: criado, error: erroUsuario } = await supabase.auth.admin.createUser({
    ...acesso,
    email_confirm: true,
  })
  if (erroUsuario) {
    const jaExiste = /already|registered|exists/i.test(erroUsuario.message)
    return {
      erro: jaExiste
        ? 'Já existe um acesso com este CNPJ/e-mail.'
        : `Não foi possível criar o acesso: ${erroUsuario.message}`,
    }
  }

  const cliente = { id: criado.user.id, ...dados }
  const { error: erroCadastro } = await supabase.from('clientes').insert(cliente)
  if (erroCadastro) {
    await supabase.auth.admin.deleteUser(cliente.id)
    return { erro: `Não foi possível salvar o cadastro: ${erroCadastro.message}` }
  }

  // Com CNPJ, já traz os dados públicos da Receita. Se a consulta falhar, o cadastro continua
  // e dá para tentar de novo pela ficha do cliente.
  if (cliente.cpf_cnpj.length === 14) {
    try {
      await gravarDadosDaReceita(supabase, cliente.id, cliente.cpf_cnpj)
    } catch (e) {
      console.error('Consulta do CNPJ no cadastro falhou:', e)
    }
  }

  redirect(`/admin/clientes/${cliente.id}`)
}

async function ativarCobranca(supabase, cliente) {
  let customerId = cliente.asaas_customer_id
  if (!customerId) {
    customerId = (await criarClienteAsaas(cliente)).id
    await supabase.from('clientes').update({ asaas_customer_id: customerId }).eq('id', cliente.id)
  }
  const assinatura = await criarAssinatura({
    customerId,
    valor: cliente.valor_honorario,
    diaVencimento: DIA_VENCIMENTO,
  })
  await supabase.from('clientes').update({ asaas_subscription_id: assinatura.id }).eq('id', cliente.id)
}

// A cobrança nunca começa sozinha: o escritório define o valor de cada cliente e confirma
// aqui. O vencimento é sempre no dia 5.
export async function ativarCobrancaMensal(_estado, formData) {
  await exigirAdmin()
  const id = String(formData.get('id'))
  const valor = Number(String(formData.get('valor') || '').replace(/\./g, '').replace(',', '.'))
  if (!(valor > 0)) return { erro: 'Informe o valor do honorário mensal.' }
  if (formData.get('confirmo') !== 'sim') return { erro: 'Marque a confirmação antes de ativar a cobrança.' }

  const supabase = createAdminClient()
  const { data: cliente } = await supabase.from('clientes').select('*').eq('id', id).single()
  if (!cliente) return { erro: 'Cliente não encontrado.' }
  if (cliente.asaas_subscription_id) return { erro: 'A cobrança deste cliente já está ativa.' }

  const atualizado = { ...cliente, valor_honorario: valor, dia_vencimento: DIA_VENCIMENTO }
  await supabase
    .from('clientes')
    .update({ valor_honorario: valor, dia_vencimento: DIA_VENCIMENTO })
    .eq('id', id)
  try {
    await ativarCobranca(supabase, atualizado)
  } catch (e) {
    revalidatePath(`/admin/clientes/${id}`)
    return { erro: `O Asaas recusou a cobrança: ${e.message}` }
  }
  revalidatePath(`/admin/clientes/${id}`)
  revalidatePath('/admin')
  return { ok: `Cobrança ativada: ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} todo dia ${DIA_VENCIMENTO}.` }
}

// Gera uma autorização de envio: o navegador manda o arquivo direto para o Supabase,
// sem passar pelo servidor do site (que tem limite de tamanho).
export async function autorizarEnvio(clienteId, nomeArquivo) {
  await exigirAdmin()
  const caminho = `${clienteId}/${nomeSeguro(nomeArquivo)}`
  const { data, error } = await createAdminClient()
    .storage.from(PASTA)
    .createSignedUploadUrl(caminho, { upsert: true })
  if (error) throw new Error(error.message)
  return { caminho: data.path, token: data.token }
}

export async function atualizarDocumentos(clienteId) {
  await exigirAdmin()
  revalidatePath(`/admin/clientes/${clienteId}`)
}

// Cliente esqueceu a senha: volta para a senha inicial (6 primeiros dígitos do CNPJ)
// e exige criar uma nova no próximo acesso.
export async function restaurarSenhaInicial(_estado, formData) {
  await exigirAdmin()
  const id = String(formData.get('id'))
  const supabase = createAdminClient()
  const { data, error } = await supabase.auth.admin.getUserById(id)
  if (error || !data?.user) return { erro: 'Acesso do cliente não encontrado.' }
  const cnpj = cnpjDoEmailDeLogin(data.user.email)
  if (!cnpj) return { erro: 'Este cliente entra por e-mail, não por CNPJ.' }
  const { error: erroAtualizar } = await supabase.auth.admin.updateUserById(id, {
    password: senhaInicial(cnpj),
    app_metadata: { ...data.user.app_metadata, trocar_senha: true },
  })
  if (erroAtualizar) return { erro: `Não foi possível restaurar: ${erroAtualizar.message}` }
  return { ok: 'Senha restaurada. O cliente entra com os 6 primeiros números do CNPJ e cria uma nova.' }
}

// Guarda o tipo e a validade do arquivo que acabou de ser enviado.
export async function registrarDocumento(clienteId, caminho, tipo, validade) {
  await exigirAdmin()
  if (!caminho.startsWith(`${clienteId}/`)) throw new Error('Caminho de arquivo inválido.')
  const { error } = await createAdminClient()
    .from('documentos_info')
    .upsert({
      caminho,
      cliente_id: clienteId,
      tipo: tipoDocumento(tipo),
      validade: /^\d{4}-\d{2}-\d{2}$/.test(validade || '') ? validade : null,
    })
  if (error) throw new Error(error.message)
}

export async function excluirDocumento(formData) {
  await exigirAdmin()
  const caminho = String(formData.get('caminho'))
  const supabase = createAdminClient()
  await supabase.storage.from(PASTA).remove([caminho])
  await supabase.from('documentos_info').delete().eq('caminho', caminho)
  revalidatePath(`/admin/clientes/${caminho.split('/')[0]}`)
}

// ---------- Ficha cadastral ----------

async function gravarDadosDaReceita(supabase, clienteId, cnpj) {
  const dados = await buscarCnpj(cnpj)
  const campos = dadosDaReceita(dados)
  // A Receita só informa Simples/MEI; não apaga um regime escolhido à mão (ex.: Lucro Presumido).
  if (!campos.regime_tributario) delete campos.regime_tributario
  const { error } = await supabase
    .from('clientes')
    .update({ ...campos, dados_receita_em: new Date().toISOString() })
    .eq('id', clienteId)
  if (error) throw new Error(error.message)

  // Sócios publicados pela Receita entram só se ainda não houver nenhum cadastrado.
  const { count } = await supabase
    .from('socios')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', clienteId)
  const socios = sociosDaReceita(dados)
  if (!count && socios.length) {
    await supabase.from('socios').insert(socios.map((s) => ({ ...s, cliente_id: clienteId })))
  }
}

export async function atualizarDadosReceita(_estado, formData) {
  await exigirAdmin()
  const id = String(formData.get('id'))
  const supabase = createAdminClient()
  const { data: cliente } = await supabase.from('clientes').select('cpf_cnpj').eq('id', id).single()
  if (!cliente || cliente.cpf_cnpj?.length !== 14) return { erro: 'Este cliente não tem CNPJ cadastrado.' }
  try {
    await gravarDadosDaReceita(supabase, id, cliente.cpf_cnpj)
  } catch (e) {
    return { erro: e.message }
  }
  revalidatePath(`/admin/clientes/${id}`)
  return { ok: 'Dados atualizados com a Receita Federal.' }
}

export async function importarFicha(_estado, formData) {
  await exigirAdmin()
  const id = String(formData.get('id'))
  const arquivo = formData.get('ficha')
  if (!arquivo || typeof arquivo === 'string' || !arquivo.size) return { erro: 'Escolha o arquivo da ficha (.json).' }
  if (arquivo.size > 1024 * 1024) return { erro: 'Arquivo grande demais para uma ficha.' }

  let convertido
  try {
    convertido = fichaParaBanco(JSON.parse(await arquivo.text()))
  } catch (e) {
    return { erro: e instanceof SyntaxError ? 'O arquivo não é um JSON válido.' : e.message }
  }

  const supabase = createAdminClient()
  const { data: atual } = await supabase.from('clientes').select('cpf_cnpj').eq('id', id).single()
  if (!atual) return { erro: 'Cliente não encontrado.' }
  if (convertido.cliente.cpf_cnpj && convertido.cliente.cpf_cnpj !== atual.cpf_cnpj) {
    return { erro: 'O CNPJ da ficha é diferente do CNPJ deste cliente. Nada foi importado.' }
  }

  const { error: erroCliente } = await supabase.from('clientes').update(convertido.cliente).eq('id', id)
  if (erroCliente) return { erro: `Não foi possível salvar a ficha: ${erroCliente.message}` }

  if (convertido.socios.length) {
    await supabase.from('socios').delete().eq('cliente_id', id)
    const { error: erroSocios } = await supabase
      .from('socios')
      .insert(convertido.socios.map((s) => ({ ...s, cliente_id: id })))
    if (erroSocios) return { erro: `A empresa foi salva, mas os sócios falharam: ${erroSocios.message}` }
  }

  // Classifica os arquivos que já estão na pasta do cliente com o mesmo nome da ficha.
  const { data: naPasta } = await supabase.storage.from(PASTA).list(id)
  const existentes = new Set((naPasta || []).map((a) => a.name))
  const classificados = convertido.documentos
    .map((d) => ({ ...d, nome: nomeSeguro(d.arquivo) }))
    .filter((d) => existentes.has(d.nome))
    .map((d) => ({ caminho: `${id}/${d.nome}`, cliente_id: id, tipo: d.tipo, validade: d.validade }))
  if (classificados.length) await supabase.from('documentos_info').upsert(classificados)

  revalidatePath(`/admin/clientes/${id}`)
  return {
    ok: `Ficha importada: empresa, ${convertido.socios.length} sócio(s) e ${classificados.length} documento(s) classificados.`,
  }
}

// ---------- Pedidos de nota e notas emitidas ----------

const EM_ABERTO = ['pendente', 'escolher_servico', 'erro']

const valorEmReais = (v) => {
  const s = String(v || '').trim().replace(/\s|R\$/g, '')
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}

// O escritório emitiu a nota: marca o pedido e já lança a nota na prévia de impostos do cliente.
export async function marcarPedidoEmitido(_estado, formData) {
  await exigirAdmin()
  const id = String(formData.get('id'))
  const supabase = createAdminClient()
  const { data: pedido } = await supabase.from('pedidos_nota').select('*').eq('id', id).single()
  if (!pedido || !EM_ABERTO.includes(pedido.status)) return { erro: 'Pedido não encontrado ou já resolvido.' }

  const numero = String(formData.get('numero') || '').trim() || null
  const valor = valorEmReais(formData.get('valor') || pedido.valor)
  const data = /^\d{4}-\d{2}-\d{2}$/.test(String(formData.get('data_emissao'))) ? formData.get('data_emissao') : null
  if (!(valor > 0)) return { erro: 'Informe o valor da nota emitida.' }
  if (!data) return { erro: 'Informe a data de emissão.' }

  const { error } = await supabase
    .from('pedidos_nota')
    .update({ status: 'emitida', numero_nota: numero, atualizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) return { erro: error.message }
  await supabase.from('notas_emitidas').insert({
    cliente_id: pedido.cliente_id,
    numero,
    data_emissao: data,
    valor,
    tomador: pedido.tomador_nome,
    pedido_id: pedido.id,
    lancada_por: 'escritorio',
  })
  // Emitida à mão com serviço escolhido: entra no histórico para as próximas sugestões.
  if (pedido.servico_id) {
    const { data: servico } = await supabase.from('servicos_nota').select('cod_trib_nac, cod_nbs').eq('id', pedido.servico_id).single()
    if (servico) {
      await supabase.from('historico_notas').insert({
        cliente_id: pedido.cliente_id,
        numero,
        data_emissao: data,
        descricao: pedido.descricao,
        cod_trib_nac: servico.cod_trib_nac,
        cod_nbs: servico.cod_nbs,
        valor,
        tomador: pedido.tomador_nome,
        origem: 'manual',
      })
    }
  }
  revalidatePath('/admin')
  revalidatePath(`/admin/clientes/${pedido.cliente_id}`)
  return { ok: 'Pedido marcado como emitido. Envie o PDF/XML em "Enviar documentos" com o tipo Nota fiscal.' }
}

export async function cancelarPedido(formData) {
  await exigirAdmin()
  const id = String(formData.get('id'))
  const resposta = String(formData.get('resposta') || '').trim().slice(0, 500) || null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('pedidos_nota')
    .update({ status: 'cancelada', resposta, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .in('status', EM_ABERTO)
    .select('cliente_id')
    .single()
  revalidatePath('/admin')
  if (data) revalidatePath(`/admin/clientes/${data.cliente_id}`)
}

export async function excluirNotaEmitida(formData) {
  await exigirAdmin()
  const id = String(formData.get('id'))
  const supabase = createAdminClient()
  const { data } = await supabase.from('notas_emitidas').delete().eq('id', id).select('cliente_id').single()
  if (data) revalidatePath(`/admin/clientes/${data.cliente_id}`)
}

export async function salvarDadosInternos(formData) {
  await exigirAdmin()
  const id = String(formData.get('id'))
  const anexo = String(formData.get('anexo') || '')
  const regime = String(formData.get('regime') || '')
  const pendencias = String(formData.get('pendencias') || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  await createAdminClient()
    .from('clientes')
    .update({
      regime_tributario: REGIMES.includes(regime) ? regime : null,
      anexo_simples: ['I', 'II', 'III', 'IV', 'V'].includes(anexo) ? anexo : null,
      pendencias,
    })
    .eq('id', id)
  revalidatePath(`/admin/clientes/${id}`)
}

// ---------- Emissão automática de NFS-e ----------

const revalidarCliente = (id) => {
  revalidatePath('/admin')
  revalidatePath(`/admin/clientes/${id}`)
}
const percentual = (v) => {
  const n = Number(String(v || '').replace(',', '.'))
  return String(v || '').trim() && Number.isFinite(n) ? n : null
}

export async function salvarConfigNfse(_estado, formData) {
  await exigirAdmin()
  const id = String(formData.get('id'))
  const municipio = somenteNumeros(formData.get('municipio'))
  if (!/^\d{7}$/.test(municipio)) return { erro: 'O código IBGE do município tem 7 números (Salvador = 2927408).' }
  const opSimples = String(formData.get('op_simples'))
  const aliquotaSn = percentual(formData.get('aliquota_sn'))
  if (opSimples === '3' && !(aliquotaSn > 0)) return { erro: 'Para ME/EPP do Simples, informe a alíquota aproximada do Simples (%).' }
  const { error } = await createAdminClient()
    .from('clientes')
    .update({
      nfse_ativa: formData.get('ativa') === 'on',
      nfse_emissao_automatica: formData.get('automatica') === 'on',
      nfse_ambiente: formData.get('ambiente') === 'producao' ? 'producao' : 'homologacao',
      nfse_municipio: municipio,
      nfse_inscricao_municipal: somenteNumeros(formData.get('inscricao_municipal')) || null,
      nfse_op_simples: ['1', '2', '3'].includes(opSimples) ? opSimples : '3',
      nfse_aliquota_sn: aliquotaSn,
      nfse_serie: somenteNumeros(formData.get('serie')) || '1',
    })
    .eq('id', id)
  if (error) return { erro: error.message }
  revalidarCliente(id)
  return { ok: 'Configuração da nota salva.' }
}

export async function enviarCertificado(_estado, formData) {
  await exigirAdmin()
  const id = String(formData.get('id'))
  const arquivo = formData.get('certificado')
  const senha = String(formData.get('senha') || '')
  if (!arquivo || typeof arquivo === 'string' || !arquivo.size) return { erro: 'Escolha o arquivo do certificado (.pfx ou .p12).' }
  if (arquivo.size > 100 * 1024) return { erro: 'Arquivo grande demais para um certificado A1.' }
  if (!senha) return { erro: 'Informe a senha do certificado.' }
  try {
    const cert = await salvarCertificado(createAdminClient(), id, Buffer.from(await arquivo.arrayBuffer()), senha)
    revalidarCliente(id)
    return { ok: `Certificado salvo. Vence em ${cert.expiresOn.toLocaleDateString('pt-BR')}.` }
  } catch (e) {
    return { erro: e.message }
  }
}

export async function salvarServico(_estado, formData) {
  await exigirAdmin()
  const clienteId = String(formData.get('cliente_id'))
  const servico = {
    cliente_id: clienteId,
    nome: String(formData.get('nome') || '').trim().slice(0, 120),
    cod_trib_nac: somenteNumeros(formData.get('cod_trib_nac')),
    cod_nbs: somenteNumeros(formData.get('cod_nbs')) || null,
    cod_trib_mun: String(formData.get('cod_trib_mun') || '').trim() || null,
    aliquota_iss: percentual(formData.get('aliquota_iss')),
    exige_obra: formData.get('exige_obra') === 'on',
    retem_iss_tomador_pj: formData.get('retem') === 'on',
    palavras_chave: String(formData.get('palavras_chave') || '').trim().slice(0, 500) || null,
  }
  if (!servico.nome) return { erro: 'Dê um nome ao serviço (ex.: Bombeamento de concreto).' }
  if (servico.cod_trib_nac.length !== 6) return { erro: 'O código de tributação nacional tem 6 números (ex.: 07.02.02 = 070202).' }
  if (servico.cod_nbs && servico.cod_nbs.length !== 9) return { erro: 'O código NBS tem 9 números (ex.: 1.0105.40.00 = 101054000).' }
  const supabase = createAdminClient()
  const id = String(formData.get('id') || '')
  const { error } = id
    ? await supabase.from('servicos_nota').update(servico).eq('id', id).eq('cliente_id', clienteId)
    : await supabase.from('servicos_nota').insert(servico)
  if (error) return { erro: /duplicate|unique/i.test(error.message) ? 'Este código já está cadastrado para o cliente.' : error.message }
  revalidarCliente(clienteId)
  return { ok: 'Serviço salvo.' }
}

export async function excluirServico(formData) {
  await exigirAdmin()
  const { data } = await createAdminClient()
    .from('servicos_nota')
    .delete()
    .eq('id', String(formData.get('id')))
    .select('cliente_id')
    .single()
  if (data) revalidarCliente(data.cliente_id)
}

export async function buscarNotasAnteriores(_estado, formData) {
  await exigirAdmin()
  const id = String(formData.get('id'))
  try {
    const r = await importarNotasAnteriores(createAdminClient(), id)
    revalidarCliente(id)
    return { ok: `${r.notas} nota(s) anteriores importadas${r.servicosNovos ? `, ${r.servicosNovos} serviço(s) novo(s) cadastrado(s) — confira os códigos` : ''}.` }
  } catch (e) {
    return { erro: e.message }
  }
}

// Escolhe (ou troca) o serviço do pedido e, se pedido, já emite.
export async function escolherServicoEEmitir(_estado, formData) {
  await exigirAdmin()
  const id = String(formData.get('id'))
  const servicoId = String(formData.get('servico_id') || '')
  const supabase = createAdminClient()
  const { data: pedido } = await supabase.from('pedidos_nota').select('cliente_id, status').eq('id', id).single()
  if (!pedido || !EM_ABERTO.includes(pedido.status)) return { erro: 'Pedido não encontrado ou já resolvido.' }
  if (!servicoId) return { erro: 'Escolha qual serviço (código) usar nesta nota.' }
  const { data: servico } = await supabase.from('servicos_nota').select('id, nome').eq('id', servicoId).eq('cliente_id', pedido.cliente_id).single()
  if (!servico) return { erro: 'Serviço não encontrado para este cliente.' }
  await supabase
    .from('pedidos_nota')
    .update({
      servico_id: servico.id,
      motivo_servico: 'Escolhido pelo escritório.',
      status: pedido.status === 'escolher_servico' ? 'pendente' : pedido.status,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
  let resultado = { ok: `Serviço definido: ${servico.nome}.` }
  if (formData.get('emitir') === 'sim') resultado = await emitirPedido(supabase, id).catch((e) => ({ erro: e.message }))
  revalidarCliente(pedido.cliente_id)
  return resultado
}

export async function aprovarRecomendacao(formData) {
  await exigirAdmin()
  await createAdminClient().from('recomendacoes').update({ aprovado: true }).eq('id', formData.get('id'))
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function excluirRecomendacao(formData) {
  await exigirAdmin()
  await createAdminClient().from('recomendacoes').delete().eq('id', formData.get('id'))
  revalidatePath('/admin')
  revalidatePath('/')
}
