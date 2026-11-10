import { nomeParaMostrar } from '@/lib/arquivos-mes'
import { dataBR, reais } from '@/lib/formato'

function Indicador({ rotulo, valor, detalhe, tom }) {
  return (
    <div className={`indicador ${tom || ''}`}>
      <span className="rotulo">{rotulo}</span>
      <strong>{valor}</strong>
      {detalhe && <span className="detalhe">{detalhe}</span>}
    </div>
  )
}

export default function PainelResumo({ pendencias, proximaCobranca, proximaGuia, faturamentoMes, pedidosAbertos }) {
  return (
    <div className="painel-resumo">
      <Indicador
        rotulo="Pendências"
        valor={pendencias ? String(pendencias) : 'Nenhuma'}
        detalhe={pendencias ? 'Veja em "Sua empresa"' : 'Tudo em dia'}
        tom={pendencias ? 'alerta' : 'ok'}
      />
      <Indicador
        rotulo="Próximo honorário"
        valor={proximaCobranca ? reais(proximaCobranca.value) : '—'}
        detalhe={proximaCobranca ? `vence em ${dataBR(proximaCobranca.dueDate)}` : 'Nenhuma cobrança em aberto'}
      />
      <Indicador
        rotulo="Próxima guia"
        valor={proximaGuia ? (proximaGuia.validade ? `vence ${dataBR(proximaGuia.validade)}` : 'Disponível') : 'Nenhuma'}
        detalhe={proximaGuia ? nomeParaMostrar(proximaGuia.nome, proximaGuia.competencia) : 'Nenhuma guia em aberto'}
        tom={proximaGuia?.situacao === 'vencida' ? 'alerta' : undefined}
      />
      <Indicador
        rotulo="Faturado no mês"
        valor={reais(faturamentoMes || 0)}
        detalhe={pedidosAbertos ? `${pedidosAbertos} nota(s) aguardando emissão` : 'pelas notas lançadas'}
      />
    </div>
  )
}
