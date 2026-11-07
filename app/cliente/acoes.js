'use server'

import { revalidatePath } from 'next/cache'
import { exigirCliente } from '@/lib/auth'
import { nomeSeguro, PASTA } from '@/lib/documentos'
import { tipoDocumento } from '@/lib/ficha'
import { createAdminClient } from '@/lib/supabase/admin'
import { emitirPedido } from '@/lib/nfse'
import { criarPedido, dataValida, valorEmReais } from '@/lib/pedidos'

const texto = (v, max = 500) => String(v || '').trim().slice(0, max)

// ---------- Envio de documentos pelo cliente ----------

// Autoriza o navegador a enviar o arquivo direto para a pasta do próprio cliente.
export async function autorizarEnvioCliente(nomeArquivo) {
  const user = await exigirCliente()
  const caminho = `${user.id}/${nomeSeguro(nomeArquivo)}`
  const { data, error } = await createAdminClient().storage.from(PASTA).createSignedUploadUrl(caminho, { upsert: false })
  if (error) throw new Error(error.message.includes('exists') ? 'Já existe um arquivo com esse nome.' : error.message)
  return { caminho: data.path, token: data.token }
}

export async function registrarEnvioCliente(caminho, tipo) {
  const user = await exigirCliente()
  if (!caminho.startsWith(`${user.id}/`)) throw new Error('Caminho de arquivo inválido.')
  await createAdminClient()
    .from('documentos_info')
    .upsert({ caminho, cliente_id: user.id, tipo: tipoDocumento(tipo), origem: 'cliente' })
  revalidatePath('/cliente')
}

// ---------- Pedido de nota fiscal ----------

export async function pedirNota(_estado, formData) {
  const user = await exigirCliente()
  const supabase = createAdminClient()
  const r = await criarPedido(supabase, user.id, formData)
  if (r.erro) return { erro: r.erro }

  if (r.cliente?.nfse_ativa && r.cliente.nfse_emissao_automatica && r.servico) {
    const e = await emitirPedido(supabase, r.id).catch((err) => ({ erro: err.message }))
    revalidatePath('/cliente')
    revalidatePath('/admin')
    if (e.ok) return { ok: 'Nota emitida! O PDF e o XML já estão nos seus documentos.' }
    return { ok: 'Pedido enviado! O escritório vai conferir e emitir a nota.' }
  }
  revalidatePath('/cliente')
  revalidatePath('/admin')
  return { ok: 'Pedido enviado! O escritório vai emitir a nota e ela aparece aqui em "Notas fiscais".' }
}

// ---------- Notas emitidas lançadas pelo cliente ----------

export async function lancarNota(_estado, formData) {
  const user = await exigirCliente()
  const nota = {
    cliente_id: user.id,
    numero: texto(formData.get('numero'), 50) || null,
    data_emissao: dataValida(formData.get('data_emissao')),
    valor: valorEmReais(formData.get('valor')),
    tomador: texto(formData.get('tomador'), 200) || null,
    caminho_arquivo: texto(formData.get('caminho_arquivo'), 400) || null,
    lancada_por: 'cliente',
  }
  if (!nota.data_emissao) return { erro: 'Informe a data de emissão da nota.' }
  if (!(nota.valor > 0)) return { erro: 'Informe o valor da nota (ex.: 1.500,00).' }
  if (nota.caminho_arquivo && !nota.caminho_arquivo.startsWith(`${user.id}/`)) nota.caminho_arquivo = null

  const { error } = await createAdminClient().from('notas_emitidas').insert(nota)
  if (error) {
    console.error('Erro ao lançar nota:', error)
    return { erro: 'Não foi possível salvar a nota agora. Tente de novo.' }
  }
  revalidatePath('/cliente')
  return { ok: 'Nota lançada. A prévia de impostos já foi atualizada.' }
}

export async function excluirNotaLancada(formData) {
  const user = await exigirCliente()
  // O cliente só apaga notas que ele mesmo lançou.
  await createAdminClient()
    .from('notas_emitidas')
    .delete()
    .eq('id', String(formData.get('id')))
    .eq('cliente_id', user.id)
    .eq('lancada_por', 'cliente')
  revalidatePath('/cliente')
}
