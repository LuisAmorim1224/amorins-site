import 'server-only'
import { proximoVencimento } from '@/lib/vencimento'

const API = process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3'

async function asaas(caminho, { method = 'GET', body } = {}) {
  if (!process.env.ASAAS_API_KEY) throw new Error('Chave do Asaas não configurada.')
  const resposta = await fetch(API + caminho, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'amorins-site',
      access_token: process.env.ASAAS_API_KEY,
    },
    body: body && JSON.stringify(body),
    cache: 'no-store',
  })
  const dados = await resposta.json().catch(() => ({}))
  if (!resposta.ok) {
    const erros = dados.errors?.map((e) => e.description).join('; ')
    throw new Error(erros || `O Asaas respondeu com erro ${resposta.status}.`)
  }
  return dados
}

export function criarClienteAsaas(cliente) {
  return asaas('/customers', {
    method: 'POST',
    body: {
      name: cliente.nome,
      cpfCnpj: cliente.cpf_cnpj,
      email: cliente.email,
      mobilePhone: cliente.telefone || undefined,
      externalReference: cliente.id,
    },
  })
}

// Assinatura mensal: o Asaas gera a cobrança todo mês e o cliente escolhe boleto, PIX ou cartão.
export function criarAssinatura({ customerId, valor, diaVencimento }) {
  return asaas('/subscriptions', {
    method: 'POST',
    body: {
      customer: customerId,
      billingType: 'UNDEFINED',
      value: valor,
      nextDueDate: proximoVencimento(diaVencimento),
      cycle: 'MONTHLY',
      description: 'Honorários contábeis - Amorins Contábil',
    },
  })
}

export async function listarCobrancas(customerId) {
  const dados = await asaas(`/payments?customer=${encodeURIComponent(customerId)}&limit=24`)
  return dados.data.sort((a, b) => b.dueDate.localeCompare(a.dueDate))
}

const SITUACOES = {
  PENDING: 'Em aberto',
  OVERDUE: 'Vencida',
  RECEIVED: 'Paga',
  CONFIRMED: 'Paga',
  RECEIVED_IN_CASH: 'Paga',
  REFUNDED: 'Estornada',
}

export function situacaoCobranca(status) {
  return SITUACOES[status] || status
}

export function cobrancaEmAberto(status) {
  return status === 'PENDING' || status === 'OVERDUE'
}
