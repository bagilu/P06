# P06 足跡 — V0.5 Naming Standardization

P06「足跡」是一個以 GitHub Pages + Supabase 建置的輕量個人時序日誌系統，用於隨手記下當下正在做的事與想法，並自動保存時間形成可回看的文字足跡。

## 一、本版定位

本版以 V0.4 穩定版為基礎，只做 **P06 資料庫物件命名一致化**，不加入帳號功能，也不改變既有操作流程。

既有功能均保留：

1. 文字寫入 Supabase
2. 自動記錄建立時間與台北日期
3. 依日期查看足跡
4. 瀏覽器語音辨識輸入
5. 語音 session 中斷後自動續聽
6. `access_code` 資料分流
7. `access_code` 儲存於 localStorage
8. 可更換或清除代碼

## 二、本版資料庫命名

主要資料表正式統一為：

`public."TblP06DiaryLogs"`

欄位保持不變：

- `id`：UUID 主鍵
- `content`：文字內容
- `source`：`keyboard` 或 `voice`
- `access_code`：輕量分流代碼
- `entry_date`：台北日期
- `created_at`：UTC 建立時間

P06 View 統一為：

`public."VwP06TodayLogs"`

## 三、既有資料安全

本版採 PostgreSQL `RENAME`，不是建立新 table 後搬資料。

因此既有歷史資料仍留在同一個 PostgreSQL relation 中；migration 不會 COPY、DELETE 或重新 INSERT 歷史資料。

## 四、SQL 安全原則

本版不再提供舊式的整包 `schema.sql`，避免誤執行不必要的 schema / policy 建置。

請使用：

- `Database/01_P06_NamingMigration.sql`
- `Database/99_P06_HealthCheck.sql`

本次 SQL 僅操作 P06 自己的 table/index/view，且：

- 不使用 `GRANT`
- 不使用 `REVOKE`
- 不修改整個 `public` schema 權限
- 不碰其他 P 專案 table / view / policy / function
- 不重建 P06 既有 RLS Policy

## 五、部署順序

1. 先記錄舊表筆數：`SELECT count(*) FROM public.tblp06_diary_logs;`
2. 執行 `Database/01_P06_NamingMigration.sql`
3. 執行 `Database/99_P06_HealthCheck.sql`
4. 確認筆數與既有 Policy 正常
5. 將本版前端部署至 GitHub Pages
6. 以既有 access code 實際測試讀取及新增一筆資料

## 六、帳號功能

本版暫不加入正式帳號、Supabase Auth、Passkey 或指紋登入。這些功能留待下一階段，待本次命名遷移穩定後再進行。
