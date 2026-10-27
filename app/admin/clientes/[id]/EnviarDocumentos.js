'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { atualizarDocumentos, autorizarEnvio } from '../../acoes'

export default function EnviarDocumentos({ clienteId }) {
  const [mensagem, setMensagem] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    const formulario = evento.currentTarget
    const arquivos = Array.from(formulario.arquivos.files)
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
      {mensagem?.erro && <p className="erro">{mensagem.erro}</p>}
      {mensagem?.ok && <p className="ok">{mensagem.ok}</p>}
      <div>
        <button disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar documentos'}</button>
      </div>
    </form>
  )
}
