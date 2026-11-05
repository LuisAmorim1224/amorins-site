export const PASTA = 'documentos'

// Lista os arquivos da pasta do cliente com links de download válidos por 1 hora.
export async function listarDocumentos(supabase, clienteId) {
  const { data, error } = await supabase.storage
    .from(PASTA)
    .list(clienteId, { sortBy: { column: 'created_at', order: 'desc' } })
  if (error) throw error
  const arquivos = data.filter((a) => a.id)
  if (!arquivos.length) return []

  const caminhos = arquivos.map((a) => `${clienteId}/${a.name}`)
  const { data: links, error: erroLinks } = await supabase.storage
    .from(PASTA)
    .createSignedUrls(caminhos, 3600, { download: true })
  if (erroLinks) throw erroLinks

  const info = await informacoesDosDocumentos(supabase, clienteId)

  return arquivos.map((a, i) => ({
    nome: a.name,
    caminho: caminhos[i],
    tamanho: a.metadata?.size,
    data: a.created_at,
    url: links[i]?.signedUrl,
    tipo: info[caminhos[i]]?.tipo || 'outro',
    validade: info[caminhos[i]]?.validade || null,
    origem: info[caminhos[i]]?.origem || 'escritorio',
  }))
}

// Tipo e validade de cada arquivo. Se a tabela ainda não existir (migração 002 não rodada),
// os documentos aparecem como "Outro", sem quebrar a página.
async function informacoesDosDocumentos(supabase, clienteId) {
  const { data, error } = await supabase
    .from('documentos_info')
    .select('caminho, tipo, validade, origem')
    .eq('cliente_id', clienteId)
  if (error) {
    console.error('Não foi possível ler documentos_info:', error.message)
    return {}
  }
  return Object.fromEntries(data.map((d) => [d.caminho, d]))
}

// O armazenamento não aceita acentos e alguns símbolos no nome do arquivo.
export function nomeSeguro(nome) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.\- ]+/g, '_')
    .trim()
}
