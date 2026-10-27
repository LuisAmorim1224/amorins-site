# Site da Amorins Contábil

Página institucional + **Área do Cliente**, onde cada cliente entra com e-mail e senha para:

- baixar os documentos que o escritório enviou para ele;
- ver e pagar os honorários (boleto ou PIX) gerados automaticamente todo mês pelo Asaas;
- trocar a própria senha.

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
2. No menu **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
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
