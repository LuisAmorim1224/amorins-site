import { formatarCnpj } from '@/lib/cnpj'
import { dataBR } from '@/lib/formato'

const ROTULO = { grave: 'Grave', atencao: 'Atenção', info: 'Saiba', ok: 'Em dia' }

// Cartão com os dados públicos da empresa e os alertas do diagnóstico parcial.
export default function AlertasDiagnostico({ cnpj, empresa, alertas }) {
  const local = [empresa?.endereco?.municipio, empresa?.endereco?.uf].filter(Boolean).join('/')
  return (
    <div className="diag-resultado">
      <div className="diag-empresa">
        <strong>{empresa?.razao_social || 'Empresa'}</strong>
        <span>
          CNPJ {formatarCnpj(cnpj)}
          {local ? ` · ${local}` : ''}
          {empresa?.data_abertura ? ` · aberta em ${dataBR(empresa.data_abertura)}` : ''}
        </span>
        {empresa?.cnae_principal && (
          <span>
            Atividade principal: {empresa.cnae_principal.codigo} {empresa.cnae_principal.descricao}
          </span>
        )}
      </div>
      <ul className="diag-alertas">
        {(alertas || []).map((a, i) => (
          <li key={i} className={`diag-alerta ${a.nivel}`}>
            <span className="diag-nivel">{ROTULO[a.nivel] || a.nivel}</span>
            <div>
              <h3>{a.titulo}</h3>
              <p>{a.texto}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
