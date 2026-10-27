-- Rode este arquivo uma vez no Supabase: SQL Editor > New query > colar > Run.

create table if not exists public.clientes (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  cpf_cnpj text,
  telefone text,
  valor_honorario numeric(10, 2),
  dia_vencimento int check (dia_vencimento between 1 and 28),
  asaas_customer_id text,
  asaas_subscription_id text,
  criado_em timestamptz not null default now()
);

alter table public.clientes enable row level security;

-- Cada cliente só enxerga o próprio cadastro. O administrador usa a chave de serviço.
drop policy if exists "cliente ve o proprio cadastro" on public.clientes;
create policy "cliente ve o proprio cadastro" on public.clientes
  for select using (auth.uid() = id);

-- Pasta privada de documentos: cada cliente tem uma subpasta com o próprio id.
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists "cliente le os proprios documentos" on storage.objects;
create policy "cliente le os proprios documentos" on storage.objects
  for select using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
