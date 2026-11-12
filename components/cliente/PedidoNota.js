'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { pedirNota, sugerirServicoCliente } from '@/app/cliente/acoes'

const codigo = (c) => `${c.slice(0, 2)}.${c.slice(2, 4)}.${c.slice(4, 6)}`

// Enquanto a descrição é digitada, consulta as notas anteriores e mostra o código que a nota vai usar.
function useSugestao(buscar) {
  const [sugestao, setSugestao] = useState(null)
  const espera = useRef(null)
  const ultima = useRef(0)
  useEffect(() => () => clearTimeout(espera.current), [])
  function aoDigitar(texto) {
    clearTimeout(espera.current)
    if (texto.trim().length < 6) return setSugestao(null)
    espera.current = setTimeout(async () => {
      const vez = ++ultima.current
      const r = await buscar(texto).catch(() => null)
      if (vez === ultima.current) setSugestao(r)
    }, 600)
  }
  return [sugestao, aoDigitar, () => setSugestao(null)]
}

function Sugestao({ sugestao, peloEscritorio, escolhido }) {
  if (!sugestao || escolhido) return null
  if (sugestao.codigo) {
    return (
      <p className="sugestao-servico">
        Código do serviço: <strong>{codigo(sugestao.codigo)} · {sugestao.nome}</strong>
        <br />
        <span className="info">{sugestao.motivo}</span>
      </p>
    )
  }
  if (!peloEscritorio) return null
  return (
    <p className="sugestao-servico atencao">
      {sugestao.motivo} Escolha o serviço acima
      {sugestao.candidatos?.length ? ` (possíveis: ${sugestao.candidatos.map((c) => codigo(c.codigo)).join(', ')})` : ''}.
    </p>
  )
}

// Pedido de nota. No /admin o escritório usa o mesmo formulário com `acaoServidor`, `clienteId`, `servicos` e `sugerir`.
export default function PedidoNota({ acaoServidor = pedirNota, clienteId, servicos, sugerir = sugerirServicoCliente }) {
  const [estado, acao, enviando] = useActionState(acaoServidor, {})
  const peloEscritorio = Boolean(clienteId)
  const [sugestao, aoDigitar, limpar] = useSugestao(peloEscritorio ? (t) => sugerir(clienteId, t) : sugerir)
  const [escolhido, setEscolhido] = useState('')
  useEffect(() => {
    if (estado.ok) {
      limpar()
      setEscolhido('')
    }
  }, [estado.ok])
  return (
    <form action={acao} className="formulario" key={estado.ok || 'pedido'}>
      {peloEscritorio ? (
        <input type="hidden" name="cliente_id" value={clienteId} />
      ) : (
        <p className="vazio">Preencha os dados da nota que você precisa. O escritório confere e emite para você.</p>
      )}
      {peloEscritorio && servicos?.length > 0 && (
        <label>
          Serviço da nota
          <select name="servico_id" defaultValue="" onChange={(e) => setEscolhido(e.target.value)}>
            <option value="">Sugerir pelas notas anteriores</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {codigo(s.cod_trib_nac)} · {s.nome}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="duas">
        <label>
          CPF ou CNPJ de quem vai receber a nota
          <input name="tomador_documento" required inputMode="numeric" placeholder="00.000.000/0000-00" />
        </label>
        <label>
          Nome ou razão social
          <input name="tomador_nome" required />
        </label>
        <label>
          E-mail do cliente (opcional)
          <input name="tomador_email" type="email" placeholder="financeiro@empresa.com.br" />
        </label>
        <label>
          Valor da nota (R$)
          <input name="valor" required inputMode="decimal" placeholder="1.500,00" />
        </label>
      </div>
      <label>
        Endereço do cliente (opcional)
        <input name="tomador_endereco" placeholder="Rua, número, bairro, cidade/UF, CEP" />
      </label>
      <label>
        Descrição do serviço ou produto
        <textarea
          name="descricao"
          rows={3}
          required
          placeholder="Ex.: Consultoria em tecnologia referente a outubro/2026"
          onChange={(e) => aoDigitar(e.target.value)}
        />
      </label>
      <Sugestao sugestao={sugestao} peloEscritorio={peloEscritorio} escolhido={escolhido} />
      <div className="duas">
        <label>
          Data em que precisa da nota (opcional)
          <input name="data_desejada" type="date" />
        </label>
        <label>
          O cliente vai reter o ISS?
          <select name="iss_retido" defaultValue="nao">
            <option value="nao">Não / não sei</option>
            <option value="sim">Sim, o ISS será retido</option>
          </select>
        </label>
      </div>
      <details>
        <summary>Serviço feito em obra? Informe o endereço da obra</summary>
        <p className="vazio">Obrigatório para concretagem e outros serviços de construção: o ISS é devido na cidade da obra.</p>
        <div className="duas">
          <label>
            CEP da obra
            <input name="obra_cep" inputMode="numeric" placeholder="00000-000" />
          </label>
          <label>
            Rua / avenida
            <input name="obra_logradouro" />
          </label>
          <label>
            Número
            <input name="obra_numero" placeholder="S/N" />
          </label>
          <label>
            Bairro
            <input name="obra_bairro" />
          </label>
        </div>
      </details>
      <label>
        Observações (opcional)
        <textarea name="observacoes" rows={2} placeholder="Número do contrato, pedido de compra, dados bancários na nota..." />
      </label>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      {estado.ok && <p className="ok">{estado.ok}</p>}
      <div>
        <button disabled={enviando}>{enviando ? 'Enviando...' : peloEscritorio ? 'Criar pedido' : 'Enviar pedido de nota'}</button>
      </div>
    </form>
  )
}
