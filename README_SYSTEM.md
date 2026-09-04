# P06 足跡 — V0.6 Account Edition

P06 足跡是一個以 GitHub Pages + Supabase 建置的輕量個人時序日誌系統。本版由 access-code 分流正式升級為 Supabase Auth 帳號模式。

## 本版重點

1. Email + password 註冊／登入。
2. Supabase session 使用獨立 `storageKey = p06-auth-token`，避免與其他 P 專案 Auth session 混用。
3. `persistSession: true` + `autoRefreshToken: true`：同一手機／瀏覽器一般不需每次重新登入。
4. 新紀錄直接綁定 Supabase `auth.uid()`。
5. RLS 改為「登入者只看得到自己的紀錄」。
6. 舊 access-code 資料保留，登入後可用「匯入舊足跡」一次歸戶。
7. 保留原 V0.4/V0.5.1 的語音輸入與重複辨識去重機制。
8. 尚未加入 Passkey / 指紋；這會留到下一階段。

## 升級方式（由 V0.5.1）

1. Supabase SQL Editor 執行 `Database/10_P06_AccountUpgrade.sql`。
2. 執行 `Database/99_P06_HealthCheck.sql`。
3. 在 Supabase Authentication → URL Configuration 確認目前 GitHub Pages 網址已列入 Redirect URLs。
4. 部署新版 GitHub Pages。
5. 建立帳號或登入。
6. 若要取回舊資料，登入後輸入以前的 access code，執行「匯入舊紀錄」。

## Email confirmation

若 Supabase Authentication 開啟 Confirm email：

- 使用者註冊後需先收信確認。
- Redirect URL 必須允許目前 P06 GitHub Pages URL。

若目前只供自己測試，也可以暫時使用 Supabase Dashboard 已建立／已確認的使用者來測試，不需要改動其他專案資料表。

## 資料庫

主表：`public."TblP06DiaryLogs"`

新增欄位：

- `"UserID" uuid NULL REFERENCES auth.users(id)`

舊紀錄：`UserID IS NULL`，直到用舊 access code 歸戶。

新紀錄：`UserID = auth.uid()`。

## 安全與 P-SDS

本版 SQL 嚴格限定 P06：

- 不使用 schema-wide GRANT/REVOKE。
- 不使用 `ALTER DEFAULT PRIVILEGES`。
- 不操作其他 `TblPxx...`。
- 不建立 `auth.users` trigger。
- 不修改 `auth` schema 權限。
- 只在 P06 主表建立對 `auth.users(id)` 的 foreign key。

`90_P06_Permissions.sql` 也只修 P06 主表與 `P06ClaimLegacyLogs` function 的權限。
