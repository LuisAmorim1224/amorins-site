// Links para baixar o espelho (PDF) e o XML de uma nota, a partir dos documentos do cliente.
export default function LinksNota({ nota, documentos = [] }) {
  const porCaminho = new Map(documentos.map((d) => [d.caminho, d]))
  const pdf = nota.caminho_arquivo && nota.caminho_arquivo !== nota.caminho_xml ? porCaminho.get(nota.caminho_arquivo) : null
  const xml = nota.caminho_xml ? porCaminho.get(nota.caminho_xml) : null
  const outro = !pdf && !xml && nota.caminho_arquivo ? porCaminho.get(nota.caminho_arquivo) : null
  if (!pdf && !xml && !outro) return null
  return (
    <div className="info">
      {pdf && <a href={pdf.url} style={{ marginRight: 12 }}>Baixar nota (PDF)</a>}
      {xml && <a href={xml.url} style={{ marginRight: 12 }}>XML</a>}
      {outro && <a href={outro.url}>Baixar arquivo da nota</a>}
    </div>
  )
}
