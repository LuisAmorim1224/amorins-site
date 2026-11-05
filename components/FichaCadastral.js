import { formatarCnpj, formatarCpf } from '@/lib/cnpj'
import { dataBR, reais } from '@/lib/formato'

function Campo({ rotulo, valor }) {
  if (valor == null || valor === '' || valor === false) return null
  return (
    <div className="campo">
      <span className="rotulo">{rotulo}</span>
      <span>{valor}</span>
    </div>
  )
}

function enderecoEmTexto(e) {
  if (!e) return null
  const linha1 = [e.logradouro, e.numero, e.complemento].filter(Boolean).join(', ')
  const linha2 = [e.bairro, [e.municipio, e.uf].filter(Boolean).join('/'), e.cep].filter(Boolean).join(' · ')
  return [linha1, linha2].filter(Boolean).join(' — ') || null
}

const documento = (numeros) => (String(numeros || '').length === 14 ? formatarCnpj(numeros) : formatarCpf(numeros))

// Ficha da empresa, sócios e pendências. Usada no admin e na Área do Cliente.
export default function FichaCadastral({ cliente, socios = [], pendencias = [] }) {
  const situacaoOk = !cliente.situacao_cadastral || cliente.situacao_cadastral.toUpperCase() === 'ATIVA'
  return (
    <div className="ficha">
      <div className="grade">
        <Campo rotulo="CPF / CNPJ" valor={documento(cliente.cpf_cnpj)} />
        <Campo rotulo="Razão social" valor={cliente.razao_social} />
        <Campo rotulo="Nome fantasia" valor={cliente.nome_fantasia} />
        <Campo
          rotulo="Situação na Receita"
          valor={
            cliente.situacao_cadastral && (
              <span className={`etiqueta ${situacaoOk ? 'paga' : 'vencida'}`}>
                {cliente.situacao_cadastral}
                {cliente.data_situacao_cadastral && ` desde ${dataBR(cliente.data_situacao_cadastral)}`}
              </span>
            )
          }
        />
        <Campo rotulo="Regime tributário" valor={cliente.regime_tributario} />
        <Campo rotulo="Natureza jurídica" valor={cliente.natureza_juridica} />
        <Campo rotulo="Porte" valor={cliente.porte} />
        <Campo rotulo="Abertura" valor={cliente.data_abertura && dataBR(cliente.data_abertura)} />
        <Campo rotulo="Capital social" valor={cliente.capital_social != null && reais(cliente.capital_social)} />
        <Campo rotulo="NIRE (Junta Comercial)" valor={cliente.nire} />
        <Campo rotulo="E-mail na Receita" valor={cliente.email_receita} />
        <Campo rotulo="Telefone na Receita" valor={cliente.telefone_receita} />
      </div>
      <Campo rotulo="Endereço" valor={enderecoEmTexto(cliente.endereco)} />
      {cliente.cnae_principal && (
        <div className="campo">
          <span className="rotulo">Atividades (CNAE)</span>
          <ul className="cnaes">
            <li>
              <strong>{cliente.cnae_principal.codigo}</strong> {cliente.cnae_principal.descricao} (principal)
            </li>
            {(cliente.cnaes_secundarios || []).map((c) => (
              <li key={c.codigo}>
                <strong>{c.codigo}</strong> {c.descricao}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3>Sócios e responsáveis</h3>
      {socios.length ? (
        <ul className="lista">
          {socios.map((s) => (
            <li key={s.id || s.nome}>
              <div>
                <strong>{s.nome}</strong>
                <div className="info">
                  {[
                    s.qualificacao,
                    s.participacao != null && `${String(s.participacao).replace('.', ',')}%`,
                    s.profissao,
                    s.registro_profissional,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <div className="info">
                {[s.cpf && `CPF ${formatarCpf(s.cpf)}`, s.rg && `RG ${s.rg}`, s.data_nascimento && `Nasc. ${dataBR(s.data_nascimento)}`]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="vazio">Nenhum sócio cadastrado.</p>
      )}

      <h3>Pendências</h3>
      {pendencias.length ? (
        <ul className="pendencias">
          {pendencias.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : (
        <p className="ok">Nenhuma pendência. Tudo em dia!</p>
      )}

      {cliente.dados_receita_em && (
        <p className="vazio">Dados da Receita consultados em {dataBR(cliente.dados_receita_em)}.</p>
      )}
    </div>
  )
}
