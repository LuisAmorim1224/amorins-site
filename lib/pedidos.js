import { sugerirServicoDoPedido } from '@/lib/nfse'

const somenteNumeros = (texto) => String(texto || '').replace(/\D/g, '')
const texto = (v, max = 500) => String(v || '').trim().slice(0, max)
export const valorEmReais = (v) => {
  const s = String(v || '').trim().replace(/\s|R\$/g, '')
  // Aceita "1.234,56", "1234,56" e "1234.56".
  const normalizado = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(normalizado)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}
export const dataValida = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? v : null)

// Grava um pedido de nota (feito pelo cliente ou pelo escritório).
// `servicoId`: serviço já escolhido pelo escritório; sem ele, o sistema sugere pelas notas anteriores.
// Devolve { erro } ou { id, cliente, servico }.
export async function criarPedido(supabase, clienteId, formData, { servicoId } = {}) {
  const pedido = {
    cliente_id: clienteId,
    tomador_documento: somenteNumeros(formData.get('tomador_documento')),
    tomador_nome: texto(formData.get('tomador_nome'), 200),
    tomador_email: texto(formData.get('tomador_email'), 200).toLowerCase() || null,
    tomador_endereco: texto(formData.get('tomador_endereco'), 300) || null,
    descricao: texto(formData.get('descricao'), 2000),
    valor: valorEmReais(formData.get('valor')),
    data_desejada: dataValida(formData.get('data_desejada')),
    iss_retido: formData.get('iss_retido') === 'sim',
    observacoes: texto(formData.get('observacoes'), 1000) || null,
    obra_cep: somenteNumeros(formData.get('obra_cep')) || null,
    obra_logradouro: texto(formData.get('obra_logradouro'), 200) || null,
    obra_numero: texto(formData.get('obra_numero'), 20) || null,
    obra_bairro: texto(formData.get('obra_bairro'), 100) || null,
  }
  if (![11, 14].includes(pedido.tomador_documento.length)) return { erro: 'Informe o CPF (11 números) ou CNPJ (14 números) de quem vai receber a nota.' }
  if (!pedido.tomador_nome) return { erro: 'Informe o nome ou a razão social de quem vai receber a nota.' }
  if (!pedido.descricao) return { erro: 'Descreva o serviço ou produto da nota.' }
  if (!(pedido.valor > 0)) return { erro: 'Informe o valor da nota (ex.: 1.500,00).' }
  if (pedido.obra_cep && pedido.obra_cep.length !== 8) return { erro: 'O CEP da obra tem 8 números.' }

  const { data: cliente } = await supabase
    .from('clientes')
    .select('nfse_ativa, nfse_emissao_automatica')
    .eq('id', clienteId)
    .single()

  // Escolhe o código de serviço pelas notas anteriores; se não der para ter certeza,
  // o pedido fica esperando o escritório escolher.
  let sugestao = { servico: null, motivo: null }
  if (servicoId) {
    const { data: servico } = await supabase.from('servicos_nota').select('*').eq('id', servicoId).eq('cliente_id', clienteId).maybeSingle()
    if (!servico) return { erro: 'Serviço não encontrado para este cliente.' }
    sugestao = { servico, motivo: 'Escolhido pelo escritório.' }
  } else if (cliente?.nfse_ativa) {
    try {
      sugestao = await sugerirServicoDoPedido(supabase, clienteId, pedido.descricao)
    } catch (e) {
      console.error('Erro ao sugerir serviço:', e)
    }
  }
  // Sem cliente aqui, a migração 005 ainda não rodou: grava o pedido só com os campos antigos.
  const { obra_cep, obra_logradouro, obra_numero, obra_bairro, ...basico } = pedido
  const registro = cliente
    ? {
        ...pedido,
        servico_id: sugestao.servico?.id || null,
        motivo_servico: sugestao.motivo,
        status: cliente.nfse_ativa && !sugestao.servico ? 'escolher_servico' : 'pendente',
      }
    : basico
  const { data: criado, error } = await supabase.from('pedidos_nota').insert(registro).select('id').single()
  if (error) {
    console.error('Erro ao salvar pedido de nota:', error)
    return { erro: 'Não foi possível enviar o pedido agora. Tente de novo.' }
  }
  return { id: criado.id, cliente, servico: sugestao.servico }
}
