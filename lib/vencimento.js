// Data de hoje no fuso da Bahia, como { ano, mes, dia } (mes de 1 a 12).
export function hojeNaBahia(agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bahia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(agora)
  const valor = (tipo) => Number(partes.find((p) => p.type === tipo).value)
  return { ano: valor('year'), mes: valor('month'), dia: valor('day') }
}

// Próxima data (AAAA-MM-DD) com o dia de vencimento escolhido, sempre depois de hoje.
export function proximoVencimento(diaVencimento, hoje = hojeNaBahia()) {
  let { ano, mes } = hoje
  if (hoje.dia >= diaVencimento) {
    mes += 1
    if (mes > 12) {
      mes = 1
      ano += 1
    }
  }
  return `${ano}-${String(mes).padStart(2, '0')}-${String(diaVencimento).padStart(2, '0')}`
}
