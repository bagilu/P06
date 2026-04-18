# README_SYSTEM.md

# P06 足跡

P06足跡是一個以 GitHub Pages + Supabase 建置的輕量個人時序日誌系統。用途是隨手記下當下正在做的事、腦中浮現的想法，並讓系統自動記錄時間，形成可回看的文字足跡。

---

## 一、目前版本重點

本版本為 v4，包含以下功能：

1. 文字輸入後可直接寫入 Supabase
2. 每筆資料自動附上建立時間與台北日期
3. 可選擇日期查看過去足跡
4. 支援瀏覽器語音辨識輸入
5. 語音辨識中斷後，會自動重新啟動等待下一段說話
6. 新增 access_code 代碼輸入，用於資料分流
7. 首次使用若尚未設定代碼，系統會先要求輸入代碼
8. 曾輸入過的代碼會保存在瀏覽器 localStorage，下次開啟可直接載入
9. 可隨時更換代碼或清除代碼

---

## 二、重要說明

### 1. access_code 不是正式安全機制

目前 access_code 只是前端分流條件，不是完整的權限控管，也不是帳號登入系統。

也就是說：
- 平常使用上，可用不同代碼區分不同資料
- 但若有人知道 Supabase 結構並直接呼叫 API，理論上仍可能讀取資料

因此本版適合：
- 個人使用
- 測試用途
- 暫不公開的原型系統

若未來要正式保護隱私，建議升級為：
- Supabase Auth 登入
- 或 Edge Function 代理查詢與寫入
- 或兩者並用

### 2. 舊資料處理

若您先前已把舊資料補成 `default`，仍可輸入 `default` 看到舊資料。

本版不需要再修改資料表結構，也不需要重跑 schema.sql。

---

## 三、主要資料表

### `public.tblp06_diary_logs`

欄位：
- `id`：UUID 主鍵
- `content`：文字內容
- `source`：輸入來源，`keyboard` 或 `voice`
- `access_code`：代碼分流欄位
- `entry_date`：台北日期
- `created_at`：UTC 建立時間

---

## 四、前端檔案

- `index.html`：主畫面
- `styles.css`：介面樣式（咖啡－米色舊日式風格）
- `app.js`：主要功能邏輯
- `config.example.js`：範例設定檔
- `config.js`：實際設定檔
- `schema.sql`：Supabase SQL

---

## 五、語音辨識修正

### 本版修正內容

前一版在某些情況下，語音辨識結果可能出現連續重複，例如：

`系統測試 系統測試`

本版已改為：
- 將最終辨識結果拆成獨立片段管理
- 對短時間內重複出現的相同 final transcript 做去重
- 保留 interim 顯示，但不再重複累加到 committed 文字中

此修正特別針對 Android 手機上語音 session 自動重啟時，可能重送前一段 final transcript 的情況。

---

## 六、部署方式

1. 在 Supabase SQL Editor 執行 `schema.sql`
2. 編輯 `config.js`，填入：
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. 將整個資料夾上傳到 GitHub Pages 專案
4. 開啟網站後：
   - 若瀏覽器已有保存的代碼，系統會自動帶入並直接載入
   - 若尚未保存代碼，請先輸入後再開始使用

---

## 七、下一步可擴充方向

1. 關鍵字搜尋
2. 每日統計圖
3. 匯出 CSV
4. localStorage 暫存失敗補送
5. 正式登入與權限控管
6. Edge Function 安全查詢版本

