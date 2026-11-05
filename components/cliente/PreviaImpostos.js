import { reais } from '@/lib/formato'
import { previaMei, previaSimples, somarMeses, somarPorMes } from '@/lib/simples'

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const pct = (v) => `${(v * 100).toFixed(2).replace('.', ',')}%`

function GraficoMeses({ notas, mesAtual }) {
  const porMes = somarPorMes(notas)
  const meses = Array.from({ length: 12 }, (_, i) => somarMeses(mesAtual, i - 11))
  const maior = Math.max(1, ...meses.map((m) => porMes[m] || 0))
  return (
    <div className="grafico-meses" role="img" aria-label="Faturamento dos últimos 12 meses">
      {meses.map((m) => {
        const valor = porMes[m] || 0
        return (
          <div key={m} className="barra-mes" title={`${m}: ${reais(valor)}`}>
            <div className="coluna" style={{ height: `${Math.max(2, (valor / maior) * 100)}%` }} />
            <span>{MESES_CURTOS[Number(m.slice(5)) - 1]}</span>
          </div>
        )
      })}
    </div>
  )
}

// Prévia para o cliente: limite do MEI ou DAS estimado do Simples, conforme o regime.
export default function PreviaImpostos({ cliente, notas, hoje }) {
  const mesAtual = hoje.slice(0, 7)
  const ano = Number(hoje.slice(0, 4))
  const regime = cliente.regime_tributario

  let conteudo
  if (regime === 'MEI') {
    const p = previaMei({ notas, ano, dataAbertura: cliente.data_abertura })
    const tom = { dentro: 'ok', atencao: 'alerta', excesso_ate_20: 'perigo', excesso_acima_20: 'perigo' }[p.situacao]
    conteudo = (
      <>
        <div className="medidor">
          <div className={`medidor-barra ${tom}`} style={{ width: `${Math.min(100, p.percentual * 100)}%` }} />
        </div>
        <p>
          <strong>{reais(p.receita)}</strong> de {reais(p.limite)} em {ano}
          {p.meses < 12 && ` (limite proporcional a ${p.meses} meses de atividade)`} ·{' '}
          {Math.round(p.percentual * 100)}% do limite
        </p>
        <p className={tom === 'ok' ? 'ok' : 'aviso'}>{p.mensagem}</p>
      </>
    )
  } else if (regime === 'Simples Nacional') {
    const p = previaSimples({ notas, anexo: cliente.anexo_simples, competencia: mesAtual, dataAbertura: cliente.data_abertura })
    if (p.erro) conteudo = <p className="vazio">{p.erro}</p>
    else if (p.foraDoLimite) conteudo = <p className="aviso">{p.aviso} Fale com o escritório.</p>
    else
      conteudo = (
        <div className="grade-previa">
          <div><span className="rotulo">Faturamento do mês</span><strong>{reais(p.receitaMes)}</strong></div>
          <div><span className="rotulo">Últimos 12 meses (RBT12)</span><strong>{reais(p.rbt12)}</strong></div>
          <div><span className="rotulo">Alíquota efetiva</span><strong>{pct(p.aliquotaEfetiva)}</strong><span className="detalhe">{p.nomeAnexo}, faixa {p.faixa}</span></div>
          <div className="destaque"><span className="rotulo">DAS estimado do mês</span><strong>{reais(p.das)}</strong></div>
        </div>
      )
  } else {
    conteudo = <p className="vazio">O regime tributário da sua empresa ainda não foi informado pelo escritório.</p>
  }

  return (
    <div className="previa">
      <GraficoMeses notas={notas} mesAtual={mesAtual} />
      {conteudo}
      <p className="vazio pequeno">
        Prévia calculada pelas notas lançadas aqui. É uma estimativa para você se planejar: a apuração
        oficial é feita pelo escritório{regime === 'Simples Nacional' ? ' (não considera fator R, retenções ou receitas de exportação)' : ''}.
      </p>
    </div>
  )
}
