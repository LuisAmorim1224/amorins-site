// CNAE do cartão do CNPJ -> código de tributação nacional da NFS-e (cTribNac).
// O CNAE não é o código da nota: cada atividade corresponde a um item da lista de serviços
// (LC 116/2003) no Emissor Nacional. Não há tabela oficial única CNAE x cTribNac (a prefeitura
// é quem administra os códigos), então esta lista é a correspondência usada pelo escritório.
// `confirmado` = já usado em nota aceita pelo Emissor Nacional para algum cliente.
// `semIss` = atividade fora da lista do ISS (comércio, locação de bens): não gera NFS-e de serviço.
export const CNAE_PARA_SERVICO = [
  { cnae: '4930201', codigos: [{ cod: '160201', nome: 'Outros serviços de transporte de natureza municipal', confirmado: true }] },
  { cnae: '4930202', codigos: [], obs: 'Transporte intermunicipal/interestadual de carga: ICMS (CT-e), não NFS-e.' },
  { cnae: '7319002', codigos: [{ cod: '170601', nome: 'Propaganda e publicidade, promoção de vendas', confirmado: true }] },
  { cnae: '7311400', codigos: [{ cod: '170601', nome: 'Propaganda e publicidade, promoção de vendas', confirmado: true }] },
  { cnae: '7319003', codigos: [{ cod: '170601', nome: 'Propaganda e publicidade, promoção de vendas', confirmado: true }] },
  { cnae: '7319004', codigos: [{ cod: '170601', nome: 'Propaganda e publicidade, promoção de vendas', confirmado: true }] },
  { cnae: '4399199', codigos: [{ cod: '070202', nome: 'Execução de obras de construção civil (concretagem) por empreitada ou subempreitada', confirmado: true }] },
  { cnae: '4322302', codigos: [{ cod: '070201', nome: 'Execução de obras de construção civil (instalações) por administração', confirmado: true }], obs: 'Instalação de ar-condicionado em obra; manutenção fora de obra cabe no item 14.' },
  { cnae: '7732201', codigos: [], semIss: true, obs: 'Locação de máquinas sem operador não é serviço do ISS (sem NFS-e de serviço; nas notas da M3 aparece como 99.01.01).' },
  { cnae: '7732202', codigos: [], semIss: true, obs: 'Locação de andaimes sem operador não é serviço do ISS.' },
  { cnae: '6201501', codigos: [{ cod: '010101', nome: 'Análise e desenvolvimento de sistemas' }] },
  { cnae: '6201502', codigos: [{ cod: '010101', nome: 'Análise e desenvolvimento de sistemas' }] },
  { cnae: '6202300', codigos: [{ cod: '010101', nome: 'Análise e desenvolvimento de sistemas' }] },
  { cnae: '6203100', codigos: [{ cod: '010501', nome: 'Licenciamento ou cessão de direito de uso de programas de computação' }] },
  { cnae: '6204000', codigos: [{ cod: '010601', nome: 'Assessoria e consultoria em informática' }] },
  { cnae: '6209100', codigos: [{ cod: '010701', nome: 'Suporte técnico em informática' }] },
  { cnae: '6311900', codigos: [{ cod: '010301', nome: 'Processamento, armazenamento ou hospedagem de dados' }] },
  { cnae: '6319400', codigos: [{ cod: '010301', nome: 'Processamento, armazenamento ou hospedagem de dados' }] },
  { cnae: '7490104', codigos: [{ cod: '100201', nome: 'Agenciamento, corretagem ou intermediação de títulos, contratos e direitos' }] },
  { cnae: '8630504', codigos: [{ cod: '041201', nome: 'Odontologia' }] },
  { cnae: '8630501', codigos: [{ cod: '040101', nome: 'Medicina' }] },
  { cnae: '8630503', codigos: [{ cod: '040101', nome: 'Medicina' }] },
  { cnae: '9313100', codigos: [{ cod: '060401', nome: 'Ginástica, dança, esportes, natação, artes marciais e atividades físicas' }] },
  { cnae: '8591100', codigos: [{ cod: '060401', nome: 'Ginástica, dança, esportes, natação, artes marciais e atividades físicas' }] },
  { cnae: '8599604', codigos: [{ cod: '080201', nome: 'Instrução, treinamento, orientação pedagógica, avaliação de conhecimentos' }] },
  { cnae: '8599699', codigos: [{ cod: '080201', nome: 'Instrução, treinamento, orientação pedagógica, avaliação de conhecimentos' }] },
  { cnae: '7020400', codigos: [{ cod: '170101', nome: 'Assessoria ou consultoria de qualquer natureza' }] },
  { cnae: '6920601', codigos: [{ cod: '171901', nome: 'Contabilidade' }] },
  { cnae: '4520001', codigos: [{ cod: '140101', nome: 'Manutenção e conserto de veículos' }] },
  { cnae: '4520002', codigos: [{ cod: '140101', nome: 'Manutenção e conserto de veículos' }] },
  { cnae: '4520005', codigos: [{ cod: '140101', nome: 'Manutenção e conserto de veículos' }] },
  { cnae: '8121400', codigos: [{ cod: '070101', nome: 'Limpeza e conservação de imóveis' }] },
  { cnae: '5611201', codigos: [], semIss: true, obs: 'Restaurante/lanchonete: venda de mercadoria (ICMS, NFC-e), não NFS-e.' },
  { cnae: '5611203', codigos: [], semIss: true, obs: 'Lanchonete/sorveteria: venda de mercadoria (ICMS, NFC-e), não NFS-e.' },
  { cnae: '1053800', codigos: [], semIss: true, obs: 'Fabricação de sorvetes: indústria (ICMS/IPI), não NFS-e.' },
]

const so = (v) => String(v || '').replace(/\D/g, '')
const formatar = (c) => `${c.slice(0, 2)}.${c.slice(2, 4)}.${c.slice(4, 6)}`

// Linhas "CNAE do cartão -> código da nota" para os CNAEs do cliente.
// `usados`: { cod_trib_nac: quantidade de notas do cliente com esse código }.
export function servicosDosCnaes(cliente, usados = {}) {
  const cnaes = [
    cliente.cnae_principal && { ...cliente.cnae_principal, principal: true },
    ...(cliente.cnaes_secundarios || []),
  ].filter(Boolean)
  return cnaes.map((c) => {
    const regra = CNAE_PARA_SERVICO.find((r) => r.cnae === so(c.codigo))
    return {
      cnae: c.codigo,
      descricao: c.descricao || '',
      principal: Boolean(c.principal),
      conhecido: Boolean(regra),
      semIss: Boolean(regra?.semIss),
      obs: regra?.obs || (regra ? '' : 'CNAE sem correspondência cadastrada: escolha o código no Emissor Nacional.'),
      sugestoes: (regra?.codigos || []).map((s) => ({ ...s, codigo: formatar(s.cod), notas: usados[s.cod] || 0 })),
    }
  })
}
