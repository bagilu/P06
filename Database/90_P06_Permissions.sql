-- P06 足跡 / V0.7 / P06-only permissions
-- SBI-P-SDS v3.1: 修 P06，只修 P06。
-- Safe to rerun. No schema-wide/default privileges and no non-P06 objects.

revoke all on table public."TblP06DiaryLogs" from public;
revoke all on table public."TblP06DiaryLogs" from anon;
grant select, insert on table public."TblP06DiaryLogs" to authenticated;

revoke all on table public."VwP06TodayLogs" from public;
revoke all on table public."VwP06TodayLogs" from anon;
revoke all on table public."VwP06TodayLogs" from authenticated;

revoke all on function public.p06_claim_legacy_logs(text) from public;
revoke all on function public.p06_claim_legacy_logs(text) from anon;
grant execute on function public.p06_claim_legacy_logs(text) to authenticated;

select
  has_table_privilege('anon', 'public."TblP06DiaryLogs"', 'SELECT') as anon_can_select,
  has_table_privilege('anon', 'public."TblP06DiaryLogs"', 'INSERT') as anon_can_insert,
  has_table_privilege('authenticated', 'public."TblP06DiaryLogs"', 'SELECT') as authenticated_can_select,
  has_table_privilege('authenticated', 'public."TblP06DiaryLogs"', 'INSERT') as authenticated_can_insert,
  has_function_privilege('authenticated', 'public.p06_claim_legacy_logs(text)', 'EXECUTE') as authenticated_can_claim_legacy;
