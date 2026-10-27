import { redirect } from 'next/navigation'
import { ehAdmin, getUsuario } from '@/lib/auth'
import FormLogin from './FormLogin'

export const metadata = { title: 'Área do Cliente · Amorins Contábil' }

export default async function Login() {
  const user = await getUsuario()
  if (user) redirect(ehAdmin(user) ? '/admin' : '/cliente')
  return (
    <main className="login">
      <a href="/">
        <img src="/logo.png" alt="Amorins Contábil" />
      </a>
      <h1>Área do Cliente</h1>
      <div className="caixa">
        <FormLogin />
      </div>
      <p className="vazio" style={{ marginTop: 16, textAlign: 'center' }}>
        Esqueceu a senha? Fale com a gente pelo (71) 99945-4356.
      </p>
    </main>
  )
}
