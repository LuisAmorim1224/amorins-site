# Site da Amorins Contábil

Página institucional + **Área do Cliente**, onde cada cliente entra com e-mail e senha para:

- baixar os documentos que o escritório enviou para ele;
- ver e pagar os honorários (boleto ou PIX) gerados automaticamente todo mês pelo Asaas;
- ver a ficha da empresa (dados da Receita, CNAEs, sócios) e as pendências;
- trocar a própria senha.

### Acesso pelo CNPJ

- Cliente com CNPJ entra com o **próprio CNPJ**; a senha inicial são os **6 primeiros números** do CNPJ.
- Como o CNPJ é público, no primeiro acesso o cliente é **obrigado a criar uma senha nova** (mínimo 8 caracteres, sem o CNPJ). Até lá o banco não entrega nenhum dado dele (regras em `003_primeiro_acesso.sql`).
- Por trás, cada CNPJ vira um e-mail interno `CNPJ@clientes.amorinscontabilidade.com.br`, que ninguém usa nem recebe. O e-mail de contato é opcional.
- Se o cliente esquecer a senha, o admin clica em **Restaurar senha inicial** na página do cliente.
- Cliente com CPF continua entrando com e-mail e senha.

### Ficha cadastral

- Ao cadastrar um cliente com CNPJ, o site consulta os dados públicos da Receita Federal (pela BrasilAPI) e preenche razão social, situação, CNAEs, endereço e sócios. O botão **Atualizar dados pela Receita Federal** repete a consulta.
- Na ficha do cliente dá para **importar o arquivo `cadastro-cliente.json`** (dados do sócio, NIRE, pendências) e classificar automaticamente os documentos que já estão na pasta com o mesmo nome.
- Cada documento enviado tem **tipo** (Cartão CNPJ, contrato social, documento pessoal...) e **validade** opcional.
- O site aponta sozinho as pendências: documentos que faltam, documentos vencidos ou vencendo em 30 dias, situação cadastral diferente de ATIVA.

O administrador (você) entra pelo mesmo login e cai na página `/admin`, onde cadastra clientes, envia documentos e acompanha as cobranças.

## Como funciona

| Parte | Serviço | Custo |
|---|---|---|
| Site | Vercel (hospedagem) | Plano gratuito |
| Login e arquivos | Supabase | Plano gratuito |
| Cobrança mensal | Asaas (assinatura recorrente) | Taxa por cobrança paga |
| Endereço | registro.br | cerca de R$ 40/ano para .com.br |

Os documentos ficam numa pasta privada do Supabase, nunca no GitHub. Cada cliente só consegue abrir os arquivos da própria pasta.

Ao cadastrar um cliente com honorário, o site cria o cliente no Asaas e uma assinatura mensal com o valor e o dia de vencimento informados. A partir daí o Asaas gera a cobrança todo mês e avisa o cliente por e-mail. O cliente escolhe pagar por boleto, PIX ou cartão.

## Configuração (uma vez só)

### 1. Supabase
1. Crie uma conta em https://supabase.com e um projeto novo (região São Paulo).
2. No menu **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**. Depois, numa nova query, faça o mesmo com `supabase/002_ficha_cadastral.sql` (ficha da empresa, sócios e tipo/validade dos documentos), com `supabase/003_primeiro_acesso.sql` (bloqueia os dados enquanto o cliente não troca a senha inicial) e com `supabase/004_area_cliente.sql` (pedidos de nota, notas emitidas, envio de arquivos pelo cliente e anexo do Simples).
3. Em **Authentication > Users > Add user**, crie o seu usuário de administrador com o e-mail que vai em `ADMIN_EMAIL`.
4. Em **Project Settings > API**, copie a *Project URL*, a chave *anon* e a chave *service_role*.

### 2. Asaas
1. Crie a conta em https://www.asaas.com com o CNPJ do escritório.
2. Para testar sem cobrar ninguém, use a conta de testes em https://sandbox.asaas.com.
3. Em **Integrações > Chave de API**, gere a chave.

### 3. Vercel
1. Entre em https://vercel.com com a sua conta do GitHub e importe o repositório `amorins-site`.
2. Em **Environment Variables**, cadastre as variáveis do arquivo `.env.example` com os valores dos passos anteriores.
3. Clique em **Deploy**. O site fica num endereço provisório `*.vercel.app`.
4. Quando registrar o domínio, adicione em **Settings > Domains**.

Comece com `ASAAS_API_URL=https://api-sandbox.asaas.com/v3` e a chave do sandbox. Quando estiver tudo certo, troque para `https://api.asaas.com/v3` e a chave da conta real.

## Rodar no computador (opcional)

```bash
cp .env.example .env.local   # preencha os valores
npm install
npm run dev                  # abre em http://localhost:3000
npm test                     # testes das regras de vencimento e nomes de arquivo
```
