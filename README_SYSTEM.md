# P06足跡

P06足跡是一個以 **GitHub Pages + Supabase** 建置的極簡個人時序日誌系統。

## 一、系統目的

讓使用者可以隨時快速輸入：
- 正在做的事情
- 當下浮現的想法
- 短暫待辦或提醒

系統會自動把每次輸入與當時時間一起記錄下來，形成一天中的「足跡」。

---

## 二、目前版本功能

### 1. 文字輸入
可直接輸入文字並送出。

### 2. 自動記錄時間
每筆資料會自動記錄 `created_at`。

### 3. 今日足跡顯示
畫面下方會列出今天所有記錄，依時間倒序顯示。

### 4. 語音輸入（瀏覽器支援時）
若手機或瀏覽器支援 Web Speech API，可按下麥克風按鈕進行語音辨識，辨識結果自動填入文字框。

---

## 三、資料表命名規則

本專案資料表統一使用：

- `tblp06_diary_logs`

View：
- `vw_tblp06_today_logs`

---

## 四、資料表結構

### `tblp06_diary_logs`
- `id`：UUID 主鍵
- `content`：文字內容
- `source`：輸入來源（`keyboard` / `voice`）
- `entry_date`：台北時區日期
- `created_at`：建立時間（timestamptz）

---

## 五、檔案結構

- `index.html`：主頁面
- `styles.css`：介面樣式（咖啡－米色舊日式風格）
- `app.js`：前端互動與 Supabase 存取
- `config.example.js`：設定檔範例
- `config.js`：實際設定檔（需自行填入）
- `schema.sql`：Supabase 建表 SQL
- `README_SYSTEM.md`：系統說明

---

## 六、部署方式

### Step 1：Supabase
1. 建立一個 Supabase 專案
2. 到 SQL Editor 執行 `schema.sql`
3. 到 Project Settings 取得：
   - Project URL
   - anon public key

### Step 2：GitHub Pages
1. 上傳所有前端檔案到 GitHub repository
2. 將 `config.example.js` 複製成 `config.js`
3. 在 `config.js` 填入自己的 Supabase 連線資訊
4. 啟用 GitHub Pages

---

## 七、安全說明

目前此版本為 **極簡個人原型**，使用 anon key 並透過 RLS policy 允許前端直接讀寫。

若未來紀錄內容涉及：
- 敏感個人資訊
- 研究資料
- 私密日誌

建議改為：
1. 前端不直接 insert
2. 改走 Supabase Edge Function
3. 將更嚴格的驗證與寫入邏輯放到 server side

---

## 八、後續可擴充方向

1. 日期篩選
2. 關鍵字搜尋
3. 標籤分類
4. 每日輸入次數統計
5. 匯出 CSV
6. 密碼保護
7. 語音自動送出
8. 行動版更大按鈕介面

---

## 九、設計風格

本版採用：
- 咖啡色
- 米色
- 紙張感背景
- 舊日式簡潔排版

整體目標是讓輸入記錄時有一種安靜、溫和、可長期使用的感覺。
