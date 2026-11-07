/** @type {import('next').NextConfig} */
const nextConfig = {
  // Biblioteca da NFS-e usa arquivos próprios (schemas, fontes do PDF): roda sem empacotar.
  serverExternalPackages: ['open-nfse'],
  // O validador do XML da nota carrega este arquivo em tempo de execução; a Vercel precisa levá-lo junto.
  outputFileTracingIncludes: {
    '/**': ['./node_modules/xmllint-wasm/xmllint.wasm'],
  },
}

export default nextConfig
