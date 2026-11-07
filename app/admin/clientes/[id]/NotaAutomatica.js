'use client'

import { useActionState } from 'react'
import { buscarNotasAnteriores, conferirCodigos, enviarCertificado, excluirServico, salvarConfigNfse, salvarServico } from '../../acoes'

const codigo = (c) => `${c.slice(0, 2)}.${c.slice(2, 4)}.${c.slice(4, 6)}`
const Mensagem = ({ estado }) => (
  <>
    {estado.erro && <p className="erro">{estado.erro}</p>}
    {estado.ok && <p className="ok">{estado.ok}</p>}
  </>
)

function Servico({ clienteId, servico }) {
  const [estado, acao, salvando] = useActionState(salvarServico, {})
  const s = servico || {}
  return (
    <form action={acao} className="formulario" key={estado.ok && !servico ? estado.ok : undefined}>
      <input type="hidden" name="cliente_id" value={clienteId} />
      {servico && <input type="hidden" name="id" value={servico.id} />}
      <div className="duas">
        <label>
          Nome do serviço
          <input name="nome" defaultValue={s.nome} placeholder="Bombeamento de concreto" required />
        </label>
        <label>
          Código de tributação nacional
          <input name="cod_trib_nac" defaultValue={s.cod_trib_nac} placeholder="07.02.02" required />
        </label>
        <label>
          NBS (opcional)
          <input name="cod_nbs" defaultValue={s.cod_nbs} placeholder="1.0105.40.00" />
        </label>
        <label>
          Código municipal (opcional, vem das notas importadas)
          <input name="cod_trib_mun" defaultValue={s.cod_trib_mun || ''} inputMode="numeric" placeholder="001" />
        </label>
        <label>
          Alíquota ISS % (opcional, o sistema nacional já sabe)
          <input name="aliquota_iss" defaultValue={s.aliquota_iss ?? ''} inputMode="decimal" />
        </label>
      </div>
      <label>
        Palavras-chave (ajudam a escolher o serviço antes de existir nota anterior)
        <input name="palavras_chave" defaultValue={s.palavras_chave} placeholder="bombeamento concreto concretagem bomba" />
      </label>
      <label>
        <input type="checkbox" name="exige_obra" defaultChecked={s.exige_obra} /> Serviço em obra (pede endereço da obra; ISS na cidade da obra)
      </label>
      <label>
        <input type="checkbox" name="retem" defaultChecked={s.retem_iss_tomador_pj} /> Tomador empresa retém o ISS
      </label>
      <div>
        <button disabled={salvando}>{salvando ? 'Salvando...' : servico ? 'Salvar serviço' : 'Adicionar serviço'}</button>
      </div>
      <Mensagem estado={estado} />
    </form>
  )
}

export default function NotaAutomatica({ cliente, servicos, notasAnteriores }) {
  const [estadoConfig, acaoConfig, salvandoConfig] = useActionState(salvarConfigNfse, {})
  const [estadoCert, acaoCert, enviandoCert] = useActionState(enviarCertificado, {})
  const [estadoHist, acaoHist, buscando] = useActionState(buscarNotasAnteriores, {})
  const [estadoCod, acaoCod, conferindo] = useActionState(conferirCodigos, {})
  const certVencido = cliente.certificado_validade && cliente.certificado_validade < new Date().toISOString().slice(0, 10)

  return (
    <div className="formulario">
      {/* key: refaz o formulário quando os dados salvos mudam; sem isso o React volta os campos ao valor antigo. */}
      <form
        action={acaoConfig}
        className="formulario"
        key={[cliente.nfse_ativa, cliente.nfse_emissao_automatica, cliente.nfse_ambiente, cliente.nfse_op_simples, cliente.nfse_aliquota_sn, cliente.nfse_municipio, cliente.nfse_inscricao_municipal, cliente.nfse_serie].join('|')}
      >
        <input type="hidden" name="id" value={cliente.id} />
        <label>
          <input type="checkbox" name="ativa" defaultChecked={cliente.nfse_ativa} /> Emitir as notas deste cliente pelo portal
        </label>
        <label>
          <input type="checkbox" name="automatica" defaultChecked={cliente.nfse_emissao_automatica} /> Emitir sozinho assim que o
          cliente pedir (quando o serviço for identificado com certeza)
        </label>
        <div className="duas">
          <label>
            Ambiente
            <select name="ambiente" defaultValue={cliente.nfse_ambiente || 'homologacao'}>
              <option value="homologacao">Homologação (teste, sem valor fiscal)</option>
              <option value="producao">Produção (nota válida)</option>
            </select>
          </label>
          <label>
            Regime no Simples
            <select name="op_simples" defaultValue={cliente.nfse_op_simples || '3'}>
              <option value="3">ME/EPP optante do Simples</option>
              <option value="2">MEI</option>
              <option value="1">Não optante</option>
            </select>
          </label>
          <label>
            Alíquota aproximada do Simples % (ME/EPP)
            <input name="aliquota_sn" defaultValue={cliente.nfse_aliquota_sn ?? ''} inputMode="decimal" placeholder="6,00" />
          </label>
          <label>
            Município emissor (IBGE)
            <input name="municipio" defaultValue={cliente.nfse_municipio || '2927408'} inputMode="numeric" />
          </label>
          <label>
            Inscrição municipal (opcional)
            <input name="inscricao_municipal" defaultValue={cliente.nfse_inscricao_municipal || ''} />
          </label>
          <label>
            Série da DPS
            <input name="serie" defaultValue={cliente.nfse_serie || '1'} inputMode="numeric" />
          </label>
        </div>
        <div>
          <button disabled={salvandoConfig}>{salvandoConfig ? 'Salvando...' : 'Salvar configuração'}</button>
        </div>
        <Mensagem estado={estadoConfig} />
      </form>

      <h3>Certificado digital A1</h3>
      <p className={certVencido ? 'erro' : 'vazio'}>
        {cliente.certificado_caminho
          ? `${cliente.certificado_titular || 'Certificado cadastrado'} · vence em ${new Date(`${cliente.certificado_validade}T12:00:00`).toLocaleDateString('pt-BR')}`
          : 'Nenhum certificado cadastrado. Sem ele a nota não sai automática.'}
      </p>
      <form action={acaoCert} className="formulario">
        <input type="hidden" name="id" value={cliente.id} />
        <div className="duas">
          <label>
            Arquivo .pfx ou .p12
            <input type="file" name="certificado" accept=".pfx,.p12,application/x-pkcs12" required />
          </label>
          <label>
            Senha do certificado
            <input type="password" name="senha" required autoComplete="off" />
          </label>
        </div>
        <div>
          <button disabled={enviandoCert}>{enviandoCert ? 'Conferindo...' : cliente.certificado_caminho ? 'Trocar certificado' : 'Enviar certificado'}</button>
        </div>
        <Mensagem estado={estadoCert} />
      </form>

      <h3>Serviços que o cliente fatura</h3>
      <p className="vazio">
        Cada pedido usa o código da nota anterior com descrição parecida. Se não houver nota parecida, ou se servir para mais de um
        serviço, o pedido fica em &quot;Escolher o serviço&quot; para você decidir. Notas anteriores conhecidas: {notasAnteriores}.
      </p>
      {servicos.map((s) => (
        <div key={s.id} className="caixa">
          <strong>
            {codigo(s.cod_trib_nac)} · {s.nome}
          </strong>
          <Servico clienteId={cliente.id} servico={s} />
          <form action={excluirServico}>
            <input type="hidden" name="id" value={s.id} />
            <button className="perigo">Excluir serviço</button>
          </form>
        </div>
      ))}
      <details open={!servicos.length}>
        <summary>Adicionar serviço</summary>
        <Servico clienteId={cliente.id} />
      </details>
      <form action={acaoHist} className="formulario">
        <input type="hidden" name="id" value={cliente.id} />
        <div>
          <button disabled={buscando || !cliente.certificado_caminho}>
            {buscando ? 'Buscando...' : 'Buscar notas anteriores no Emissor Nacional'}
          </button>
        </div>
        <Mensagem estado={estadoHist} />
      </form>
      <form action={acaoCod} className="formulario">
        <input type="hidden" name="id" value={cliente.id} />
        <div>
          <button disabled={conferindo || !cliente.certificado_caminho}>
            {conferindo ? 'Conferindo...' : 'Conferir se o município aceita estes códigos'}
          </button>
        </div>
        <Mensagem estado={estadoCod} />
        {estadoCod.linhas && (
          <ul className="vazio pequeno">
            {estadoCod.linhas.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
      </form>
    </div>
  )
}
