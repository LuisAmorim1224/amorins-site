// Sócios/equipe com acesso a parte dos clientes no painel do escritório.
// O papel e a lista de clientes ficam no app_metadata do usuário, que só o servidor altera.

export const PAPEL_SOCIO = 'socio'

export const ehSocio = (user) => user?.app_metadata?.papel === PAPEL_SOCIO

export function clientesDoSocio(user) {
  const lista = user?.app_metadata?.clientes
  return Array.isArray(lista) ? lista.map(String) : []
}

// `admin` vê todos; sócio só os clientes liberados para ele.
export function podeVerCliente(user, clienteId, admin = false) {
  if (admin) return true
  return ehSocio(user) && clientesDoSocio(user).includes(String(clienteId))
}

export function filtrarClientes(user, lista, admin = false) {
  if (admin) return lista || []
  const liberados = new Set(clientesDoSocio(user))
  return (lista || []).filter((c) => liberados.has(String(c.cliente_id ?? c.id)))
}
