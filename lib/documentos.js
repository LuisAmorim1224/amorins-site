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

  return arquivos.map((a, i) => ({
    nome: a.name,
    caminho: caminhos[i],
    tamanho: a.metadata?.size,
    data: a.created_at,
    url: links[i]?.signedUrl,
  }))
}

// O armazenamento não aceita acentos e alguns símbolos no nome do arquivo.
export function nomeSeguro(nome) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.\- ]+/g, '_')
    .trim()
}
