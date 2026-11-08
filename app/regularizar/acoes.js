'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { buscarCnpj, cnpjValido } from '@/lib/cnpj'
import { diagnosticar, validarPedido } from '@/lib/diagnostico'
import { processarRelatorio } from '@/lib/diagnosticos'
import { createAdminClient } from '@/lib/supabase/admin'

const somenteNumeros = (t) => String(t || '').replace(/\D/g, '')

// Passo 1: diagnóstico parcial com os dados públicos. Nada é gravado.
export async function consultarCnpj(_estado, formData) {
  const cnpj = somenteNumeros(formData.get('cnpj'))
  if (!cnpjValido(cnpj)) return { erro: 'Confira o CNPJ: os números não batem.' }
  try {
    const dados = await buscarCnpj(cnpj)
    const { empresa, alertas, nivel } = diagnosticar(dados)
    return { cnpj, empresa, alertas, nivel }
  } catch (e) {
    return { erro: e.message || 'Não foi possível consultar o CNPJ agora. Tente de novo em instantes.' }
  }
}

// Passo 2: o visitante deixa o contato e pede o diagnóstico completo.
export async function pedirDiagnosticoCompleto(_estado, formData) {
  const cnpj = somenteNumeros(formData.get('cnpj'))
  if (!cnpjValido(cnpj)) return { erro: 'CNPJ inválido. Comece de novo.' }
  const { erro, robo, registro } = validarPedido(Object.fromEntries(formData))
  if (erro) return { erro }
  if (robo) return { erro: 'Não foi possível enviar.' }

  let dados
  try {
    dados = await buscarCnpj(cnpj)
  } catch (e) {
    return { erro: e.message }
  }
  const { empresa, alertas } = diagnosticar(dados)
  const token = randomBytes(18).toString('base64url')
  const { error } = await createAdminClient().from('diagnosticos').insert({
    token,
    cnpj,
    razao_social: empresa.razao_social,
    dados_publicos: dados,
    alertas,
    ...registro,
    consentimento_em: new Date().toISOString(),
  })
  if (error) {
    console.error('Erro ao salvar diagnóstico:', error)
    return { erro: 'Não foi possível registrar agora. Tente de novo ou chame no WhatsApp.' }
  }
  redirect(`/regularizar/${token}`)
}

// Passo 3: com a procuração feita, o próprio visitante pede o relatório.
export async function gerarMeuRelatorio(_estado, formData) {
  const token = String(formData.get('token') || '')
  const supabase = createAdminClient()
  const { data: diag } = await supabase.from('diagnosticos').select('*').eq('token', token).maybeSingle()
  if (!diag) return { erro: 'Pedido não encontrado.' }
  if (diag.status === 'relatorio_pronto' || diag.status === 'concluido') {
    revalidatePath(`/regularizar/${token}`)
    return {}
  }
  const resultado = await processarRelatorio(supabase, diag)
  revalidatePath(`/regularizar/${token}`)
  return resultado.ok ? {} : { erro: resultado.erro }
}
