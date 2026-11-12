'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { atualizarClienteAsaas, criarAssinatura, criarClienteAsaas, criarCobrancaAvulsa } from '@/lib/asaas'
import { numeroWhatsapp } from '@/lib/cobranca-whatsapp'
import { competenciaValida, nomeNoArmazenamento } from '@/lib/arquivos-mes'
import { COOKIE_VER_COMO, ehAdmin, exigirAcessoCliente, exigirAdmin, exigirEquipe } from '@/lib/auth'
import { cookies } from 'next/headers'
import { comClienteLiberado, PAPEL_SOCIO, podeCadastrarClientes } from '@/lib/equipe'
import { buscarCnpj, dadosDaReceita, sociosDaReceita } from '@/lib/cnpj'
import { nomeSeguro, PASTA } from '@/lib/documentos'
import { fichaParaBanco, REGIMES, tipoDocumento } from '@/lib/ficha'
import { cnpjDoEmailDeLogin, emailDeLogin, erroNaNovaSenha, senhaInicial } from '@/lib/login'
import { createAdminClient } from '@/lib/supabase/admin'
import { DIA_VENCIMENTO, hojeNaBahia } from '@/lib/vencimento'
import { atualizarNotasDeTodos, conferirCodigosNoMunicipio, emitirPedido, importarNotasAnteriores, salvarCertificado, sugerirServicoDoPedido } from '@/lib/nfse'
import { criarPedido } from '@/lib/pedidos'
import { resumoSugestao } from '@/lib/servicos'

const somenteNumeros = (texto) => String(texto || '').replace(/\D/g, '')

// Pedido, nota ou serviço: libera só se o cliente dono do registro estiver liberado.
async function exigirAcessoAoRegistro(tabela, id) {
  const { data } = await createAdminClient().from(tabela).select('cliente_id').eq('id', id).maybeSingle()
  if (!data) throw new Error('Registro não encontrado.')
  await exigirAcessoCliente(data.cliente_id)
}

// ---------- Sócios (acesso a parte dos clientes) ----------

const clientesMarcados = (formData) => [...new Set(formData.getAll('clientes').map(String).filter(Boolean))]

export async function cadastrarSocio(_estado, formData) {
  await exigirAdmin()
  const nome = String(formData.get('nome') || '').trim().slice(0, 120)
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const senha = String(formData.get('senha') || '')
  if (!nome) return { erro: 'Informe o nome do sócio.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erro: 'Informe um e-mail válido para o login.' }
  if (email === process.env.ADMIN_EMAIL?.trim().toLowerCase()) return { erro: 'Este é o e-mail do administrador.' }
  const erroSenha = erroNaNovaSenha(senha, senha, null)
  if (erroSenha) return { erro: erroSenha }
  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
    app_metadata: {
      papel: PAPEL_SOCIO,
      clientes: clientesMarcados(formData),
      pode_cadastrar: formData.get('pode_cadastrar') === 'on',
      trocar_senha: true,
    },
  })
  if (error) return { erro: /already|registered|exists/i.test(error.message) ? 'Já existe um acesso com este e-mail.' : error.message }
  revalidatePath('/admin')
  return { ok: `Acesso criado. ${nome} entra com ${email} e a senha inicial, e cria uma senha nova no primeiro acesso.` }
}

async function socioPorId(supabase, id) {
  const { data } = await supabase.auth.admin.getUserById(id)
  return data?.user?.app_metadata?.papel === PAPEL_SOCIO ? data.user : null
}

export async function salvarClientesSocio(_estado, formData) {
  await exigirAdmin()
  const supabase = createAdminClient()
  const socio = await socioPorId(supabase, String(formData.get('id')))
  if (!socio) return { erro: 'Sócio não encontrado.' }
  const clientes = clientesMarcados(formData)
  const podeCadastrar = formData.get('pode_cadastrar') === 'on'
  const { error } = await supabase.auth.admin.updateUserById(socio.id, {
    app_metadata: { ...socio.app_metadata, clientes, pode_cadastrar: podeCadastrar },
  })
  if (error) return { erro: error.message }
  revalidatePath('/admin')
  return { ok: `${clientes.length} cliente(s) liberado(s)${podeCadastrar ? ', com permissão de cadastrar clientes novos' : ''}.` }
}

export async function removerSocio(formData) {
  await exigirAdmin()
  const supabase = createAdminClient()
  const socio = await socioPorId(supabase, String(formData.get('id')))
  if (socio) await supabase.auth.admin.deleteUser(socio.id)
  revalidatePath('/admin')
}

export async function cadastrarCliente(_estado, formData) {
  const usuario = await exigirEquipe()
  const admin = ehAdmin(usuario)
  if (!admin && !podeCadastrarClientes(usuario)) return { erro: 'Seu acesso não permite cadastrar clientes. Fale com o administrador.' }
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

  // Cliente cadastrado por sócio já fica liberado para ele (lê o cadastro atual para não perder
  // liberações feitas pelo administrador enquanto ele estava logado).
  if (!admin) {
    const { data: atual } = await supabase.auth.admin.getUserById(usuario.id)
    const socio = atual?.user || usuario
    const { error: erroLiberar } = await supabase.auth.admin.updateUserById(socio.id, {
      app_metadata: { ...socio.app_metadata, clientes: comClienteLiberado(socio, cliente.id) },
    })
    if (erroLiberar) console.error('Não foi possível liberar o cliente novo para o sócio:', erroLiberar)
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

async function garantirClienteAsaas(supabase, cliente) {
  if (cliente.asaas_customer_id) return cliente.asaas_customer_id
  const customerId = (await criarClienteAsaas(cliente)).id
  await supabase.from('clientes').update({ asaas_customer_id: customerId }).eq('id', cliente.id)
  return customerId
}

async function ativarCobranca(supabase, cliente) {
  const customerId = await garantirClienteAsaas(supabase, cliente)
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
  
  const id = String(formData.get('id'))
  await exigirAcessoCliente(id)
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

// Cobrança avulsa (mês em atraso, serviço extra). Também só sai com confirmação.
export async function gerarCobrancaAvulsa(_estado, formData) {
  
  const id = String(formData.get('id'))
  await exigirAcessoCliente(id)
  const valor = Number(String(formData.get('valor') || '').replace(/\./g, '').replace(',', '.'))
  const vencimento = String(formData.get('vencimento') || '')
  const descricao = String(formData.get('descricao') || '').trim() || 'Honorários contábeis - Amorins Contábil'
  if (!(valor > 0)) return { erro: 'Informe o valor da cobrança.' }
  const { ano, mes, dia } = hojeNaBahia()
  const hoje = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimento) || vencimento < hoje) {
    return { erro: 'O vencimento precisa ser hoje ou uma data futura.' }
  }
  if (formData.get('confirmo') !== 'sim') return { erro: 'Marque a confirmação antes de gerar a cobrança.' }

  const supabase = createAdminClient()
  const { data: cliente } = await supabase.from('clientes').select('*').eq('id', id).single()
  if (!cliente) return { erro: 'Cliente não encontrado.' }
  try {
    const customerId = await garantirClienteAsaas(supabase, cliente)
    await criarCobrancaAvulsa({ customerId, valor, vencimento, descricao })
  } catch (e) {
    return { erro: `O Asaas recusou a cobrança: ${e.message}` }
  }
  revalidatePath(`/admin/clientes/${id}`)
  return { ok: 'Cobrança gerada. O Asaas avisa o cliente por e-mail.' }
}

// Gera uma autorização de envio: o navegador manda o arquivo direto para o Supabase,
// sem passar pelo servidor do site (que tem limite de tamanho).
export async function autorizarEnvio(clienteId, nomeArquivo, competencia) {
  await exigirAcessoCliente(clienteId)
  const caminho = `${clienteId}/${nomeNoArmazenamento(nomeSeguro(nomeArquivo), competenciaValida(competencia))}`
  const { data, error } = await createAdminClient()
    .storage.from(PASTA)
    .createSignedUploadUrl(caminho, { upsert: true })
  if (error) throw new Error(error.message)
  return { caminho: data.path, token: data.token }
}

export async function atualizarDocumentos(clienteId) {
  await exigirAcessoCliente(clienteId)
  revalidatePath(`/admin/clientes/${clienteId}`)
}

// Cliente esqueceu a senha: volta para a senha inicial (6 primeiros dígitos do CNPJ)
// e exige criar uma nova no próximo acesso.
export async function restaurarSenhaInicial(_estado, formData) {
  
  const id = String(formData.get('id'))
  await exigirAcessoCliente(id)
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
export async function registrarDocumento(clienteId, caminho, tipo, validade, competencia) {
  await exigirAcessoCliente(clienteId)
  if (!caminho.startsWith(`${clienteId}/`)) throw new Error('Caminho de arquivo inválido.')
  const registro = {
    caminho,
    cliente_id: clienteId,
    tipo: tipoDocumento(tipo),
    validade: /^\d{4}-\d{2}-\d{2}$/.test(validade || '') ? validade : null,
  }
  const mes = competenciaValida(competencia)
  if (mes) registro.competencia = mes
  const { error } = await createAdminClient().from('documentos_info').upsert(registro)
  if (error) throw new Error(/competencia/.test(error.message) ? 'Rode o supabase/007_arquivos_do_mes.sql para usar o mês de referência.' : error.message)
}

// Guia de imposto paga / não paga (aparece assim para o cliente).
export async function marcarGuiaPaga(formData) {
  const caminho = String(formData.get('caminho'))
  const clienteId = caminho.split('/')[0]
  await exigirAcessoCliente(clienteId)
  const paga = formData.get('paga') === 'sim'
  const { error } = await createAdminClient()
    .from('documentos_info')
    .update({ paga, paga_em: paga ? new Date().toISOString() : null })
    .eq('caminho', caminho)
    .eq('cliente_id', clienteId)
  if (error) throw new Error(/paga/.test(error.message) ? 'Rode o supabase/008_guias.sql para marcar guias como pagas.' : error.message)
  revalidatePath(`/admin/clientes/${clienteId}`)
  revalidatePath('/cliente')
}

export async function excluirDocumento(formData) {
  await exigirAcessoCliente(String(formData.get('caminho')).split('/')[0])
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
  
  const id = String(formData.get('id'))
  await exigirAcessoCliente(id)
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
  
  const id = String(formData.get('id'))
  await exigirAcessoCliente(id)
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
  await exigirAcessoAoRegistro('pedidos_nota', String(formData.get('id')))
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
  await exigirAcessoAoRegistro('pedidos_nota', String(formData.get('id')))
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
  await exigirAcessoAoRegistro('notas_emitidas', String(formData.get('id')))
  const id = String(formData.get('id'))
  const supabase = createAdminClient()
  const { data } = await supabase.from('notas_emitidas').delete().eq('id', id).select('cliente_id').single()
  if (data) revalidatePath(`/admin/clientes/${data.cliente_id}`)
}

// WhatsApp do cliente: usado no botão "Enviar pelo WhatsApp" das cobranças e repassado ao Asaas.
export async function salvarWhatsapp(_estado, formData) {
  
  const id = String(formData.get('id'))
  await exigirAcessoCliente(id)
  const digitado = String(formData.get('telefone') || '').trim()
  const numero = numeroWhatsapp(digitado)
  if (digitado && !numero) return { erro: 'Número inválido. Use DDD + número, ex.: (71) 99999-9999.' }
  const telefone = numero ? numero.slice(2) : null
  const supabase = createAdminClient()
  const { data: cliente, error } = await supabase
    .from('clientes')
    .update({ telefone })
    .eq('id', id)
    .select('asaas_customer_id')
    .single()
  if (error) return { erro: 'Não foi possível salvar o número agora.' }
  if (cliente?.asaas_customer_id && telefone) {
    try {
      await atualizarClienteAsaas(cliente.asaas_customer_id, { mobilePhone: telefone })
    } catch (e) {
      console.error('Asaas não atualizou o celular:', e.message)
    }
  }
  revalidatePath(`/admin/clientes/${id}`)
  return { ok: telefone ? 'Número salvo.' : 'Número removido.' }
}

export async function salvarDadosInternos(formData) {
  
  const id = String(formData.get('id'))
  await exigirAcessoCliente(id)
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
  
  const id = String(formData.get('id'))
  await exigirAcessoCliente(id)
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
  
  const id = String(formData.get('id'))
  await exigirAcessoCliente(id)
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
  await exigirAcessoCliente(String(formData.get('cliente_id') || ''))
  const clienteId = String(formData.get('cliente_id'))
  const servico = {
    cliente_id: clienteId,
    nome: String(formData.get('nome') || '').trim().slice(0, 120),
    cod_trib_nac: somenteNumeros(formData.get('cod_trib_nac')),
    cod_nbs: somenteNumeros(formData.get('cod_nbs')) || null,
    cod_trib_mun: somenteNumeros(formData.get('cod_trib_mun')).slice(0, 3) || null,
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
  await exigirAcessoAoRegistro('servicos_nota', String(formData.get('id')))
  const { data } = await createAdminClient()
    .from('servicos_nota')
    .delete()
    .eq('id', String(formData.get('id')))
    .select('cliente_id')
    .single()
  if (data) revalidarCliente(data.cliente_id)
}

export async function buscarNotasAnteriores(_estado, formData) {
  
  const id = String(formData.get('id'))
  await exigirAcessoCliente(id)
  try {
    const r = await importarNotasAnteriores(createAdminClient(), id)
    revalidarCliente(id)
    const detalhe = r.notas
      ? ''
      : ` O Emissor Nacional devolveu ${r.documentos} documento(s), ${r.nfse} nota(s)${r.comoTomador ? `, ${r.comoTomador} em que o cliente é tomador` : ''}. Notas emitidas no sistema da prefeitura antes do Emissor Nacional não aparecem aqui.`
    return { ok: `${r.notas} nota(s) anteriores importadas e lançadas no gráfico dos meses${r.arquivos ? `, ${r.arquivos} com PDF e XML salvos para baixar` : ''}${r.faltamPdfs ? ` (faltam ${r.faltamPdfs} PDF(s): clique de novo para continuar)` : ''}${r.canceladas ? ` (${r.canceladas} cancelada(s) ignorada(s))` : ''}${r.servicosNovos ? `, ${r.servicosNovos} serviço(s) novo(s) cadastrado(s) — confira os códigos` : ''}.${detalhe}` }
  } catch (e) {
    return { erro: e.message }
  }
}

// Escolhe (ou troca) o serviço do pedido e, se pedido, já emite.
export async function escolherServicoEEmitir(_estado, formData) {
  await exigirAcessoAoRegistro('pedidos_nota', String(formData.get('id')))
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
  let resultado = { ok: `Serviço definido: ${servico.nome.replace(/\.+$/, '')}.` }
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

// Pedido de nota criado pelo escritório (sem o cliente entrar no portal). Não emite sozinho:
// o pedido aparece na lista com o botão "Emitir NFS-e".
export async function pedirNotaPeloEscritorio(_estado, formData) {
  await exigirAcessoCliente(String(formData.get('cliente_id') || ''))
  const clienteId = String(formData.get('cliente_id') || '')
  if (!clienteId) return { erro: 'Cliente não informado.' }
  const r = await criarPedido(createAdminClient(), clienteId, formData, { servicoId: String(formData.get('servico_id') || '') || undefined })
  if (r.erro) return { erro: r.erro }
  revalidatePath('/admin')
  revalidatePath(`/admin/clientes/${clienteId}`)
  revalidatePath('/cliente')
  return { ok: 'Pedido criado. Ele aparece em "Pedidos de nota fiscal" com o botão Emitir NFS-e.' }
}

// Abre a Área do Cliente como se fosse o cliente, para testar (nada é enviado de verdade).
export async function entrarComoCliente(formData) {
  const id = String(formData.get('cliente_id') || '')
  await exigirAcessoCliente(id)
  ;(await cookies()).set(COOKIE_VER_COMO, id, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 2 * 60 * 60 })
  redirect('/cliente')
}

export async function sairDoModoCliente() {
  const store = await cookies()
  const id = store.get(COOKIE_VER_COMO)?.value
  store.delete(COOKIE_VER_COMO)
  redirect(id ? `/admin/clientes/${id}` : '/admin')
}

// Mostra no formulário do escritório qual código a nota vai usar, pela descrição digitada.
export async function sugerirServicoEscritorio(clienteId, descricao) {
  await exigirAcessoCliente(String(clienteId || ''))
  const r = await sugerirServicoDoPedido(createAdminClient(), String(clienteId), String(descricao || '').slice(0, 1000))
  return resumoSugestao(r)
}

// Botão do /admin: baixa agora as notas novas de todos os clientes com certificado.
export async function atualizarNotasTodos() {
  await exigirAdmin()
  try {
    const r = await atualizarNotasDeTodos(createAdminClient())
    revalidatePath('/admin', 'layout')
    return { ok: resumoAtualizacao(r) }
  } catch (e) {
    return { erro: e.message }
  }
}

function resumoAtualizacao(r) {
  const partes = [`${r.atualizados.length} cliente(s) atualizados`]
  if (r.erros.length) partes.push(`erro em: ${r.erros.map((e) => `${e.nome} (${e.erro})`).join('; ')}`)
  if (r.vencidos.length) partes.push(`certificado vencido: ${r.vencidos.join(', ')}`)
  if (r.semCertificado.length) partes.push(`sem certificado: ${r.semCertificado.join(', ')}`)
  return `${partes.join('. ')}.`
}

export async function conferirCodigos(_estado, formData) {
  await exigirAcessoCliente(String(formData.get('id')))
  try {
    const linhas = await conferirCodigosNoMunicipio(createAdminClient(), String(formData.get('id')))
    return { linhas }
  } catch (e) {
    return { erro: e.message }
  }
}

// Cadastra o serviço sugerido para um CNAE do cartão do CNPJ.
export async function criarServicoDoCnae(formData) {
  await exigirAcessoCliente(String(formData.get('cliente_id') || ''))
  const clienteId = String(formData.get('cliente_id'))
  const cod = somenteNumeros(formData.get('cod'))
  if (!clienteId || cod.length !== 6) return
  await createAdminClient()
    .from('servicos_nota')
    .upsert(
      { cliente_id: clienteId, cod_trib_nac: cod, nome: String(formData.get('nome') || `Serviço ${cod}`).slice(0, 120), palavras_chave: String(formData.get('palavras') || '').slice(0, 300) || null },
      { onConflict: 'cliente_id,cod_trib_nac', ignoreDuplicates: true },
    )
  revalidarCliente(clienteId)
}
