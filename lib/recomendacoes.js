// Validação da recomendação enviada pelo formulário público do site.

const LIMITES = { nome: 80, empresa: 80, cidade: 60, texto: 800, contato: 120 }

const limpar = (valor, max) => String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

/**
 * @param dados objeto com nome, empresa, cidade, texto, nota, contato, autorizo e site (armadilha anti-robô)
 * @returns { erro } ou { robo: true } ou { registro } pronto para gravar
 */
export function validarRecomendacao(dados) {
  // Campo escondido: pessoa não preenche, robô preenche. Finge que deu certo e descarta.
  if (limpar(dados.site, 200)) return { robo: true }

  const registro = {
    nome: limpar(dados.nome, LIMITES.nome),
    empresa: limpar(dados.empresa, LIMITES.empresa) || null,
    cidade: limpar(dados.cidade, LIMITES.cidade) || null,
    texto: String(dados.texto ?? '').trim().slice(0, LIMITES.texto),
    nota: Number(dados.nota) || null,
    contato: limpar(dados.contato, LIMITES.contato) || null,
  }
  if (registro.nome.length < 2) return { erro: 'Informe seu nome.' }
  if (registro.texto.length < 20) return { erro: 'Conte um pouco mais sobre o atendimento (pelo menos 20 letras).' }
  if (registro.nota !== null && !(Number.isInteger(registro.nota) && registro.nota >= 1 && registro.nota <= 5)) {
    return { erro: 'A nota precisa ser de 1 a 5.' }
  }
  if (!dados.autorizo) return { erro: 'Marque a autorização para publicarmos sua recomendação no site.' }
  return { registro }
}

// "Maria Souza · Padaria Pão Bom · Salvador/BA"
export function assinatura(r) {
  return [r.nome, r.empresa, r.cidade].filter(Boolean).join(' · ')
}
