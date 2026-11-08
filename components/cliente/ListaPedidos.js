import { formatarCnpj, formatarCpf } from '@/lib/cnpj'
import { dataBR, reais } from '@/lib/formato'

const SITUACAO = {
  pendente: ['aberta', 'Aguardando emissão'],
  emitida: ['paga', 'Emitida'],
  cancelada: ['vencida', 'Cancelado'],
  escolher_servico: ['aberta', 'Aguardando emissão'],
  erro: ['aberta', 'Aguardando emissão'],
}
// O escritório vê o motivo; o cliente só vê "Aguardando emissão".
const SITUACAO_ESCRITORIO = {
  escolher_servico: ['vencida', 'Escolher o serviço'],
  erro: ['vencida', 'Erro na emissão'],
}
const EM_ABERTO = ['pendente', 'escolher_servico', 'erro']

const documento = (d) => (String(d).length === 14 ? formatarCnpj(d) : formatarCpf(d))

// Lista de pedidos de nota. Com `acoes`, mostra os botões do escritório (admin).
// Arquivos da nota emitida (PDF/XML) entre os documentos do cliente, pelo número da nota.
const arquivosDaNota = (documentos, numero) =>
  numero ? documentos.filter((d) => new RegExp(`NFS-e ${numero}\\.(pdf|xml)$`, 'i').test(d.nome)) : []

export default function ListaPedidos({ pedidos, acoes: Acoes, mostrarCliente, servicos = {}, documentos = [] }) {
  if (!pedidos?.length) return <p className="vazio">Nenhum pedido de nota ainda.</p>
  return (
    <ul className="lista pedidos">
      {pedidos.map((p) => {
        const [classe, rotulo] = (Acoes && SITUACAO_ESCRITORIO[p.status]) || SITUACAO[p.status] || ['', p.status]
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
              {p.obra_cep && (
                <div className="info">
                  Obra: {[p.obra_logradouro, p.obra_numero, p.obra_bairro].filter(Boolean).join(', ')} · CEP {p.obra_cep}
                </div>
              )}
              {p.status === 'emitida' && arquivosDaNota(documentos, p.numero_nota).length > 0 && (
                <div className="info">
                  {arquivosDaNota(documentos, p.numero_nota).map((d) => (
                    <a key={d.nome} href={d.url} style={{ marginRight: 12 }}>
                      {d.nome.toLowerCase().endsWith('.pdf') ? 'Ver espelho (PDF)' : 'XML'}
                    </a>
                  ))}
                </div>
              )}
              {p.resposta && <div className="info">Escritório: {p.resposta}</div>}
              {Acoes && p.motivo_servico && <div className="info">Serviço: {p.motivo_servico}</div>}
              {Acoes && p.status === 'erro' && p.erro_emissao && <p className="erro">{p.erro_emissao}</p>}
            </div>
            {Acoes && EM_ABERTO.includes(p.status) && <Acoes pedido={p} servicos={servicos[p.cliente_id] || []} />}
          </li>
        )
      })}
    </ul>
  )
}
