-- P06 足跡 / V0.6.1 / RPC function naming + schema-cache repair
-- SAFE SCOPE: only the P06 legacy-claim function is changed.
-- No table grants, schema grants, default privileges, or non-P06 objects are touched.

begin;

-- Remove the previous quoted mixed-case P06 RPC if it exists.
drop function if exists public."P06ClaimLegacyLogs"(text);

-- Recreate with a PostgREST-friendly lowercase snake_case name.
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

-- Ask PostgREST to refresh only its schema metadata cache.
-- This does not change database permissions or data.
notify pgrst, 'reload schema';

commit;

select
  to_regprocedure('public.p06_claim_legacy_logs(text)') as rpc_function,
  has_function_privilege('authenticated', 'public.p06_claim_legacy_logs(text)', 'EXECUTE') as authenticated_can_execute;
