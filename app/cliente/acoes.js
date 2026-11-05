'use server'

import { revalidatePath } from 'next/cache'
import { exigirCliente } from '@/lib/auth'
import { nomeSeguro, PASTA } from '@/lib/documentos'
import { tipoDocumento } from '@/lib/ficha'
import { createAdminClient } from '@/lib/supabase/admin'

const somenteNumeros = (texto) => String(texto || '').replace(/\D/g, '')
const texto = (v, max = 500) => String(v || '').trim().slice(0, max)
const valorEmReais = (v) => {
  const s = String(v || '').trim().replace(/\s|R\$/g, '')
  // Aceita "1.234,56", "1234,56" e "1234.56".
  const normalizado = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(normalizado)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}
const dataValida = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? v : null)

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
  const pedido = {
    cliente_id: user.id,
    tomador_documento: somenteNumeros(formData.get('tomador_documento')),
    tomador_nome: texto(formData.get('tomador_nome'), 200),
    tomador_email: texto(formData.get('tomador_email'), 200).toLowerCase() || null,
    tomador_endereco: texto(formData.get('tomador_endereco'), 300) || null,
    descricao: texto(formData.get('descricao'), 2000),
    valor: valorEmReais(formData.get('valor')),
    data_desejada: dataValida(formData.get('data_desejada')),
    iss_retido: formData.get('iss_retido') === 'sim',
    observacoes: texto(formData.get('observacoes'), 1000) || null,
  }
  if (![11, 14].includes(pedido.tomador_documento.length)) return { erro: 'Informe o CPF (11 números) ou CNPJ (14 números) de quem vai receber a nota.' }
  if (!pedido.tomador_nome) return { erro: 'Informe o nome ou a razão social de quem vai receber a nota.' }
  if (!pedido.descricao) return { erro: 'Descreva o serviço ou produto da nota.' }
  if (!(pedido.valor > 0)) return { erro: 'Informe o valor da nota (ex.: 1.500,00).' }

  const { error } = await createAdminClient().from('pedidos_nota').insert(pedido)
  if (error) {
    console.error('Erro ao salvar pedido de nota:', error)
    return { erro: 'Não foi possível enviar o pedido agora. Tente de novo.' }
  }
  revalidatePath('/cliente')
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
