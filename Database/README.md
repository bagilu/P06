# P06 Database — V0.6 Account Upgrade

本資料夾只處理 P06「足跡」自己的資料庫物件。帳號身分由 Supabase Auth 提供，但本版**不建立 auth.users trigger、不修改 auth.users 權限、不修改其他 P 專案**。

## 從 V0.5.1 升級的執行順序

1. 確認 V0.5.1 已可正常寫入。
2. 執行 `10_P06_AccountUpgrade.sql`。
3. 執行 `99_P06_HealthCheck.sql`。
4. 部署 V0.6 前端。
5. 註冊／登入帳號。
6. 如有舊 access code，在登入後使用「匯入舊足跡」一次性歸戶。

`01_P06_NamingMigration.sql` 是更早版本才需要的命名遷移；若目前 table 已是 `"TblP06DiaryLogs"`，不必重跑。

## V0.6 資料模型

`public."TblP06DiaryLogs"` 新增：

- `"UserID" uuid NULL REFERENCES auth.users(id)`

既有舊資料先維持 `UserID = NULL`；輸入舊 access code 並執行歸戶後，符合 code 且尚未歸戶的資料會綁到目前登入帳號。

新帳號模式的紀錄：

- 直接以 `UserID = auth.uid()` 區分使用者。
- `access_code` 不再是新紀錄的登入或安全機制。

## RLS

V0.6 移除 P06 舊的匿名 public read / insert policy，改為：

- authenticated user 只能 SELECT 自己 `UserID` 的資料。
- authenticated user 只能 INSERT `UserID = auth.uid()` 的資料。

舊的未歸戶資料 (`UserID IS NULL`) 不會經一般 SELECT 暴露；只能透過 P06 專用 claim function 依舊 access code 歸戶。

## 權限安全範圍

本版 SQL **沒有**：

- `GRANT ... ON ALL TABLES`
- `REVOKE ... ON ALL TABLES`
- `ALTER DEFAULT PRIVILEGES`
- `GRANT/REVOKE ON SCHEMA public`
- 其他 `TblPxx...` 物件操作
- auth.users trigger
- auth schema 權限修改

只有 P06 table / P06 policy / P06 index / P06 function 的精確物件級操作。
