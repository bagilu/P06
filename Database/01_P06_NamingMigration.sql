-- P06 足跡 / Naming Migration / V0.5
-- 目的：將舊命名 public.tblp06_diary_logs 一致化為 public."TblP06DiaryLogs"
-- 安全原則：
--   1. 只操作 P06 自己的 table / index / view。
--   2. 不使用 GRANT / REVOKE。
--   3. 不修改 public schema 權限。
--   4. 不 DROP / CREATE 任何其他專案物件。
--   5. 不搬移、不複製、不刪除既有 diary 資料。
--
-- 執行前建議先確認舊表筆數：
-- SELECT count(*) FROM public.tblp06_diary_logs;

begin;

-- 1) Rename P06 table only.
do $$
begin
  if to_regclass('public."TblP06DiaryLogs"') is not null
     and to_regclass('public.tblp06_diary_logs') is not null then
    raise exception 'P06 migration stopped: both old and new table names exist. No changes were applied.';
  elsif to_regclass('public."TblP06DiaryLogs"') is null
     and to_regclass('public.tblp06_diary_logs') is not null then
    alter table public.tblp06_diary_logs rename to "TblP06DiaryLogs";
  elsif to_regclass('public."TblP06DiaryLogs"') is null then
    raise exception 'P06 migration stopped: neither old nor new P06 diary table was found.';
  end if;
end $$;

-- 2) Rename P06 indexes only. Index definitions/data are unchanged.
do $$
begin
  if to_regclass('public.idx_tblp06_diary_logs_created_at') is not null
     and to_regclass('public."IdxP06DiaryLogsCreatedAt"') is null then
    alter index public.idx_tblp06_diary_logs_created_at rename to "IdxP06DiaryLogsCreatedAt";
  end if;

  if to_regclass('public.idx_tblp06_diary_logs_entry_date') is not null
     and to_regclass('public."IdxP06DiaryLogsEntryDate"') is null then
    alter index public.idx_tblp06_diary_logs_entry_date rename to "IdxP06DiaryLogsEntryDate";
  end if;

  if to_regclass('public.idx_tblp06_diary_logs_access_code_entry_date') is not null
     and to_regclass('public."IdxP06DiaryLogsAccessCodeEntryDate"') is null then
    alter index public.idx_tblp06_diary_logs_access_code_entry_date rename to "IdxP06DiaryLogsAccessCodeEntryDate";
  end if;
end $$;

-- 3) Rename the P06 view only. PostgreSQL dependency remains attached to the renamed table.
do $$
begin
  if to_regclass('public.vw_tblp06_today_logs') is not null
     and to_regclass('public."VwP06TodayLogs"') is null then
    alter view public.vw_tblp06_today_logs rename to "VwP06TodayLogs";
  end if;
end $$;

commit;

-- Verification (read-only):
select count(*) as p06_total_rows from public."TblP06DiaryLogs";
