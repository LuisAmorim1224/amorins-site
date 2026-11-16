import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assinatura, validarRecomendacao } from './recomendacoes.js'

const base = { nome: ' Maria  Souza ', texto: 'Atendimento excelente, regularizou meu CNPJ rápido.', autorizo: 'on' }

test('recomendação válida vira registro limpo', () => {
  const { registro } = validarRecomendacao({ ...base, empresa: '', nota: '5' })
  assert.equal(registro.nome, 'Maria Souza')
  assert.equal(registro.empresa, null)
  assert.equal(registro.nota, 5)
})

test('exige nome, texto mínimo e autorização', () => {
  assert.match(validarRecomendacao({ ...base, nome: '' }).erro, /nome/)
  assert.match(validarRecomendacao({ ...base, texto: 'bom' }).erro, /20 letras/)
  assert.match(validarRecomendacao({ ...base, autorizo: null }).erro, /autorização/)
})

test('nota fora de 1 a 5 é recusada', () => {
  assert.match(validarRecomendacao({ ...base, nota: '9' }).erro, /1 a 5/)
})

test('campo armadilha preenchido é tratado como robô', () => {
  assert.deepEqual(validarRecomendacao({ ...base, site: 'http://spam' }), { robo: true })
})

test('assinatura junta só o que foi informado', () => {
  assert.equal(assinatura({ nome: 'Maria', empresa: null, cidade: 'Salvador/BA' }), 'Maria · Salvador/BA')
})

test('foto: só JPG, PNG ou WEBP até o limite', async () => {
  const { validarFoto, FOTO_MAX_MB } = await import('./recomendacoes.js')
  assert.equal(validarFoto({ size: 1000, type: 'image/jpeg' }).extensao, 'jpg')
  assert.equal(validarFoto({ size: 1000, type: 'image/webp' }).extensao, 'webp')
  assert.match(validarFoto({ size: 1000, type: 'application/pdf' }).erro, /JPG/)
  assert.match(validarFoto({ size: FOTO_MAX_MB * 1024 * 1024 + 1, type: 'image/png' }).erro, /máximo/)
  assert.match(validarFoto(null).erro, /Escolha/)
})

test('foto: acha o caminho no link público e a inicial do nome', async () => {
  const { caminhoDaFoto, inicial } = await import('./recomendacoes.js')
  assert.equal(
    caminhoDaFoto('https://x.supabase.co/storage/v1/object/public/fotos-recomendacoes/abc/123.jpg'),
    'abc/123.jpg'
  )
  assert.equal(caminhoDaFoto(null), null)
  assert.equal(inicial(' maria'), 'M')
  assert.equal(inicial(''), '?')
})
