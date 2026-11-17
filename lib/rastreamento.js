// Medição de visitas e remarketing (Pixel da Meta e tag do Google).
// Os IDs abaixo não são segredo: aparecem no código de qualquer site que usa essas ferramentas.
// Enquanto estiverem vazios, nada é carregado e o aviso de cookies não aparece.
export const RASTREIO = {
  // Gerenciador de Eventos da Meta → Fontes de dados → ID do pixel (só números).
  metaPixel: '1816319342915079',
  // Google Analytics 4 → Fluxo de dados da Web → ID da métrica (G-XXXXXXX).
  googleAnalytics: '',
  // Google Ads → Ferramentas → Conversões → Tag do Google (AW-XXXXXXXXX).
  googleAds: 'AW-18581261324',
  // Google Ads → conversão "Clique no WhatsApp" → rótulo (AW-XXXXXXXXX/abcDEF123). Opcional.
  googleAdsConversaoWhatsapp: 'AW-18581261324/xVLuCIWHtbodEIyYnpxF',
}

export const CHAVE_CONSENTIMENTO = 'amorins-cookies'

// Páginas onde a medição pode rodar: só o site público, nunca a Área do Cliente, o /admin
// nem o link de depoimento que vai para quem já é cliente.
export function paginaPublica(caminho = '/') {
  return !/^\/(admin|cliente|login|api|recomendar)(\/|$)/.test(caminho)
}

export function temRastreio(ids = RASTREIO) {
  return Boolean(ids.metaPixel || ids.googleAnalytics || ids.googleAds)
}

export function linkDeWhatsapp(href = '') {
  return /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)
}

// IDs da tag do Google que devem ser configurados (Analytics e Ads usam a mesma gtag.js).
export function idsGoogle(ids = RASTREIO) {
  return [ids.googleAnalytics, ids.googleAds].filter(Boolean)
}
