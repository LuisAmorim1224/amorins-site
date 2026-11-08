/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bibliotecas com arquivos próprios (schemas, fontes, leitor de PDF): rodam sem empacotar.
  serverExternalPackages: ['open-nfse', 'pdfkit', 'unpdf'],
  // O validador do XML da nota carrega este arquivo em tempo de execução; a Vercel precisa levá-lo junto.
  outputFileTracingIncludes: {
    '/**': ['./node_modules/xmllint-wasm/xmllint.wasm'],
  },
}

export default nextConfig
