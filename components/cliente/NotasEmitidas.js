'use client'

import { useState, useTransition } from 'react'
import { excluirNotaLancada, lancarNota } from '@/app/cliente/acoes'
import { enviarArquivoDoCliente } from '@/components/cliente/EnviarParaEscritorio'
import { dataBR, reais } from '@/lib/formato'
import LinksNota from '@/components/cliente/LinksNota'

// `podeLancar`: só para quem NÃO emite pelo portal. Quem emite pelo portal pede a nota em
// "Emitir nota fiscal" e as notas entram aqui sozinhas (o site busca no Emissor Nacional todo dia).
export default function NotasEmitidas({ notas, documentos = [], podeLancar = true }) {
  const [mensagem, setMensagem] = useState(null)
  const [salvando, iniciar] = useTransition()

  function salvar(evento) {
    evento.preventDefault()
    const formulario = evento.currentTarget
    const dados = new FormData(formulario)
    const arquivo = formulario.arquivo.files[0]
    setMensagem(null)
    iniciar(async () => {
      try {
        if (arquivo) dados.set('caminho_arquivo', await enviarArquivoDoCliente(arquivo, 'nota_fiscal'))
      } catch (e) {
        setMensagem({ erro: `Não foi possível enviar o arquivo: ${e?.message || 'tente de novo'}.` })
        return
      }
      dados.delete('arquivo')
      const resultado = await lancarNota({}, dados)
      setMensagem(resultado)
      if (resultado.ok) formulario.reset()
    })
  }

  return (
    <div className="formulario">
      {podeLancar && (
      <form onSubmit={salvar} className="formulario">
        <p className="vazio">Emitiu uma nota por conta própria? Lance aqui para entrar na prévia de impostos.</p>
        <div className="duas">
          <label>
            Data de emissão
            <input type="date" name="data_emissao" required />
          </label>
          <label>
            Valor (R$)
            <input name="valor" required inputMode="decimal" placeholder="1.500,00" />
          </label>
          <label>
            Número da nota (opcional)
            <input name="numero" />
          </label>
          <label>
            Cliente / tomador (opcional)
            <input name="tomador" />
          </label>
        </div>
        <label>
          PDF ou XML da nota (opcional)
          <input type="file" name="arquivo" accept=".pdf,.xml,application/pdf,text/xml,application/xml" />
        </label>
        {mensagem?.erro && <p className="erro">{mensagem.erro}</p>}
        {mensagem?.ok && <p className="ok">{mensagem.ok}</p>}
        <div>
          <button disabled={salvando}>{salvando ? 'Salvando...' : 'Lançar nota'}</button>
        </div>
      </form>
      )}

      {notas.length ? (
        <ul className="lista">
          {notas.map((n) => (
            <li key={n.id}>
              <div>
                <strong>{reais(n.valor)}</strong> · {dataBR(n.data_emissao)}
                <div className="info">
                  {n.numero ? `Nota nº ${n.numero}` : 'Sem número'}
                  {n.tomador && ` · ${n.tomador}`}
                  {n.lancada_por === 'escritorio' ? ' · emitida pelo escritório' : ' · lançada por você'}
                </div>
                <LinksNota nota={n} documentos={documentos} />
              </div>
              {n.lancada_por === 'cliente' && (
                <form action={excluirNotaLancada}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="perigo">Excluir</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="vazio">Nenhuma nota lançada ainda.</p>
      )}
    </div>
  )
}
