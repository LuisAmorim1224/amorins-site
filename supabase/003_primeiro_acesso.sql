-- Login pelo CNPJ: enquanto o cliente estiver com a senha inicial (6 primeiros dígitos do CNPJ,
-- que é público), o banco não entrega nenhum dado dele, nem pelo site nem direto pela API.
-- A marca fica em app_metadata.trocar_senha, que só o servidor (chave de serviço) altera.
-- Rode uma vez no Supabase depois do 002: SQL Editor > New query > colar > Run.

create or replace function public.senha_liberada() returns boolean
language sql stable
as $$
  select not coalesce((auth.jwt() -> 'app_metadata' ->> 'trocar_senha')::boolean, false)
$$;

drop policy if exists "cliente ve o proprio cadastro" on public.clientes;
create policy "cliente ve o proprio cadastro" on public.clientes
  for select using (auth.uid() = id and public.senha_liberada());

drop policy if exists "cliente ve os proprios socios" on public.socios;
create policy "cliente ve os proprios socios" on public.socios
  for select using (auth.uid() = cliente_id and public.senha_liberada());

drop policy if exists "cliente ve as informacoes dos proprios documentos" on public.documentos_info;
create policy "cliente ve as informacoes dos proprios documentos" on public.documentos_info
  for select using (auth.uid() = cliente_id and public.senha_liberada());

drop policy if exists "cliente le os proprios documentos" on storage.objects;
create policy "cliente le os proprios documentos" on storage.objects
  for select using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.senha_liberada()
  );
