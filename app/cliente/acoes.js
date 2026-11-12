'use server'

import { revalidatePath } from 'next/cache'
import { exigirCliente } from '@/lib/auth'
import { nomeSeguro, PASTA } from '@/lib/documentos'
import { tipoDocumento } from '@/lib/ficha'
import { createAdminClient } from '@/lib/supabase/admin'
import { emitirPedido, sugerirServicoDoPedido } from '@/lib/nfse'
import { criarPedido, dataValida, valorEmReais } from '@/lib/pedidos'
import { resumoSugestao } from '@/lib/servicos'

const texto = (v, max = 500) => String(v || '').trim().slice(0, max)

// ---------- Envio de documentos pelo cliente ----------

// Autoriza o navegador a enviar o arquivo direto para a pasta do próprio cliente.
export async function autorizarEnvioCliente(nomeArquivo) {
  const user = await exigirCliente()
  if (user.teste) throw new Error('Modo teste: o arquivo não foi enviado.')
  const caminho = `${user.id}/${nomeSeguro(nomeArquivo)}`
  const { data, error } = await createAdminClient().storage.from(PASTA).createSignedUploadUrl(caminho, { upsert: false })
  if (error) throw new Error(error.message.includes('exists') ? 'Já existe um arquivo com esse nome.' : error.message)
  return { caminho: data.path, token: data.token }
}

export async function registrarEnvioCliente(caminho, tipo) {
  const user = await exigirCliente()
  if (user.teste) throw new Error('Modo teste: o arquivo não foi enviado.')
  if (!caminho.startsWith(`${user.id}/`)) throw new Error('Caminho de arquivo inválido.')
  await createAdminClient()
    .from('documentos_info')
    .upsert({ caminho, cliente_id: user.id, tipo: tipoDocumento(tipo), origem: 'cliente' })
  revalidatePath('/cliente')
}

// ---------- Pedido de nota fiscal ----------

// Mostra, enquanto o cliente digita, qual código de serviço a nota vai usar.
export async function sugerirServicoCliente(descricao) {
  const user = await exigirCliente()
  return resumoSugestao(await sugerirServicoDoPedido(createAdminClient(), user.id, texto(descricao, 1000)))
}

export async function pedirNota(_estado, formData) {
  const user = await exigirCliente()
  const supabase = createAdminClient()
  const r = await criarPedido(supabase, user.id, formData, { simular: user.teste })
  if (r.erro) return { erro: r.erro }
  if (r.simulado) return { ok: resumoSimulacao(r) }

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

function resumoSimulacao({ pedido, cliente, servico, motivo }) {
  const valor = Number(pedido.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const cod = servico ? `${servico.cod_trib_nac.replace(/^(\d{2})(\d{2})(\d{2})$/, '$1.$2.$3')} · ${servico.nome}` : 'sem código (o escritório escolheria)'
  const destino = !cliente?.nfse_ativa
    ? 'O escritório emitiria manualmente.'
    : cliente.nfse_emissao_automatica && servico
      ? `Seria emitida na hora, em ${cliente.nfse_ambiente === 'producao' ? 'PRODUÇÃO' : 'homologação'}.`
      : 'Ficaria esperando o escritório.'
  return `MODO TESTE, nada foi enviado. A nota sairia para ${pedido.tomador_nome}, valor ${valor}, código ${cod}. ${motivo || ''} ${destino}`
}

const NADA_ENVIADO = 'Modo teste: nada foi enviado.'

// ---------- Notas emitidas lançadas pelo cliente ----------

export async function lancarNota(_estado, formData) {
  const user = await exigirCliente()
  if (user.teste) return { ok: NADA_ENVIADO }
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
  if (user.teste) return
  // O cliente só apaga notas que ele mesmo lançou.
  await createAdminClient()
    .from('notas_emitidas')
    .delete()
    .eq('id', String(formData.get('id')))
    .eq('cliente_id', user.id)
    .eq('lancada_por', 'cliente')
  revalidatePath('/cliente')
}
