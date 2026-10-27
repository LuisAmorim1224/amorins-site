export const reais = (valor) =>
  Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const dataBR = (data) => {
  if (!data) return ''
  // Datas "AAAA-MM-DD" do Asaas não têm fuso; evita voltar um dia.
  const d = data.length === 10 ? new Date(`${data}T12:00:00`) : new Date(data)
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' })
}

export const tamanho = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}
