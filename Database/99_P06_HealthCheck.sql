-- P06 足跡 / V0.6 / Read-only Health Check
-- Queries P06 objects only. No writes and no permission changes.

select
  to_regclass('public."TblP06DiaryLogs"') as diary_table,
  to_regclass('public."IdxP06DiaryLogsCreatedAt"') as idx_created_at,
  to_regclass('public."IdxP06DiaryLogsEntryDate"') as idx_entry_date,
  to_regclass('public."IdxP06DiaryLogsAccessCodeEntryDate"') as idx_legacy_code,
  to_regclass('public."IdxP06DiaryLogsUserEntryDate"') as idx_user_entry_date,
  to_regprocedure('public.p06_claim_legacy_logs(text)') as claim_function;

select
  count(*) as total_rows,
  count(*) filter (where "UserID" is null) as legacy_unclaimed_rows,
  count(*) filter (where "UserID" is not null) as account_owned_rows,
  min(created_at) as earliest_record,
  max(created_at) as latest_record
from public."TblP06DiaryLogs";

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'TblP06DiaryLogs';

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'TblP06DiaryLogs'
order by policyname;

select
  has_table_privilege('anon', 'public."TblP06DiaryLogs"', 'SELECT') as anon_can_select_expected_false,
  has_table_privilege('anon', 'public."TblP06DiaryLogs"', 'INSERT') as anon_can_insert_expected_false,
  has_table_privilege('authenticated', 'public."TblP06DiaryLogs"', 'SELECT') as authenticated_can_select_expected_true,
  has_table_privilege('authenticated', 'public."TblP06DiaryLogs"', 'INSERT') as authenticated_can_insert_expected_true;
