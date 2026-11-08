import 'server-only'
import { ErroIntegra, baixarRelatorioSituacaoFiscal, integraConfigurado } from '@/lib/integra-contador'
import { textoDoPdf } from '@/lib/pdf-texto'
import { orcar, resumirRelatorio } from '@/lib/situacao-fiscal'

export const PASTA_DIAGNOSTICOS = 'diagnosticos'

// Cada relatório é uma consulta paga ao Serpro: limita as tentativas do visitante.
export const MAX_TENTATIVAS = 5
const INTERVALO_MINIMO_MS = 2 * 60_000

export { integraConfigurado }

/**
 * Puxa o relatório de situação fiscal, guarda o PDF, resume as pendências e calcula o orçamento.
 * @param supabase cliente admin
 * @param diag linha da tabela diagnosticos
 * @param doEscritorio true quando o admin pede (sem limite de tentativas)
 * @returns { ok } ou { erro, codigo }
 */
export async function processarRelatorio(supabase, diag, { doEscritorio = false } = {}) {
  if (!integraConfigurado()) {
    return { erro: 'A consulta automática ainda não está ligada. O contador vai puxar o relatório e falar com você.', codigo: 'configuracao' }
  }
  if (!doEscritorio) {
    if (diag.tentativas >= MAX_TENTATIVAS) {
      return { erro: 'Limite de tentativas atingido. O contador vai verificar e falar com você pelo WhatsApp.', codigo: 'limite' }
    }
    const ultima = diag.ultima_tentativa_em ? new Date(diag.ultima_tentativa_em).getTime() : 0
    if (Date.now() - ultima < INTERVALO_MINIMO_MS) {
      return { erro: 'Aguarde dois minutos antes de tentar de novo. A procuração pode levar alguns minutos para valer.', codigo: 'espera' }
    }
  }
  await supabase
    .from('diagnosticos')
    .update({ tentativas: (diag.tentativas || 0) + 1, ultima_tentativa_em: new Date().toISOString() })
    .eq('id', diag.id)

  try {
    const pdf = await baixarRelatorioSituacaoFiscal(diag.cnpj)
    const caminho = `${diag.cnpj}/${new Date().toISOString().slice(0, 10)}-${diag.id}.pdf`
    const { error: erroUpload } = await supabase.storage
      .from(PASTA_DIAGNOSTICOS)
      .upload(caminho, pdf, { upsert: true, contentType: 'application/pdf' })
    if (erroUpload) throw new Error(`Não foi possível guardar o PDF: ${erroUpload.message}`)

    let resumo
    try {
      resumo = resumirRelatorio(await textoDoPdf(pdf))
    } catch (e) {
      console.error('Não foi possível ler o PDF do relatório:', e)
      resumo = { semPendencias: false, pendencias: [], lido: false }
    }
    let valor = null
    if (resumo.lido && resumo.pendencias.length) {
      const { data: precos } = await supabase.from('precos_regularizacao').select('*')
      valor = orcar(resumo.pendencias, precos).total
    }
    await supabase
      .from('diagnosticos')
      .update({
        status: 'relatorio_pronto',
        relatorio_caminho: caminho,
        resumo,
        valor,
        erro: null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', diag.id)
    return { ok: true }
  } catch (e) {
    const procuracao = e instanceof ErroIntegra && e.codigo === 'sem_procuracao'
    console.error('Erro no relatório de situação fiscal:', e)
    await supabase
      .from('diagnosticos')
      .update({
        status: procuracao ? 'aguardando_procuracao' : 'erro',
        erro: e.message.slice(0, 500),
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', diag.id)
    if (procuracao) {
      return {
        erro: 'A Receita ainda não mostra a procuração para a Amorins Contábil. Confira o passo a passo abaixo; depois de cadastrada, ela pode levar alguns minutos para valer.',
        codigo: 'sem_procuracao',
      }
    }
    return {
      erro: doEscritorio ? e.message : 'Não conseguimos puxar o relatório agora. O contador já foi avisado e vai falar com você pelo WhatsApp.',
      codigo: 'serpro',
    }
  }
}
