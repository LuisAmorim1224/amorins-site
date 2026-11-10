import { isoDe, TIPOS_DOCUMENTO } from '@/lib/ficha'
import { nomeCompetencia } from '@/lib/arquivos-mes'
import { dataBR, tamanho } from '@/lib/formato'
import { hojeNaBahia } from '@/lib/vencimento'

export default function Documentos({ documentos, excluir }) {
  if (!documentos.length) return <p className="vazio">Nenhum documento disponível ainda.</p>
  const hoje = isoDe(hojeNaBahia())
  return (
    <ul className="lista">
      {documentos.map((d) => (
        <li key={d.caminho}>
          <div>
            <a href={d.url}>{d.nome}</a>
            <div className="info">
              {d.competencia && `Arquivos do mês: ${nomeCompetencia(d.competencia)} · `}
              {d.tipo && d.tipo !== 'outro' && `${TIPOS_DOCUMENTO[d.tipo] || d.tipo} · `}
              {dataBR(d.data)} {d.tamanho ? `· ${tamanho(d.tamanho)}` : ''}
              {d.validade && (
                <>
                  {' · '}
                  <span className={d.validade < hoje ? 'erro' : ''}>
                    {d.validade < hoje ? 'venceu em' : 'válido até'} {dataBR(d.validade)}
                  </span>
                </>
              )}
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
