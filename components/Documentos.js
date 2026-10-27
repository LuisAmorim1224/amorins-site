import { dataBR, tamanho } from '@/lib/formato'

export default function Documentos({ documentos, excluir }) {
  if (!documentos.length) return <p className="vazio">Nenhum documento disponível ainda.</p>
  return (
    <ul className="lista">
      {documentos.map((d) => (
        <li key={d.caminho}>
          <div>
            <a href={d.url}>{d.nome}</a>
            <div className="info">
              {dataBR(d.data)} {d.tamanho ? `· ${tamanho(d.tamanho)}` : ''}
            </div>
          </div>
          {excluir && (
            <form action={excluir}>
              <input type="hidden" name="caminho" value={d.caminho} />
              <button className="perigo">Excluir</button>
            </form>
          )}
        </li>
      ))}
    </ul>
  )
}
