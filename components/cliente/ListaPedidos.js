import { formatarCnpj, formatarCpf } from '@/lib/cnpj'
import { dataBR, reais } from '@/lib/formato'

const SITUACAO = {
  pendente: ['aberta', 'Aguardando emissão'],
  emitida: ['paga', 'Emitida'],
  cancelada: ['vencida', 'Cancelado'],
}

const documento = (d) => (String(d).length === 14 ? formatarCnpj(d) : formatarCpf(d))

// Lista de pedidos de nota. Com `acoes`, mostra os botões do escritório (admin).
export default function ListaPedidos({ pedidos, acoes: Acoes, mostrarCliente }) {
  if (!pedidos?.length) return <p className="vazio">Nenhum pedido de nota ainda.</p>
  return (
    <ul className="lista pedidos">
      {pedidos.map((p) => {
        const [classe, rotulo] = SITUACAO[p.status] || ['', p.status]
        return (
          <li key={p.id}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <strong>{reais(p.valor)}</strong> para {p.tomador_nome}{' '}
              <span className={`etiqueta ${classe}`}>{rotulo}</span>
              {mostrarCliente && p.clientes?.nome && <div className="info">Cliente: {p.clientes.nome}</div>}
              <div className="info">
                {documento(p.tomador_documento)} · pedido em {dataBR(p.criado_em)}
                {p.data_desejada && ` · para ${dataBR(p.data_desejada)}`}
                {p.iss_retido && ' · ISS retido'}
                {p.numero_nota && ` · nota nº ${p.numero_nota}`}
              </div>
              <div className="info">{p.descricao}</div>
              {p.tomador_email && <div className="info">E-mail: {p.tomador_email}</div>}
              {p.tomador_endereco && <div className="info">Endereço: {p.tomador_endereco}</div>}
              {p.observacoes && <div className="info">Obs.: {p.observacoes}</div>}
              {p.resposta && <div className="info">Escritório: {p.resposta}</div>}
            </div>
            {Acoes && p.status === 'pendente' && <Acoes pedido={p} />}
          </li>
        )
      })}
    </ul>
  )
}
