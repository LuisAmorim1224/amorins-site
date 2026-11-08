import { formatarCnpj } from '@/lib/cnpj'
import { CNPJ_ESCRITORIO, linkWhatsapp } from '@/lib/contato'
import { reais } from '@/lib/formato'

// Passo a passo da procuração eletrônica e resultado do relatório de situação fiscal.

export function Procuracao() {
  return (
    <div className="diag-passos">
      <h2>Autorize a consulta: procuração eletrônica no e-CAC</h2>
      <p>
        O relatório de situação fiscal só sai com a sua autorização. É gratuito, leva uns 5 minutos e você pode
        cancelar quando quiser.
      </p>
      <ol>
        <li>
          Entre no <a href="https://cav.receita.fazenda.gov.br" target="_blank" rel="noreferrer">e-CAC</a> com a conta
          gov.br (nível prata ou ouro) do responsável pela empresa ou com o certificado digital da empresa.
        </li>
        <li>Se entrou com o CPF, clique em <strong>Alterar perfil de acesso</strong> e escolha o CNPJ da empresa.</li>
        <li>
          Vá em <strong>Senhas e Procurações</strong> › <strong>Cadastro, Consulta e Cancelamento - Procuração para e-CAC</strong> ›{' '}
          <strong>Cadastrar procuração</strong>.
        </li>
        <li>
          Em procurador, informe o CNPJ da Amorins Contábil: <strong className="diag-cnpj">{formatarCnpj(CNPJ_ESCRITORIO)}</strong>
        </li>
        <li>Escolha a validade (sugestão: 1 ano) e marque os serviços. O mais simples é marcar todos os serviços.</li>
        <li>Confirme. Pronto!</li>
      </ol>
    </div>
  )
}

export function Relatorio({ diag }) {
  const resumo = diag.resumo || {}
  const whats = linkWhatsapp(`Olá! Fiz o diagnóstico do CNPJ ${formatarCnpj(diag.cnpj)} pelo site e quero regularizar.`)
  if (resumo.semPendencias) {
    return (
      <div className="diag-final ok">
        <h2>Nenhuma pendência na Receita Federal e na PGFN</h2>
        <p>O relatório de situação fiscal não mostrou débitos nem declarações em atraso. Sua empresa pode tirar certidão negativa.</p>
        <a href={whats} className="botao-primario" target="_blank" rel="noreferrer">Falar com o contador</a>
      </div>
    )
  }
  return (
    <div className="diag-final">
      <h2>O que precisa ser feito</h2>
      {resumo.pendencias?.length ? (
        <ul className="diag-pendencias">
          {resumo.pendencias.map((p) => (
            <li key={p.tipo}>
              <h3>{p.titulo}</h3>
              <p>{p.acao}</p>
              {p.declaracoes?.length > 0 && <p className="info">Declarações: {p.declaracoes.join(', ')}{p.anos?.length ? ` (${p.anos.join(', ')})` : ''}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p>Recebemos o seu relatório. O contador está analisando as pendências.</p>
      )}
      {diag.valor !== null && diag.valor !== undefined ? (
        <div className="diag-valor">
          <span>Valor para regularizar</span>
          <strong>{reais(diag.valor)}</strong>
          <small>Honorários do escritório. Impostos e multas em atraso são pagos à parte, direto ao governo, e podem ser parcelados.</small>
        </div>
      ) : (
        <p className="diag-orcamento">O contador vai conferir o relatório e te enviar o orçamento pelo WhatsApp.</p>
      )}
      <p className="info">Resumo automático. O contador confere o relatório completo antes de começar o serviço.</p>
      <a href={whats} className="botao-primario" target="_blank" rel="noreferrer">Quero regularizar</a>
    </div>
  )
}
