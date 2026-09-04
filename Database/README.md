# P06 Database Migration — V0.5

本資料夾只處理 P06「足跡」自己的資料庫物件。

## 執行順序

1. 執行 `01_P06_NamingMigration.sql`
2. 執行 `99_P06_HealthCheck.sql`
3. 確認原有資料筆數、最早/最新紀錄與 RLS Policy 均正常
4. 再部署本版前端

## 本次變更

- `public.tblp06_diary_logs` → `public."TblP06DiaryLogs"`
- `idx_tblp06_diary_logs_created_at` → `"IdxP06DiaryLogsCreatedAt"`
- `idx_tblp06_diary_logs_entry_date` → `"IdxP06DiaryLogsEntryDate"`
- `idx_tblp06_diary_logs_access_code_entry_date` → `"IdxP06DiaryLogsAccessCodeEntryDate"`
- `public.vw_tblp06_today_logs` → `public."VwP06TodayLogs"`

## 權限安全限制

本次 migration：

- 沒有 `GRANT`
- 沒有 `REVOKE`
- 沒有修改 `public` schema 權限
- 沒有建立或刪除其他 P 專案的物件
- 沒有重建 P06 Policy；原 Policy 仍附著於同一張 table
- 沒有 COPY / INSERT / DELETE diary 歷史資料

本版暫不加入 Supabase Auth 或帳號功能。
