-- P06 足跡 / Read-only Health Check / V0.5
-- 僅查詢 P06 物件，不更動任何資料或權限。

select
  to_regclass('public."TblP06DiaryLogs"') as diary_table,
  to_regclass('public."IdxP06DiaryLogsCreatedAt"') as idx_created_at,
  to_regclass('public."IdxP06DiaryLogsEntryDate"') as idx_entry_date,
  to_regclass('public."IdxP06DiaryLogsAccessCodeEntryDate"') as idx_access_code_entry_date,
  to_regclass('public."VwP06TodayLogs"') as today_view;

select
  count(*) as total_rows,
  min(created_at) as earliest_record,
  max(created_at) as latest_record
from public."TblP06DiaryLogs";

-- Confirm P06 RLS status only.
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'TblP06DiaryLogs';

-- List policies attached specifically to P06 only.
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
