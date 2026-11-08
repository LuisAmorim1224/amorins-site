// Diagnóstico parcial e automático de um CNPJ, só com os dados públicos da Receita (BrasilAPI).
// Débitos, declarações em atraso e dívida ativa NÃO aparecem aqui: isso só o relatório de
// situação fiscal mostra (ver lib/situacao-fiscal.js).

import { dataBR } from './formato.js'
import { dadosDaReceita } from './cnpj.js'

// Ordem de gravidade, da pior para a melhor.
export const NIVEIS = ['grave', 'atencao', 'info', 'ok']

const texto = (v) => String(v ?? '').trim()
const motivoDe = (dados) => {
  const m = texto(dados.descricao_motivo_situacao_cadastral)
  return m && !/^SEM MOTIVO$/i.test(m) ? m : null
}
const desde = (data) => (data ? ` desde ${dataBR(data)}` : '')

function alertasDaSituacao(dados) {
  const situacao = texto(dados.descricao_situacao_cadastral).toUpperCase()
  const motivo = motivoDe(dados)
  const comMotivo = motivo ? ` Motivo informado pela Receita: ${motivo.toLowerCase()}.` : ''
  const data = desde(dados.data_situacao_cadastral)

  if (situacao === 'ATIVA') {
    return {
      nivel: 'ok',
      titulo: 'CNPJ ativo na Receita Federal',
      texto: `A situação cadastral está regular${data}.`,
    }
  }
  if (situacao === 'INAPTA') {
    const omissao = /omiss/i.test(motivo || '')
    return {
      nivel: 'grave',
      titulo: `CNPJ inapto${data}`,
      texto:
        `Com o CNPJ inapto a empresa não consegue emitir nota fiscal nem tirar certidão, e as notas emitidas podem ser consideradas inidôneas.${comMotivo}` +
        (omissao
          ? ' Na maioria dos casos se resolve entregando as declarações em atraso, e o CNPJ volta a ficar ativo.'
          : ''),
    }
  }
  if (situacao === 'SUSPENSA') {
    return {
      nivel: 'grave',
      titulo: `CNPJ suspenso${data}`,
      texto: `A empresa fica impedida de operar normalmente até a Receita retirar a suspensão.${comMotivo} Costuma ser inconsistência cadastral ou documento pendente.`,
    }
  }
  if (situacao === 'BAIXADA') {
    return {
      nivel: 'grave',
      titulo: `CNPJ baixado (encerrado)${data}`,
      texto: `A empresa está encerrada na Receita.${comMotivo} Débitos que ficaram para trás continuam sendo cobrados dos sócios ou do titular, e podem impedir abrir outro CNPJ ou MEI.`,
    }
  }
  if (situacao === 'NULA') {
    return {
      nivel: 'grave',
      titulo: 'CNPJ nulo',
      texto: `A inscrição foi anulada pela Receita.${comMotivo}`,
    }
  }
  return {
    nivel: 'atencao',
    titulo: `Situação cadastral: ${situacao || 'não informada'}`,
    texto: 'Não foi possível confirmar se o CNPJ está ativo. Vale conferir no relatório completo.',
  }
}

/**
 * @param dados resposta da BrasilAPI (/api/cnpj/v1/{cnpj})
 * @returns { empresa, alertas: [{ nivel, titulo, texto }], nivel } — nivel é o pior encontrado
 */
export function diagnosticar(dados) {
  const empresa = dadosDaReceita(dados)
  const alertas = [alertasDaSituacao(dados)]
  const ativa = texto(dados.descricao_situacao_cadastral).toUpperCase() === 'ATIVA'

  const especial = texto(dados.situacao_especial)
  if (especial) {
    alertas.push({
      nivel: 'atencao',
      titulo: `Situação especial: ${especial.toLowerCase()}`,
      texto: `A Receita registra uma situação especial${desde(dados.data_situacao_especial)}. Ela muda o que a empresa precisa entregar e pagar.`,
    })
  }

  if (dados.opcao_pelo_mei === true) {
    alertas.push({
      nivel: 'info',
      titulo: `Enquadrada como MEI${desde(dados.data_opcao_pelo_mei)}`,
      texto:
        'O MEI precisa pagar o DAS todo mês e entregar a DASN-SIMEI todo ano. Atraso gera multa, juros e pode levar ao cancelamento do MEI.',
    })
  } else if (dados.data_exclusao_do_mei) {
    alertas.push({
      nivel: 'atencao',
      titulo: `Desenquadrada do MEI em ${dataBR(dados.data_exclusao_do_mei)}`,
      texto:
        'A empresa deixou de ser MEI. Se continuou pagando só o DAS do MEI depois disso, pode haver diferença de impostos e declarações a corrigir.',
    })
  }

  if (dados.opcao_pelo_mei !== true) {
    if (dados.opcao_pelo_simples === true) {
      alertas.push({
        nivel: 'info',
        titulo: `Optante pelo Simples Nacional${desde(dados.data_opcao_pelo_simples)}`,
        texto: 'No Simples a empresa transmite o PGDAS-D e paga o DAS todo mês, e entrega a DEFIS todo ano.',
      })
    } else if (dados.data_exclusao_do_simples) {
      alertas.push({
        nivel: 'atencao',
        titulo: `Excluída do Simples Nacional em ${dataBR(dados.data_exclusao_do_simples)}`,
        texto:
          'A exclusão costuma acontecer por débitos ou pendências cadastrais. Fora do Simples a carga de impostos e de declarações aumenta. Regularizando, dá para pedir a volta ao Simples em janeiro.',
      })
    } else if (dados.opcao_pelo_simples === false && ativa) {
      alertas.push({
        nivel: 'info',
        titulo: 'Fora do Simples Nacional',
        texto:
          'A empresa está no Lucro Presumido ou no Lucro Real, com obrigações mensais como DCTFWeb, EFD-Contribuições e EFD-Reinf, além da ECD e da ECF todo ano.',
      })
    }
  }

  return { empresa, alertas, nivel: piorNivel(alertas) }
}

export function piorNivel(alertas) {
  return NIVEIS.find((n) => alertas.some((a) => a.nivel === n)) || 'ok'
}

export const RESUMO_DO_NIVEL = {
  grave: 'Encontramos pendências graves nos dados públicos',
  atencao: 'Encontramos pontos de atenção nos dados públicos',
  info: 'Nada grave nos dados públicos',
  ok: 'Nada grave nos dados públicos',
}

const limpar = (valor, max) => String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

/**
 * Valida o pedido de diagnóstico completo (formulário público).
 * @returns { erro } ou { robo: true } ou { registro } com nome, whatsapp, email
 */
export function validarPedido(dados) {
  if (limpar(dados.site, 200)) return { robo: true }
  const nome = limpar(dados.nome, 80)
  let whatsapp = String(dados.whatsapp ?? '').replace(/\D/g, '')
  if (whatsapp.length === 13 && whatsapp.startsWith('55')) whatsapp = whatsapp.slice(2)
  const email = limpar(dados.email, 120).toLowerCase() || null
  if (nome.length < 2) return { erro: 'Informe seu nome.' }
  if (!/^\d{10,11}$/.test(whatsapp)) return { erro: 'Informe o WhatsApp com DDD, só números.' }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: 'E-mail inválido.' }
  if (!dados.consentimento) return { erro: 'Marque a autorização para usarmos seus dados neste diagnóstico.' }
  return { registro: { nome, whatsapp, email } }
}
