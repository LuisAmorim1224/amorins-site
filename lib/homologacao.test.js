import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ehArquivoDeTeste, semPedidosDeTeste } from './homologacao.js'

test('esconde pedidos e arquivos de homologação', () => {
  const notas = [{ chave_acesso: 'real', pedido_id: 'p1' }]
  const pedidos = [
    { id: 'p1', status: 'emitida', chave_acesso: 'real' },
    { id: 'p2', status: 'emitida', chave_acesso: 'teste' },
    { id: 'p3', status: 'pendente' },
    { id: 'p4', status: 'emitida' },
  ]
  assert.deepEqual(semPedidosDeTeste(pedidos, notas).map((p) => p.id), ['p1', 'p3', 'p4'])
  assert.equal(ehArquivoDeTeste({ caminho: 'abc/TESTE homologacao - NFS-e 1.xml' }), true)
  assert.equal(ehArquivoDeTeste({ caminho: 'abc/NFS-e 50.pdf' }), false)
})
