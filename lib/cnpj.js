// Consulta os dados públicos de um CNPJ (Receita Federal) pela BrasilAPI.
// https://brasilapi.com.br/docs#tag/CNPJ

const somenteNumeros = (texto) => String(texto || '').replace(/\D/g, '')

// 6920601 -> "69.20-6-01"
export function formatarCnae(codigo) {
  const s = String(codigo || '').replace(/\D/g, '').padStart(7, '0')
  if (/^0+$/.test(s)) return null
  return `${s.slice(0, 2)}.${s.slice(2, 4)}-${s[4]}-${s.slice(5)}`
}

// 2135 -> "213-5"
export function formatarNatureza(codigo) {
  const s = String(codigo || '').replace(/\D/g, '')
  if (s.length !== 4) return null
  return `${s.slice(0, 3)}-${s[3]}`
}

// "12345678000195" -> "12.345.678/0001-95"
export function formatarCnpj(cnpj) {
  const s = somenteNumeros(cnpj)
  if (s.length !== 14) return cnpj || ''
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`
}

// "12345678909" -> "123.456.789-09"
export function formatarCpf(cpf) {
  const s = somenteNumeros(cpf)
  if (s.length !== 11) return cpf || ''
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`
}

// Validação dos dígitos verificadores do CNPJ.
export function cnpjValido(cnpj) {
  const s = somenteNumeros(cnpj)
  if (s.length !== 14 || /^(\d)\1+$/.test(s)) return false
  const digito = (base) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const soma = base.split('').reduce((t, n, i) => t + Number(n) * pesos[i], 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  const d1 = digito(s.slice(0, 12))
  const d2 = digito(s.slice(0, 12) + d1)
  return s.endsWith(`${d1}${d2}`)
}

function regimeDaReceita(dados) {
  if (dados.opcao_pelo_mei === true) return 'MEI'
  if (dados.opcao_pelo_simples === true) return 'Simples Nacional'
  return null
}

function telefoneDaReceita(ddd) {
  const s = somenteNumeros(ddd)
  if (s.length < 10) return null
  return `(${s.slice(0, 2)}) ${s.slice(2, s.length - 4)}-${s.slice(-4)}`
}

// Converte a resposta da BrasilAPI nas colunas da tabela "clientes".
export function dadosDaReceita(dados) {
  const naturezaCodigo = formatarNatureza(dados.codigo_natureza_juridica)
  const logradouro = [dados.descricao_tipo_de_logradouro, dados.logradouro].filter(Boolean).join(' ')
  return {
    razao_social: dados.razao_social || null,
    nome_fantasia: dados.nome_fantasia || null,
    natureza_juridica: naturezaCodigo
      ? `${naturezaCodigo} - ${dados.natureza_juridica}`
      : dados.natureza_juridica || null,
    porte: dados.descricao_porte || dados.porte || null,
    regime_tributario: regimeDaReceita(dados),
    data_abertura: dados.data_inicio_atividade || null,
    situacao_cadastral: dados.descricao_situacao_cadastral || null,
    data_situacao_cadastral: dados.data_situacao_cadastral || null,
    cnae_principal: dados.cnae_fiscal
      ? { codigo: formatarCnae(dados.cnae_fiscal), descricao: dados.cnae_fiscal_descricao || '' }
      : null,
    cnaes_secundarios: (dados.cnaes_secundarios || [])
      .filter((c) => c && Number(c.codigo))
      .map((c) => ({ codigo: formatarCnae(c.codigo), descricao: c.descricao || '' })),
    endereco: {
      logradouro: logradouro || null,
      numero: dados.numero || null,
      complemento: dados.complemento || null,
      bairro: dados.bairro || null,
      municipio: dados.municipio || null,
      uf: dados.uf || null,
      cep: dados.cep ? somenteNumeros(dados.cep).replace(/^(\d{5})(\d{3})$/, '$1-$2') : null,
    },
    capital_social: dados.capital_social ?? null,
    email_receita: dados.email ? String(dados.email).toLowerCase() : null,
    telefone_receita: telefoneDaReceita(dados.ddd_telefone_1),
  }
}

// Sócios que a Receita publica (o CPF vem mascarado).
export function sociosDaReceita(dados) {
  return (dados.qsa || [])
    .filter((s) => s && s.nome_socio)
    .map((s) => ({
      nome: s.nome_socio,
      cpf: s.cnpj_cpf_do_socio || null,
      qualificacao: s.qualificacao_socio || null,
      administrador: /administrador/i.test(s.qualificacao_socio || ''),
    }))
}

export async function buscarCnpj(cnpj) {
  const numeros = somenteNumeros(cnpj)
  if (!cnpjValido(numeros)) throw new Error('CNPJ inválido.')
  const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numeros}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'amorins-site' },
    cache: 'no-store',
  })
  if (resposta.status === 404) throw new Error('CNPJ não encontrado na Receita Federal.')
  if (!resposta.ok) throw new Error(`A consulta do CNPJ falhou (código ${resposta.status}). Tente de novo mais tarde.`)
  return resposta.json()
}
