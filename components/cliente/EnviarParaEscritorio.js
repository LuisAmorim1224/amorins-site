'use client'

import { useState } from 'react'
import { autorizarEnvioCliente, registrarEnvioCliente } from '@/app/cliente/acoes'
import { createClient } from '@/lib/supabase/browser'

const TIPOS = [
  ['outro', 'Extrato, comprovante ou outro'],
  ['nota_fiscal', 'Nota fiscal'],
  ['documento_pessoal', 'Documento pessoal (RG/CNH)'],
  ['comprovante_residencia', 'Comprovante de residência'],
  ['contrato_social', 'Contrato social / alteração'],
]

// Envia o arquivo direto do navegador para a pasta do cliente. Retorna o caminho salvo.
export async function enviarArquivoDoCliente(arquivo, tipo) {
  const { caminho, token } = await autorizarEnvioCliente(arquivo.name)
  const { error } = await createClient().storage.from('documentos').uploadToSignedUrl(caminho, token, arquivo)
  if (error) throw error
  await registrarEnvioCliente(caminho, tipo)
  return caminho
}

export default function EnviarParaEscritorio() {
  const [mensagem, setMensagem] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    const formulario = evento.currentTarget
    const arquivos = Array.from(formulario.arquivos.files)
    if (!arquivos.length) return
    setEnviando(true)
    setMensagem(null)
    const falhas = []
    for (const arquivo of arquivos) {
      if (arquivo.size > 20 * 1024 * 1024) {
        falhas.push(`${arquivo.name} (acima de 20 MB)`)
        continue
      }
      try {
        await enviarArquivoDoCliente(arquivo, formulario.tipo.value)
      } catch (e) {
        falhas.push(`${arquivo.name}${e?.message ? ` (${e.message})` : ''}`)
      }
    }
    formulario.reset()
    setEnviando(false)
    setMensagem(falhas.length ? { erro: `Não foi possível enviar: ${falhas.join(', ')}` } : { ok: 'Arquivo(s) enviado(s) para o escritório.' })
  }

  return (
    <form onSubmit={enviar} className="formulario">
      <div className="duas">
        <label>
          Arquivos
          <input type="file" name="arquivos" multiple required />
        </label>
        <label>
          O que é?
          <select name="tipo" defaultValue="outro">
            {TIPOS.map(([valor, nome]) => (
              <option key={valor} value={valor}>{nome}</option>
            ))}
          </select>
        </label>
      </div>
      {mensagem?.erro && <p className="erro">{mensagem.erro}</p>}
      {mensagem?.ok && <p className="ok">{mensagem.ok}</p>}
      <div>
        <button disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar para o escritório'}</button>
      </div>
    </form>
  )
}
