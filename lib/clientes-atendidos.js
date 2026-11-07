// Clientes atendidos exibidos na página inicial (vitrine pública).
//
// LGPD: o nome do cliente só aparece no site quando `autorizado: true`
// (o cliente concordou em ser citado). Sem autorização, o card mostra
// apenas o segmento, a cidade e o trabalho feito, sem identificar a empresa.
// `logo` é opcional: caminho de um arquivo em /public (ex.: '/clientes/obeco.png'),
// e também só é usado com autorização.

export const CLIENTES_ATENDIDOS = [
  {
    nome: 'O Beco Gelato',
    segmento: 'Gelateria',
    cidade: 'Lauro de Freitas/BA',
    trabalho: 'Contabilidade mensal, Simples Nacional e emissão de notas fiscais (NF-e, NFC-e e NFS-e).',
    autorizado: false,
  },
  {
    nome: 'M3 Serviços Especializados em Concreto',
    segmento: 'Bombeamento de concreto',
    cidade: 'Salvador/BA',
    trabalho: 'Enquadramento das atividades (CNAE), Simples Nacional e emissão de NFS-e pelo Emissor Nacional.',
    autorizado: false,
  },
  {
    nome: 'Willian Gouveia MEI',
    segmento: 'Oficina mecânica (MEI)',
    cidade: 'Salvador/BA',
    trabalho: 'Regularização do MEI e documentação para cadastro como prestador de serviços.',
    autorizado: false,
  },
  {
    nome: 'Daniel Franco',
    segmento: 'Prestação de serviços',
    cidade: 'Simões Filho/BA',
    trabalho: 'Acompanhamento do Simples Nacional e emissão de notas fiscais de serviço.',
    autorizado: false,
  },
  {
    nome: 'Danilo Franco',
    segmento: 'Prestação de serviços',
    cidade: 'Simões Filho/BA',
    trabalho: 'Acompanhamento do Simples Nacional e emissão de notas fiscais de serviço.',
    autorizado: false,
  },
]

// O que pode ir para a página pública: sem autorização, nome e logo ficam de fora.
export function clientesPublicos(lista = CLIENTES_ATENDIDOS) {
  return lista.map(({ nome, logo, autorizado, ...resto }) =>
    autorizado ? { ...resto, nome, logo: logo || null } : { ...resto, nome: null, logo: null },
  )
}
