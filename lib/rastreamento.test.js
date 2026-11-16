import { test } from 'node:test'
import assert from 'node:assert/strict'
import { paginaPublica, temRastreio, linkDeWhatsapp, idsGoogle } from './rastreamento.js'

test('medição só roda no site público', () => {
  assert.equal(paginaPublica('/'), true)
  assert.equal(paginaPublica('/artigos/cnpj-inapto-como-regularizar'), true)
  assert.equal(paginaPublica('/privacidade'), true)
  assert.equal(paginaPublica('/admin'), false)
  assert.equal(paginaPublica('/admin/clientes/1'), false)
  assert.equal(paginaPublica('/cliente'), false)
  assert.equal(paginaPublica('/login'), false)
  assert.equal(paginaPublica('/recomendar'), false)
  assert.equal(paginaPublica('/clientes-felizes'), true)
})

test('sem nenhum ID configurado, nada é carregado', () => {
  assert.equal(temRastreio({ metaPixel: '', googleAnalytics: '', googleAds: '' }), false)
  assert.equal(temRastreio({ metaPixel: '123', googleAnalytics: '', googleAds: '' }), true)
})

test('reconhece links de WhatsApp', () => {
  assert.equal(linkDeWhatsapp('https://wa.me/5571999454356?text=oi'), true)
  assert.equal(linkDeWhatsapp('https://api.whatsapp.com/send?phone=1'), true)
  assert.equal(linkDeWhatsapp('/login'), false)
  assert.equal(linkDeWhatsapp(undefined), false)
})

test('junta Analytics e Ads na mesma tag do Google', () => {
  assert.deepEqual(idsGoogle({ googleAnalytics: 'G-1', googleAds: 'AW-2' }), ['G-1', 'AW-2'])
  assert.deepEqual(idsGoogle({ googleAnalytics: '', googleAds: 'AW-2' }), ['AW-2'])
})
