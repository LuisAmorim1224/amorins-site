import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nomeSeguro } from './documentos.js'

test('remove acentos e símbolos do nome do arquivo', () => {
  assert.equal(nomeSeguro('Declaração IRPF 2026 (versão final).pdf'), 'Declaracao IRPF 2026 _versao final_.pdf')
  assert.equal(nomeSeguro('Guia DAS – março.pdf'), 'Guia DAS _ marco.pdf')
})
