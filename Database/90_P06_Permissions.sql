-- P06 足跡 / V0.6 / P06-only account permissions
-- Safe to rerun after 10_P06_AccountUpgrade.sql.
-- Does not touch any non-P06 object or schema-wide/default privileges.

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
  has_table_privilege('authenticated', 'public."TblP06DiaryLogs"', 'INSERT') as authenticated_can_insert;
