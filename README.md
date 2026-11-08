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

### Diagnóstico de CNPJ (página /regularizar)

- O botão **Regularizar meu CNPJ** leva para `/regularizar`. O visitante digita o CNPJ e vê na hora um **diagnóstico parcial** com os dados públicos da Receita (BrasilAPI): situação cadastral e motivo, MEI/Simples (inclusive exclusões), atividade e alertas. Nada é gravado nesse passo.
- Para o **diagnóstico completo**, ele deixa nome, WhatsApp e o aceite da LGPD. O pedido aparece no `/admin` em **Diagnósticos de CNPJ** e o visitante recebe um link próprio com o passo a passo da **procuração eletrônica no e-CAC** para o CNPJ do escritório.
- Com o **Integra Contador (Serpro)** configurado, o próprio visitante clica em **Já fiz a procuração** e o site puxa o **Relatório de Situação Fiscal** (SITFIS), guarda o PDF na pasta privada `diagnosticos`, resume as pendências (declarações em atraso, débitos, dívida ativa, parcelamentos, processos) e mostra o valor. Cada visitante tem no máximo 5 tentativas (cada uma é uma consulta paga ao Serpro).
- **Valor:** vem da tabela **Preços da regularização** no `/admin`. Só aparece quando todos os tipos de pendência encontrados têm preço; senão o visitante vê que o contador vai mandar o orçamento, e você define o valor no pedido.
- Sem o Integra Contador configurado, o fluxo funciona do mesmo jeito até a procuração e o visitante avisa pelo WhatsApp; você puxa o relatório no e-CAC.
- Para rodar: `supabase/007_diagnosticos.sql` no Supabase.
- Para ligar a consulta automática: contrate o Integra Contador na loja do Serpro com o CNPJ do escritório e cadastre na Vercel `SERPRO_CONSUMER_KEY`, `SERPRO_CONSUMER_SECRET`, `SERPRO_CERTIFICADO_PFX_BASE64` (o e-CNPJ A1 do escritório em base64) e `SERPRO_CERTIFICADO_SENHA`.

O administrador (você) entra pelo mesmo login e cai na página `/admin`, onde cadastra clientes, envia documentos e acompanha as cobranças.

### Nota fiscal automática (NFS-e pelo Emissor Nacional)

- O cliente pede a nota na Área do Cliente (tomador, descrição, valor e, se for serviço em obra, o endereço da obra).
- O site escolhe o **código de serviço** comparando a descrição com as notas anteriores do próprio cliente e repete o código usado. Se não houver nota parecida, ou se a descrição servir para mais de um serviço, o pedido fica em **Escolher o serviço** no painel do escritório.
- O escritório clica em **Emitir NFS-e** (ou liga "Emitir sozinho" no cliente). O site monta a DPS, assina com o **certificado A1 do cliente** e envia direto à API gratuita do Emissor Nacional. XML e PDF vão para os documentos do cliente e a nota entra na prévia de impostos.
- Na página do cliente, em **Nota fiscal automática**: regime, alíquota aproximada do Simples, certificado A1 (.pfx + senha, guardada cifrada), serviços com código nacional/NBS e o botão **Buscar notas anteriores no Emissor Nacional**, que importa as notas já emitidas (inclusive as feitas à mão no gov.br) e cadastra os códigos usados.
- Comece cada cliente em **Homologação** (nota de teste, sem valor fiscal) e só passe para **Produção** depois de uma nota de teste dar certo.
- Para rodar: `supabase/005_nfse.sql` no Supabase. A variável `NFSE_CHAVE_CERTIFICADOS` na Vercel é opcional (sem ela, a senha do certificado é cifrada com a chave secreta do Supabase).

## Como funciona

| Parte | Serviço | Custo |
|---|---|---|
| Site | Vercel (hospedagem) | Plano gratuito |
| Login e arquivos | Supabase | Plano gratuito |
| Cobrança mensal | Asaas (assinatura recorrente) | Taxa por cobrança paga |
| Endereço | registro.br | cerca de R$ 40/ano para .com.br |

Os documentos ficam numa pasta privada do Supabase, nunca no GitHub. Cada cliente só consegue abrir os arquivos da própria pasta.

A cobrança nunca começa sozinha. Depois de cadastrar o cliente, o escritório abre a página dele, informa o valor do honorário, marca a confirmação e clica em **Ativar cobrança mensal**. O site cria o cliente no Asaas e uma assinatura mensal com vencimento sempre no **dia 5**. A partir daí o Asaas gera a cobrança todo mês e avisa o cliente por e-mail. O cliente escolhe pagar por boleto, PIX ou cartão.

## Configuração (uma vez só)

### 1. Supabase
1. Crie uma conta em https://supabase.com e um projeto novo (região São Paulo).
2. No menu **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**. Depois, numa nova query, faça o mesmo com `supabase/002_ficha_cadastral.sql` (ficha da empresa, sócios e tipo/validade dos documentos), com `supabase/003_primeiro_acesso.sql` (bloqueia os dados enquanto o cliente não troca a senha inicial) e com `supabase/004_area_cliente.sql` (pedidos de nota, notas emitidas, envio de arquivos pelo cliente e anexo do Simples) e com `supabase/005_nfse.sql` (emissão automática de NFS-e).
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
