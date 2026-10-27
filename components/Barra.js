import { sair } from '@/app/acoes'

export default function Barra({ titulo, inicio }) {
  return (
    <div className="barra">
      <a href={inicio} className="marca">
        <img src="/logo.png" alt="" />
        Amorins Contábil · {titulo}
      </a>
      <form action={sair}>
        <button className="link">Sair</button>
      </form>
    </div>
  )
}
