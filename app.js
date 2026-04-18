(function () {
  const SUPABASE_URL = window.P06_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.P06_CONFIG?.SUPABASE_ANON_KEY;

  const STORAGE_KEY_CODE = 'p06_access_code';
  const DEFAULT_CODE = 'default';

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
  const datePicker = document.getElementById('datePicker');
  const logSectionTitle = document.getElementById('logSectionTitle');
  const codeInput = document.getElementById('codeInput');
  const applyCodeBtn = document.getElementById('applyCodeBtn');
  const currentCodeText = document.getElementById('currentCodeText');

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

  const state = {
    selectedDate: getTaipeiDateString(new Date()),
    accessCode: getSavedCode()
  };

  const todayDisplay = taipeiDateFormatter.format(new Date());
  todayLabel.textContent = `今日日期：${todayDisplay}`;
  datePicker.value = state.selectedDate;
  codeInput.value = state.accessCode;
  updateCurrentCodeText();
  updateSectionTitle();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('YOUR_') || SUPABASE_ANON_KEY.includes('YOUR_')) {
    showMessage('請先打開 config.js，填入 Supabase URL 與 anon key。', 'error');
    saveBtn.disabled = true;
    refreshBtn.disabled = true;
    voiceBtn.disabled = true;
    applyCodeBtn.disabled = true;
  }

  const supabaseClient = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  async function loadLogsByDate(dateStr = state.selectedDate) {
    if (!supabaseClient) return;

    const accessCode = normalizeCode(state.accessCode);
    if (!accessCode) {
      showMessage('請先輸入代碼。', 'error');
      return;
    }

    state.selectedDate = dateStr;
    datePicker.value = dateStr;
    updateSectionTitle();
    showMessage(`載入 ${dateStr} 紀錄中…`, 'success', false);

    const { data, error } = await supabaseClient
      .from('tblp06_diary_logs')
      .select('id, content, source, entry_date, created_at, access_code')
      .eq('entry_date', dateStr)
      .eq('access_code', accessCode)
      .order('created_at', { ascending: false });

    if (error) {
      showMessage(`讀取失敗：${error.message}`, 'error');
      return;
    }

    renderTimeline(data || []);
    showMessage(`已載入代碼 ${accessCode} 於 ${dateStr} 的 ${data.length} 筆紀錄。`, 'success');
  }

  function renderTimeline(items) {
    todayCount.textContent = String(items.length);

    if (!items.length) {
      latestTime.textContent = '尚無資料';
      timeline.innerHTML = `<div class="empty-box">${escapeHtml(formatDateLabel(state.selectedDate))} 在代碼 ${escapeHtml(state.accessCode)} 下還沒有任何足跡。</div>`;
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
    const accessCode = normalizeCode(state.accessCode);

    if (!accessCode) {
      showMessage('請先輸入代碼。', 'error');
      codeInput.focus();
      return;
    }

    if (!content) {
      showMessage('請先輸入文字內容。', 'error');
      entryInput.focus();
      return;
    }

    saveBtn.disabled = true;

    const source = entryInput.dataset.source === 'voice' ? 'voice' : 'keyboard';

    const { error } = await supabaseClient
      .from('tblp06_diary_logs')
      .insert([{ content, source, access_code: accessCode }]);

    saveBtn.disabled = false;

    if (error) {
      showMessage(`寫入失敗：${error.message}`, 'error');
      return;
    }

    entryInput.value = '';
    entryInput.dataset.source = 'keyboard';
    showMessage(`已成功儲存到代碼 ${accessCode}。`, 'success');
    await loadLogsByDate(state.selectedDate);
  }

  function applyCode() {
    const normalized = normalizeCode(codeInput.value);
    if (!normalized) {
      showMessage('代碼不可為空白。', 'error');
      codeInput.focus();
      return;
    }

    state.accessCode = normalized;
    window.localStorage.setItem(STORAGE_KEY_CODE, normalized);
    codeInput.value = normalized;
    updateCurrentCodeText();
    loadLogsByDate(state.selectedDate);
  }

  function updateCurrentCodeText() {
    currentCodeText.textContent = `目前代碼：${state.accessCode}`;
  }

  function getSavedCode() {
    const saved = normalizeCode(window.localStorage.getItem(STORAGE_KEY_CODE) || '');
    return saved || DEFAULT_CODE;
  }

  function normalizeCode(value) {
    return String(value || '').trim().slice(0, 50);
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

  function formatDateLabel(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${year}/${month}/${day}`;
  }

  function getTaipeiDateString(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);

    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  }

  function updateSectionTitle() {
    const todayStr = getTaipeiDateString(new Date());
    const dateText = state.selectedDate === todayStr ? '今日足跡' : `${formatDateLabel(state.selectedDate)} 足跡`;
    logSectionTitle.textContent = `${dateText}`;
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
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let isListening = false;
    let manuallyStopped = false;
    let baseText = '';
    let committedChunks = [];
    let lastFinalNormalized = '';
    let lastFinalAt = 0;

    function normalizeSpeechChunk(text) {
      return String(text || '')
        .replace(/[\s\u3000]+/g, '')
        .trim();
    }

    function dedupeAndCommitFinal(text) {
      const trimmed = String(text || '').trim();
      if (!trimmed) return;

      const normalized = normalizeSpeechChunk(trimmed);
      const now = Date.now();

      if (normalized && normalized === lastFinalNormalized && now - lastFinalAt < 2500) {
        return;
      }

      committedChunks.push(trimmed);
      lastFinalNormalized = normalized;
      lastFinalAt = now;
    }

    function buildCombinedText(interimTranscript = '') {
      const parts = [];
      const cleanBase = baseText.trim();
      const cleanCommitted = committedChunks.join(' ').trim();
      const cleanInterim = String(interimTranscript || '').trim();

      if (cleanBase) parts.push(cleanBase);
      if (cleanCommitted) parts.push(cleanCommitted);
      if (cleanInterim) parts.push(cleanInterim);

      return parts.join(' ').trim();
    }

    function syncInput(interimTranscript = '') {
      const combined = buildCombinedText(interimTranscript);
      entryInput.value = combined;
      if (combined) {
        entryInput.dataset.source = 'voice';
      }
    }

    function startRecognition() {
      try {
        recognition.start();
      } catch (error) {
        voiceStatus.textContent = '語音啟動失敗，請再按一次';
      }
    }

    voiceBtn.addEventListener('click', () => {
      if (isListening) {
        manuallyStopped = true;
        isListening = false;
        voiceStatus.textContent = '正在停止語音…';
        recognition.stop();
        return;
      }

      baseText = entryInput.value.trim();
      committedChunks = [];
      lastFinalNormalized = '';
      lastFinalAt = 0;
      manuallyStopped = false;
      isListening = true;
      voiceStatus.textContent = '準備開始語音…';
      voiceBtn.textContent = '⏹️ 停止語音';
      startRecognition();
    });

    recognition.addEventListener('start', () => {
      voiceBtn.textContent = '⏹️ 停止語音';
      voiceStatus.textContent = '正在聆聽中；停頓時會等待並自動續聽';
    });

    recognition.addEventListener('result', (event) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          dedupeAndCommitFinal(transcript);
        } else {
          interimTranscript += transcript;
        }
      }

      syncInput(interimTranscript);
      voiceStatus.textContent = interimTranscript ? '辨識中…' : '已收進文字，繼續等待說話';
    });

    recognition.addEventListener('error', (event) => {
      const retryable = ['no-speech', 'aborted', 'audio-capture'].includes(event.error);

      if (!manuallyStopped && isListening && retryable) {
        voiceStatus.textContent = '暫時沒有聲音，系統繼續待命…';
        return;
      }

      isListening = false;
      voiceBtn.textContent = '🎙️ 開始語音';
      voiceStatus.textContent = `語音錯誤：${event.error}`;
    });

    recognition.addEventListener('end', () => {
      if (isListening && !manuallyStopped) {
        voiceStatus.textContent = '等待您下一段說話…';
        window.setTimeout(() => {
          if (isListening && !manuallyStopped) {
            startRecognition();
          }
        }, 350);
        return;
      }

      isListening = false;
      voiceBtn.textContent = '🎙️ 開始語音';
      voiceStatus.textContent = '語音已停止';
      syncInput('');
    });
  }

  saveBtn.addEventListener('click', saveEntry);
  refreshBtn.addEventListener('click', () => loadLogsByDate(state.selectedDate));
  applyCodeBtn.addEventListener('click', applyCode);
  codeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyCode();
    }
  });
  datePicker.addEventListener('change', (event) => {
    if (event.target.value) {
      loadLogsByDate(event.target.value);
    }
  });

  entryInput.addEventListener('input', () => {
    if (!entryInput.value.trim()) {
      entryInput.dataset.source = 'keyboard';
    }
  });

  initSpeech();
  loadLogsByDate(state.selectedDate);
})();
