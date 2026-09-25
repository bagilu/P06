# P06 足跡 — V0.7 SDS v3.1 Auth Alignment

P06 足跡是一個以 GitHub Pages + Supabase 建置的輕量個人時序日誌系統。本版以 V0.6.x 帳號版為基礎，依 SBI-P-SDS v3.1 修正登入與帳號生命週期分工。

## V0.7 重點

1. P06 保留自己的 Email + password 登入頁，使用 Supabase `signInWithPassword()`。
2. P06 不再提供註冊功能；註冊、Email 驗證、忘記／重設／修改密碼、帳號基本資料統一由 P130 Account Center 處理。
3. 登入頁提供 P130 註冊、忘記密碼、帳號設定連結。
4. Auth session 使用 P06 專屬 `storageKey = P06-auth`。
5. 保留 `persistSession: true` 與 `autoRefreshToken: true`，同一手機／瀏覽器一般不需每次重新登入。
6. 新紀錄以 `auth.uid()` / `UserID` 綁定使用者；RLS 仍限制登入者只能讀寫自己的 P06 紀錄。
7. 舊 access code 僅保留為 legacy data migration 工具，不再是日常登入或授權機制。
8. 加入「顯示密碼」按鈕；切離頁面時自動恢復隱藏。
9. 不新增 P06 自有帳密資料表，不建立 auth.users trigger。
10. Passkey／指紋尚未在 P06 個別實作；如未來需要，應由 shared Auth / P130 層級統一規劃。

## P130

- Account Center: https://bagilu.github.io/P130/
- Forgot password: https://bagilu.github.io/P130/forgot-password.html

P130 與 P06 使用同一個 Supabase Project / shared Auth；P130 管理帳號生命週期，P06 管理自己的資料與 authorization。

## 資料庫

主表：`public."TblP06DiaryLogs"`

帳號欄位：

- `"UserID" uuid NULL REFERENCES auth.users(id)`

舊紀錄可維持 `UserID IS NULL`，直到登入後透過 `p06_claim_legacy_logs(text)` 歸戶。

## SQL 安全範圍

P06 SQL 僅能操作 P06 自己的物件：

- `TblP06...`
- `VwP06...`
- `p06_...` / P06 專屬 function、policy、index

禁止：

- schema-wide `GRANT / REVOKE ... ON ALL TABLES`
- `ALTER DEFAULT PRIVILEGES`
- `GRANT ALL / REVOKE ALL ON SCHEMA public`
- 修改任何其他 P 專案物件
- 使用 service role key 於前端

## 部署設定

正式 GitHub Pages 仍使用 `config.js`。範本檔為 `config-sample.js`；修改版本時不得以範本覆蓋正式 `config.js`。

## 注意

V0.7 將 storageKey 從舊版 `p06-auth-token` 改為 `P06-auth`。既有使用者升級後可能需要重新登入一次；之後 session 會以新的 P06 專屬 key 長期保存。
