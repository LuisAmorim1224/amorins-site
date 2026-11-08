'use client'

import { useActionState } from 'react'
import { consultarCnpj, pedirDiagnosticoCompleto } from '@/app/regularizar/acoes'
import { RESUMO_DO_NIVEL } from '@/lib/diagnostico'
import AlertasDiagnostico from './AlertasDiagnostico'

const mascara = (valor) => {
  const s = valor.replace(/\D/g, '').slice(0, 14)
  return s
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function PedidoCompleto({ cnpj }) {
  const [estado, acao, enviando] = useActionState(pedirDiagnosticoCompleto, {})
  return (
    <form action={acao} className="form-recomendacao diag-pedido">
      <h3>Quer o diagnóstico completo?</h3>
      <p>
        Débitos, declarações em atraso e dívida ativa não aparecem nos dados públicos. Com a sua autorização,
        puxamos o <strong>Relatório de Situação Fiscal</strong> da Receita e da PGFN e mostramos o que precisa
        ser feito e quanto custa para regularizar.
      </p>
      <input type="hidden" name="cnpj" value={cnpj} />
      <div className="duas">
        <label>
          Seu nome
          <input name="nome" required maxLength={80} autoComplete="name" />
        </label>
        <label>
          WhatsApp com DDD
          <input name="whatsapp" required inputMode="tel" autoComplete="tel" placeholder="(71) 99999-9999" />
        </label>
      </div>
      <label>
        E-mail (opcional)
        <input name="email" type="email" maxLength={120} autoComplete="email" />
      </label>
      <label className="armadilha" aria-hidden="true">
        Site
        <input name="site" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="autorizo">
        <input type="checkbox" name="consentimento" required />
        Autorizo a Amorins Contábil a guardar estes dados e os da empresa para fazer o diagnóstico e entrar
        em contato comigo sobre ele (LGPD). Os dados não são compartilhados com terceiros e posso pedir a
        exclusão a qualquer momento.
      </label>
      <button className="botao-primario" disabled={enviando}>
        {enviando ? 'Enviando...' : 'Quero o diagnóstico completo'}
      </button>
      {estado.erro && <p className="erro">{estado.erro}</p>}
    </form>
  )
}

export default function FormDiagnostico() {
  const [estado, acao, consultando] = useActionState(consultarCnpj, {})
  return (
    <div className="diag">
      <form action={acao} className="diag-busca">
        <label htmlFor="cnpj">CNPJ da empresa</label>
        <div>
          <input
            id="cnpj"
            name="cnpj"
            required
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
            defaultValue={estado.cnpj ? mascara(estado.cnpj) : ''}
            onChange={(e) => (e.target.value = mascara(e.target.value))}
          />
          <button className="botao-primario" disabled={consultando}>
            {consultando ? 'Consultando...' : 'Ver diagnóstico grátis'}
          </button>
        </div>
        {estado.erro && <p className="erro">{estado.erro}</p>}
      </form>

      {estado.alertas && (
        <>
          <p className={`diag-resumo ${estado.nivel}`}>{RESUMO_DO_NIVEL[estado.nivel]}</p>
          <AlertasDiagnostico cnpj={estado.cnpj} empresa={estado.empresa} alertas={estado.alertas} />
          <PedidoCompleto key={estado.cnpj} cnpj={estado.cnpj} />
        </>
      )}
    </div>
  )
}
