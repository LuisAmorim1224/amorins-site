// Notas de homologação (teste, sem valor fiscal) não aparecem para o cliente.

// Os arquivos de teste são gravados como "TESTE homologacao - NFS-e 12.xml".
export const ehArquivoDeTeste = (doc) => /TESTE homologacao/i.test(`${doc?.caminho || ''} ${doc?.nome || ''}`)

// Pedido emitido em homologação: tem chave de acesso, mas a nota não entrou nas notas emitidas
// (só as de produção entram).
export function semPedidosDeTeste(pedidos, notas) {
  const chaves = new Set((notas || []).map((n) => n.chave_acesso).filter(Boolean))
  const ids = new Set((notas || []).map((n) => n.pedido_id).filter(Boolean))
  return (pedidos || []).filter((p) => !(p.status === 'emitida' && p.chave_acesso && !chaves.has(p.chave_acesso) && !ids.has(p.id)))
}
