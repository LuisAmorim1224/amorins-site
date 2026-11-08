import { getDocumentProxy } from 'unpdf'

// Extrai o texto de um PDF linha a linha (agrupando os pedaços pela altura na página),
// para o resumo do relatório de situação fiscal conseguir achar os títulos das seções.
export async function textoDoPdf(buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const paginas = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const pagina = await pdf.getPage(n)
    const { items } = await pagina.getTextContent()
    const linhas = new Map()
    for (const item of items) {
      if (!item.str) continue
      const y = Math.round(item.transform[5])
      const chave = [...linhas.keys()].find((k) => Math.abs(k - y) <= 2) ?? y
      if (!linhas.has(chave)) linhas.set(chave, [])
      linhas.get(chave).push({ x: item.transform[4], texto: item.str })
    }
    const ordenadas = [...linhas.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, partes]) => partes.sort((a, b) => a.x - b.x).map((p) => p.texto).join(' ').replace(/\s+/g, ' ').trim())
    paginas.push(ordenadas.filter(Boolean).join('\n'))
  }
  return paginas.join('\n')
}
