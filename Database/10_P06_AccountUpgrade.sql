-- P06 足跡 / V0.6 / Account Upgrade
-- PURPOSE: Add account ownership to P06 diary logs and replace legacy public RLS with per-user RLS.
-- HARD SAFETY SCOPE:
--   * Only modifies public."TblP06DiaryLogs" and P06-specific function/policies/index.
--   * Does NOT alter any other P project table, policy, grant, schema, or default privilege.
--   * Does NOT create triggers on auth.users.
--   * Does NOT modify auth.users. auth.users is referenced only by a foreign key.

begin;

-- 1) Add nullable owner column. Existing legacy rows remain untouched and unowned until claimed.
alter table public."TblP06DiaryLogs"
  add column if not exists "UserID" uuid null references auth.users(id) on delete set null;

comment on column public."TblP06DiaryLogs"."UserID"
  is 'Supabase Auth user id. NULL means legacy access-code record not yet claimed.';

-- 2) New account-mode records no longer require access_code.
-- Existing access_code values are preserved for legacy claiming.
alter table public."TblP06DiaryLogs"
  alter column access_code drop not null;

alter table public."TblP06DiaryLogs"
  alter column access_code drop default;

comment on column public."TblP06DiaryLogs".access_code
  is 'Legacy P06 access code retained only for migration/claiming of pre-account records.';

-- 3) P06-only account query index.
create index if not exists "IdxP06DiaryLogsUserEntryDate"
  on public."TblP06DiaryLogs" ("UserID", entry_date desc, created_at desc);

-- 4) Replace ONLY the two known legacy P06 public policies.
drop policy if exists "p06 public read" on public."TblP06DiaryLogs";
drop policy if exists "p06 public insert" on public."TblP06DiaryLogs";

-- Idempotent replacement of V0.6 P06 policies.
drop policy if exists "P06 select own diary logs" on public."TblP06DiaryLogs";
drop policy if exists "P06 insert own diary logs" on public."TblP06DiaryLogs";

create policy "P06 select own diary logs"
  on public."TblP06DiaryLogs"
  for select
  to authenticated
  using (auth.uid() = "UserID");

create policy "P06 insert own diary logs"
  on public."TblP06DiaryLogs"
  for insert
  to authenticated
  with check (
    auth.uid() = "UserID"
    and char_length(trim(content)) > 0
    and source in ('keyboard', 'voice')
  );

-- 5) P06-only table privileges.
-- Anonymous users can no longer read/write P06 diary data.
revoke all on table public."TblP06DiaryLogs" from public;
revoke all on table public."TblP06DiaryLogs" from anon;
grant select, insert on table public."TblP06DiaryLogs" to authenticated;

-- The legacy P06 view is not used by V0.6; explicitly prevent it from bypassing account privacy.
revoke all on table public."VwP06TodayLogs" from public;
revoke all on table public."VwP06TodayLogs" from anon;
revoke all on table public."VwP06TodayLogs" from authenticated;

-- 6) Legacy claim function.
-- A logged-in user can claim only rows that are still unowned and whose legacy access_code matches.
create or replace function public.p06_claim_legacy_logs(p_access_code text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := trim(coalesce(p_access_code, ''));
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'P06_AUTH_REQUIRED';
  end if;

  if length(v_code) = 0 or length(v_code) > 50 then
    raise exception 'P06_INVALID_ACCESS_CODE';
  end if;

  update public."TblP06DiaryLogs"
     set "UserID" = v_uid
   where "UserID" is null
     and access_code = v_code;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.p06_claim_legacy_logs(text) from public;
revoke all on function public.p06_claim_legacy_logs(text) from anon;
grant execute on function public.p06_claim_legacy_logs(text) to authenticated;

-- Refresh PostgREST schema cache so the new RPC is discoverable immediately.
notify pgrst, 'reload schema';

commit;

-- Read-only summary
select
  count(*) as total_rows,
  count(*) filter (where "UserID" is null) as legacy_unclaimed_rows,
  count(*) filter (where "UserID" is not null) as account_owned_rows
from public."TblP06DiaryLogs";
