-- ================================
-- Agenda Simples (React + Supabase)
-- Schema + RLS + RPC book_slot
-- ================================

-- Extensão para gen_random_uuid()
create extension if not exists pgcrypto;

-- =========
-- TABELAS
-- =========

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_minutes int not null default 60,
  created_at timestamptz not null default now()
);

create table if not exists public.time_slots (
  id uuid primary key default gen_random_uuid(),
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_booked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint time_valid check (end_at > start_at)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  phone text not null,
  service_id uuid not null references public.services(id) on delete restrict,
  time_slot_id uuid not null references public.time_slots(id) on delete restrict,
  created_at timestamptz not null default now(),
  -- garante que um mesmo slot só possa ser reservado 1 vez
  constraint uniq_booking_per_slot unique (time_slot_id)
);

-- =========
-- ÍNDICES
-- =========
create index if not exists idx_services_name on public.services (name);
create index if not exists idx_time_slots_available on public.time_slots (is_booked, start_at);
create index if not exists idx_bookings_service on public.bookings (service_id);
create index if not exists idx_bookings_slot on public.bookings (time_slot_id);

-- =====================================
-- RLS (Row-Level Security) + POLÍTICAS
-- =====================================
alter table public.services enable row level security;
alter table public.time_slots enable row level security;
alter table public.bookings enable row level security;

-- Limpa políticas antigas (idempotente: se não existirem, ignora)
do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='services' and policyname='Public read services') then
    drop policy "Public read services" on public.services;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='time_slots' and policyname='Public read available slots') then
    drop policy "Public read available slots" on public.time_slots;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='bookings' and policyname='No direct access to bookings') then
    drop policy "No direct access to bookings" on public.bookings;
  end if;
end$$;

-- Leitura pública de serviços
create policy "Public read services"
on public.services
for select
to anon, authenticated
using (true);

-- Leitura pública apenas de horários disponíveis e futuros
create policy "Public read available slots"
on public.time_slots
for select
to anon, authenticated
using (is_booked = false and start_at >= now());

-- Bloqueia qualquer acesso direto a bookings para usuários comuns.
-- (A função RPC security definer fará as inserções)
create policy "No direct access to bookings"
on public.bookings
for all
to anon, authenticated
using (false)
with check (false);

-- ======================================
-- GRANTS mínimos (leitura e execução)
-- ======================================
-- Revoga privilégios amplos
revoke all on public.services  from public;
revoke all on public.time_slots from public;
revoke all on public.bookings from public;

-- Concede só SELECT em services e time_slots
grant select on public.services   to anon, authenticated;
grant select on public.time_slots to anon, authenticated;

-- Não conceda insert/update/delete em bookings (reserva só via RPC)
revoke all on public.bookings from anon, authenticated;

-- ======================================
-- RPC book_slot (transação anti duplo-booking)
-- ======================================
-- Remove versão anterior (se existir) para evitar conflito de atributos
drop function if exists public.book_slot(text, text, text, uuid, uuid);

create or replace function public.book_slot(
  p_company_name text,
  p_contact_name text,
  p_phone        text,
  p_service_id   uuid,
  p_time_slot_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_is_booked boolean;
begin
  -- Trava o registro do slot para esta transação (lock de linha)
  select is_booked
    into v_is_booked
  from public.time_slots
  where id = p_time_slot_id
  for update;

  if not found then
    raise exception 'Horário não encontrado';
  end if;

  if v_is_booked then
    raise exception 'Horário já reservado';
  end if;

  -- Insere a reserva
  insert into public.bookings (company_name, contact_name, phone, service_id, time_slot_id)
  values (p_company_name, p_contact_name, p_phone, p_service_id, p_time_slot_id)
  returning id into v_id;

  -- Marca o slot como reservado
  update public.time_slots
     set is_booked = true
   where id = p_time_slot_id;

  return v_id;
end;
$$;

-- Garante que a função seja de propriedade do superuser 'postgres' (bypass RLS)
alter function public.book_slot(text, text, text, uuid, uuid) owner to postgres;

-- Permite execução da função para front-end (anon ou authenticated)
grant execute on function public.book_slot(text, text, text, uuid, uuid) to anon, authenticated;

-- ======================================
-- SEED opcional (remova se não quiser)
-- ======================================
-- Insere um serviço padrão caso a tabela esteja vazia
insert into public.services (name, duration_minutes)
select 'CONSULTORIA DE ESTRATÉGIA DE VENDAS – LÍQUIDA', 60
where not exists (select 1 from public.services);

-- Exemplo de horários (UTC). Ajuste datas/horas conforme sua agenda.
-- select now(); -- confira seu UTC antes
-- insert into public.time_slots (start_at, end_at) values
-- ('2025-09-15 18:00:00+00', '2025-09-15 19:00:00+00'),
-- ('2025-09-15 19:00:00+00', '2025-09-15 20:00:00+00');
