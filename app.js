(function () {
  const SUPABASE_URL = window.P06_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.P06_CONFIG?.SUPABASE_ANON_KEY;

  const entryInput = document.getElementById('entryInput');
  const saveBtn = document.getElementById('saveBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const voiceBtn = document.getElementById('voiceBtn');
  const voiceStatus = document.getElementById('voiceStatus');
  const messageBox = document.getElementById('messageBox');
  const timeline = document.getElementById('timeline');
  const todayCount = document.getElementById('todayCount');
  const latestTime = document.getElementById('latestTime');
  const todayLabel = document.getElementById('todayLabel');

  const taipeiDateFormatter = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const taipeiTimeFormatter = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  todayLabel.textContent = `今日日期：${taipeiDateFormatter.format(new Date())}`;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('YOUR_') || SUPABASE_ANON_KEY.includes('YOUR_')) {
    showMessage('請先打開 config.js，填入 Supabase URL 與 anon key。', 'error');
    saveBtn.disabled = true;
    refreshBtn.disabled = true;
  }

  const supabaseClient = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  async function loadTodayLogs() {
    if (!supabaseClient) return;

    showMessage('載入今日紀錄中…', 'success', false);

    const { data, error } = await supabaseClient
      .from('vw_tblp06_today_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showMessage(`讀取失敗：${error.message}`, 'error');
      return;
    }

    renderTimeline(data || []);
    showMessage(`已載入 ${data.length} 筆今日紀錄。`, 'success');
  }

  function renderTimeline(items) {
    todayCount.textContent = String(items.length);

    if (!items.length) {
      latestTime.textContent = '尚無資料';
      timeline.innerHTML = '<div class="empty-box">今天還沒有任何足跡。現在就記下第一筆吧。</div>';
      return;
    }

    latestTime.textContent = formatTime(items[0].created_at);

    timeline.innerHTML = items.map((item) => {
      const sourceText = item.source === 'voice' ? '語音輸入' : '鍵盤輸入';
      return `
        <article class="timeline-item">
          <div class="timeline-meta">
            <span>${formatTime(item.created_at)}</span>
            <span class="source-badge">${escapeHtml(sourceText)}</span>
          </div>
          <div class="timeline-content">${escapeHtml(item.content)}</div>
        </article>
      `;
    }).join('');
  }

  async function saveEntry() {
    if (!supabaseClient) return;

    const content = entryInput.value.trim();
    if (!content) {
      showMessage('請先輸入文字內容。', 'error');
      entryInput.focus();
      return;
    }

    saveBtn.disabled = true;

    const source = entryInput.dataset.source === 'voice' ? 'voice' : 'keyboard';

    const { error } = await supabaseClient
      .from('tblp06_diary_logs')
      .insert([{ content, source }]);

    saveBtn.disabled = false;

    if (error) {
      showMessage(`寫入失敗：${error.message}`, 'error');
      return;
    }

    entryInput.value = '';
    entryInput.dataset.source = 'keyboard';
    showMessage('已成功儲存這一筆足跡。', 'success');
    await loadTodayLogs();
  }

  function showMessage(message, type = 'success', autoHide = true) {
    messageBox.textContent = message;
    messageBox.className = `message-box show ${type}`;

    if (!autoHide) return;

    window.clearTimeout(showMessage._timer);
    showMessage._timer = window.setTimeout(() => {
      messageBox.textContent = '';
      messageBox.className = 'message-box';
    }, 2600);
  }

  function formatTime(isoString) {
    try {
      return taipeiTimeFormatter.format(new Date(isoString));
    } catch (error) {
      return isoString;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function initSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      voiceBtn.disabled = true;
      voiceStatus.textContent = '此瀏覽器不支援語音輸入';
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-TW';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let listening = false;

    voiceBtn.addEventListener('click', () => {
      if (listening) {
        recognition.stop();
        return;
      }

      try {
        recognition.start();
      } catch (error) {
        voiceStatus.textContent = '語音啟動失敗';
      }
    });

    recognition.addEventListener('start', () => {
      listening = true;
      voiceBtn.textContent = '⏹️ 停止語音';
      voiceStatus.textContent = '正在聆聽…';
    });

    recognition.addEventListener('result', (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0]?.transcript || '')
        .join('');

      entryInput.value = transcript.trim();
      entryInput.dataset.source = 'voice';
      voiceStatus.textContent = event.results[0]?.isFinal ? '已完成語音辨識' : '辨識中…';
    });

    recognition.addEventListener('error', (event) => {
      voiceStatus.textContent = `語音錯誤：${event.error}`;
      listening = false;
      voiceBtn.textContent = '🎙️ 語音輸入';
    });

    recognition.addEventListener('end', () => {
      listening = false;
      voiceBtn.textContent = '🎙️ 語音輸入';
      if (!voiceStatus.textContent) {
        voiceStatus.textContent = '語音已停止';
      }
    });
  }

  saveBtn.addEventListener('click', saveEntry);
  refreshBtn.addEventListener('click', loadTodayLogs);

  entryInput.addEventListener('input', () => {
    if (!entryInput.value.trim()) {
      entryInput.dataset.source = 'keyboard';
    }
  });

  initSpeech();
  loadTodayLogs();
})();
