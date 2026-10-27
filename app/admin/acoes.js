'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { criarAssinatura, criarClienteAsaas } from '@/lib/asaas'
import { exigirAdmin } from '@/lib/auth'
import { nomeSeguro, PASTA } from '@/lib/documentos'
import { createAdminClient } from '@/lib/supabase/admin'

const somenteNumeros = (texto) => String(texto || '').replace(/\D/g, '')

export async function cadastrarCliente(_estado, formData) {
  await exigirAdmin()
  const dados = {
    nome: String(formData.get('nome')).trim(),
    email: String(formData.get('email')).trim().toLowerCase(),
    cpf_cnpj: somenteNumeros(formData.get('cpf_cnpj')),
    telefone: somenteNumeros(formData.get('telefone')) || null,
    valor_honorario: Number(String(formData.get('valor') || '0').replace(',', '.')) || null,
    dia_vencimento: Number(formData.get('dia')) || null,
  }
  const senha = String(formData.get('senha'))

  if (!dados.nome || !dados.email) return { erro: 'Preencha nome e e-mail.' }
  if (senha.length < 8) return { erro: 'A senha inicial precisa ter pelo menos 8 caracteres.' }
  if (![11, 14].includes(dados.cpf_cnpj.length)) return { erro: 'Informe um CPF (11 números) ou CNPJ (14 números).' }
  if (dados.valor_honorario && !(dados.dia_vencimento >= 1 && dados.dia_vencimento <= 28)) {
    return { erro: 'O dia de vencimento precisa ser entre 1 e 28.' }
  }

  const supabase = createAdminClient()
  const { data: criado, error: erroUsuario } = await supabase.auth.admin.createUser({
    email: dados.email,
    password: senha,
    email_confirm: true,
  })
  if (erroUsuario) {
    return { erro: `Não foi possível criar o acesso: ${erroUsuario.message}` }
  }

  const cliente = { id: criado.user.id, ...dados }
  const { error: erroCadastro } = await supabase.from('clientes').insert(cliente)
  if (erroCadastro) {
    await supabase.auth.admin.deleteUser(cliente.id)
    return { erro: `Não foi possível salvar o cadastro: ${erroCadastro.message}` }
  }

  if (cliente.valor_honorario) {
    try {
      await ativarCobranca(supabase, cliente)
    } catch (e) {
      revalidatePath('/admin')
      return {
        erro: `O cliente foi cadastrado, mas a cobrança no Asaas falhou: ${e.message} Abra o cliente para tentar de novo.`,
      }
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
    diaVencimento: cliente.dia_vencimento,
  })
  await supabase.from('clientes').update({ asaas_subscription_id: assinatura.id }).eq('id', cliente.id)
}

export async function tentarCobrancaDeNovo(formData) {
  await exigirAdmin()
  const id = String(formData.get('id'))
  const supabase = createAdminClient()
  const { data: cliente } = await supabase.from('clientes').select('*').eq('id', id).single()
  if (cliente && cliente.valor_honorario && !cliente.asaas_subscription_id) {
    await ativarCobranca(supabase, cliente)
  }
  revalidatePath(`/admin/clientes/${id}`)
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

export async function excluirDocumento(formData) {
  await exigirAdmin()
  const caminho = String(formData.get('caminho'))
  await createAdminClient().storage.from(PASTA).remove([caminho])
  revalidatePath(`/admin/clientes/${caminho.split('/')[0]}`)
}
