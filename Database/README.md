# P06 Database — V0.7 SDS v3.1

本資料夾只處理 P06「足跡」自己的資料庫物件。帳號身分由 shared Supabase Auth 提供；P06 不建立第二套帳密、不建立 auth.users trigger，也不修改其他 P 專案。

## 現行資料模型

主表：`public."TblP06DiaryLogs"`

- `"UserID" uuid NULL REFERENCES auth.users(id)`
- 新紀錄以 `UserID = auth.uid()` 歸屬登入者。
- 舊資料可維持 `UserID IS NULL`，透過 `p06_claim_legacy_logs(text)` 一次性歸戶。

## Auth / Authorization

P06 前端只做 sign-in。註冊、Email 驗證、forgot/reset/change password、帳號基本資料由 P130 Account Center 負責。

P06 RLS / RPC 只負責 P06 資料授權；不得以 shared Auth 取代專案自己的資料權限。

## Permissions

`90_P06_Permissions.sql` 只修：

- `public."TblP06DiaryLogs"`
- `public."VwP06TodayLogs"`
- `public.p06_claim_legacy_logs(text)`

沒有任何 schema-wide GRANT/REVOKE、ALTER DEFAULT PRIVILEGES 或其他 Pxx 物件。

## Health Check

`99_P06_HealthCheck.sql` 為唯讀，檢查 P06 table、UserID、index、RLS、policy、grants、RPC 與 SECURITY DEFINER 狀態。

## 舊 migration

- `01_P06_NamingMigration.sql`：舊命名遷移。
- `10_P06_AccountUpgrade.sql`：V0.6 帳號升級。
- `11_P06_RPCFunctionFix.sql`：legacy claim RPC 名稱修正。

已完成上述 migration 的正式資料庫不需要因 V0.7 前端 Auth 分工調整而重跑舊 migration。
