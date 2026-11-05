'use client'

import { useState } from 'react'
import { TIPOS_DOCUMENTO } from '@/lib/ficha'
import { createClient } from '@/lib/supabase/browser'
import { atualizarDocumentos, autorizarEnvio, registrarDocumento } from '../../acoes'

export default function EnviarDocumentos({ clienteId }) {
  const [mensagem, setMensagem] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    const formulario = evento.currentTarget
    const arquivos = Array.from(formulario.arquivos.files)
    const tipo = formulario.tipo.value
    const validade = formulario.validade.value
    if (!arquivos.length) return
    setEnviando(true)
    setMensagem(null)
    const supabase = createClient()
    const falhas = []
    for (const arquivo of arquivos) {
      try {
        const { caminho, token } = await autorizarEnvio(clienteId, arquivo.name)
        const { error } = await supabase.storage.from('documentos').uploadToSignedUrl(caminho, token, arquivo)
        if (error) throw error
        try {
          await registrarDocumento(clienteId, caminho, tipo, validade)
        } catch (e) {
          // O arquivo já está na pasta; só não ficou classificado (ex.: migração 002 não rodada).
          console.error('Não foi possível salvar tipo/validade:', e)
        }
      } catch {
        falhas.push(arquivo.name)
      }
    }
    await atualizarDocumentos(clienteId)
    formulario.reset()
    setEnviando(false)
    setMensagem(
      falhas.length
        ? { erro: `Não foi possível enviar: ${falhas.join(', ')}` }
        : { ok: `${arquivos.length} arquivo(s) enviado(s).` }
    )
  }

  return (
    <form onSubmit={enviar} className="formulario">
      <input type="file" name="arquivos" multiple required />
      <div className="duas">
        <label>
          Tipo do documento
          <select name="tipo" defaultValue="outro">
            {Object.entries(TIPOS_DOCUMENTO).map(([valor, nome]) => (
              <option key={valor} value={valor}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Validade (opcional)
          <input type="date" name="validade" />
        </label>
      </div>
      {mensagem?.erro && <p className="erro">{mensagem.erro}</p>}
      {mensagem?.ok && <p className="ok">{mensagem.ok}</p>}
      <div>
        <button disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar documentos'}</button>
      </div>
    </form>
  )
}
