(function () {
  const SUPABASE_URL = window.P06_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.P06_CONFIG?.SUPABASE_ANON_KEY;
  const AUTH_STORAGE_KEY = 'p06-auth-token';

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

  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const signedOutPanel = document.getElementById('signedOutPanel');
  const signedInPanel = document.getElementById('signedInPanel');
  const signedInText = document.getElementById('signedInText');
  const authBadge = document.getElementById('authBadge');
  const authMessage = document.getElementById('authMessage');
  const legacyCard = document.getElementById('legacyCard');
  const legacyCodeInput = document.getElementById('legacyCodeInput');
  const claimLegacyBtn = document.getElementById('claimLegacyBtn');
  const claimMessage = document.getElementById('claimMessage');
  const authRequiredControls = document.querySelectorAll('[data-requires-auth="true"]');

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
    user: null
  };

  todayLabel.textContent = `今日日期：${taipeiDateFormatter.format(new Date())}`;
  datePicker.value = state.selectedDate;
  updateSectionTitle();
  updateAuthUI();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('YOUR_') || SUPABASE_ANON_KEY.includes('YOUR_')) {
    showBox(authMessage, '請先打開 config.js，填入 Supabase URL 與 anon key。', 'error', false);
    setGlobalDisabledState(true);
  }

  const supabaseClient = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: AUTH_STORAGE_KEY
        }
      })
    : null;

  async function initAuth() {
    if (!supabaseClient) return;

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      showBox(authMessage, `讀取登入狀態失敗：${error.message}`, 'error');
    }

    state.user = data?.session?.user || null;
    updateAuthUI();

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      state.user = session?.user || null;
      updateAuthUI();
      window.setTimeout(() => {
        if (state.user) loadLogsByDate(state.selectedDate);
        else renderTimeline([]);
      }, 0);
    });

    if (state.user) await loadLogsByDate(state.selectedDate);
    else renderTimeline([]);
  }

  async function login() {
    if (!supabaseClient) return;
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showBox(authMessage, '請輸入 Email 與密碼。', 'error');
      return;
    }

    setAuthButtonsDisabled(true);
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    setAuthButtonsDisabled(false);

    if (error) {
      showBox(authMessage, `登入失敗：${error.message}`, 'error');
      return;
    }

    passwordInput.value = '';
    showBox(authMessage, '登入成功。', 'success');
  }

  async function signup() {
    if (!supabaseClient) return;
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showBox(authMessage, '請輸入 Email 與密碼。', 'error');
      return;
    }

    if (password.length < 6) {
      showBox(authMessage, '密碼至少需要 6 個字元。', 'error');
      return;
    }

    setAuthButtonsDisabled(true);
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo }
    });
    setAuthButtonsDisabled(false);

    if (error) {
      showBox(authMessage, `建立帳號失敗：${error.message}`, 'error');
      return;
    }

    passwordInput.value = '';
    if (data?.session) {
      showBox(authMessage, '帳號已建立並登入。', 'success');
    } else {
      showBox(authMessage, '帳號已建立。請到信箱完成 Email 確認後再登入。', 'success', false);
    }
  }

  async function logout() {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      showBox(authMessage, `登出失敗：${error.message}`, 'error');
      return;
    }
    showBox(authMessage, '已登出。', 'success');
  }

  async function claimLegacyLogs() {
    if (!supabaseClient || !state.user) return;
    const code = legacyCodeInput.value.trim();
    if (!code) {
      showBox(claimMessage, '請輸入舊 access code。', 'error');
      return;
    }

    claimLegacyBtn.disabled = true;
    const { data, error } = await supabaseClient.rpc('P06ClaimLegacyLogs', { p_access_code: code });
    claimLegacyBtn.disabled = false;

    if (error) {
      showBox(claimMessage, `匯入失敗：${error.message}`, 'error');
      return;
    }

    legacyCodeInput.value = '';
    const count = Number(data || 0);
    showBox(claimMessage, count > 0
      ? `已成功匯入 ${count} 筆舊足跡到目前帳號。`
      : '沒有找到尚未歸戶、且符合此 access code 的舊紀錄。',
      count > 0 ? 'success' : 'error', false);
    await loadLogsByDate(state.selectedDate);
  }

  async function loadLogsByDate(dateStr = state.selectedDate) {
    if (!supabaseClient || !state.user) {
      renderTimeline([]);
      return;
    }

    state.selectedDate = dateStr;
    datePicker.value = dateStr;
    updateSectionTitle();
    showMessage(`載入 ${dateStr} 紀錄中…`, 'success', false);

    const { data, error } = await supabaseClient
      .from('TblP06DiaryLogs')
      .select('id, content, source, entry_date, created_at, UserID')
      .eq('entry_date', dateStr)
      .eq('UserID', state.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      showMessage(`讀取失敗：${error.message}`, 'error');
      return;
    }

    renderTimeline(data || []);
    showMessage(`已載入 ${dateStr} 的 ${data.length} 筆紀錄。`, 'success');
  }

  function renderTimeline(items) {
    todayCount.textContent = String(items.length);

    if (!state.user) {
      latestTime.textContent = '尚未登入';
      timeline.innerHTML = '<div class="empty-box">請先登入帳號，系統才會顯示您的足跡。</div>';
      return;
    }

    if (!items.length) {
      latestTime.textContent = '尚無資料';
      timeline.innerHTML = `<div class="empty-box">${escapeHtml(formatDateLabel(state.selectedDate))} 還沒有任何足跡。</div>`;
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
    if (!supabaseClient || !state.user) {
      showMessage('請先登入帳號。', 'error');
      return;
    }

    const content = entryInput.value.trim();
    if (!content) {
      showMessage('請先輸入文字內容。', 'error');
      entryInput.focus();
      return;
    }

    saveBtn.disabled = true;
    const source = entryInput.dataset.source === 'voice' ? 'voice' : 'keyboard';

    const { error } = await supabaseClient
      .from('TblP06DiaryLogs')
      .insert([{ content, source, UserID: state.user.id }]);

    saveBtn.disabled = false;
    if (error) {
      showMessage(`寫入失敗：${error.message}`, 'error');
      return;
    }

    entryInput.value = '';
    entryInput.dataset.source = 'keyboard';
    showMessage('已成功儲存。', 'success');
    await loadLogsByDate(state.selectedDate);
  }

  function updateAuthUI() {
    const signedIn = Boolean(state.user);
    signedOutPanel.hidden = signedIn;
    signedInPanel.hidden = !signedIn;
    legacyCard.hidden = !signedIn;
    authBadge.textContent = signedIn ? '已登入' : '未登入';
    authBadge.classList.toggle('active', signedIn);
    signedInText.textContent = signedIn ? `目前帳號：${state.user.email || state.user.id}` : '';
    setAuthRequiredDisabled(!signedIn);
  }

  function setAuthRequiredDisabled(disabled) {
    authRequiredControls.forEach((element) => { element.disabled = disabled; });
    entryInput.disabled = disabled;
    datePicker.disabled = disabled;
    refreshBtn.disabled = disabled;
    voiceBtn.disabled = disabled;
  }

  function setAuthButtonsDisabled(disabled) {
    loginBtn.disabled = disabled;
    signupBtn.disabled = disabled;
  }

  function setGlobalDisabledState(disabled) {
    loginBtn.disabled = disabled;
    signupBtn.disabled = disabled;
    logoutBtn.disabled = disabled;
    claimLegacyBtn.disabled = disabled;
    entryInput.disabled = disabled;
    datePicker.disabled = disabled;
    saveBtn.disabled = disabled;
    refreshBtn.disabled = disabled;
    voiceBtn.disabled = disabled;
  }

  function showBox(element, message, type = 'success', autoHide = true) {
    element.textContent = message;
    element.className = `message-box show ${type}`;
    if (!autoHide) return;
    window.clearTimeout(element._timer);
    element._timer = window.setTimeout(() => {
      element.textContent = '';
      element.className = 'message-box';
    }, 3200);
  }

  function showMessage(message, type = 'success', autoHide = true) {
    showBox(messageBox, message, type, autoHide);
  }

  function formatTime(isoString) {
    try { return taipeiTimeFormatter.format(new Date(isoString)); }
    catch (_error) { return isoString; }
  }

  function formatDateLabel(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${year}/${month}/${day}`;
  }

  function getTaipeiDateString(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  }

  function updateSectionTitle() {
    const todayStr = getTaipeiDateString(new Date());
    logSectionTitle.textContent = state.selectedDate === todayStr
      ? '今日足跡'
      : `${formatDateLabel(state.selectedDate)} 足跡`;
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
      return String(text || '').replace(/[\s\u3000]+/g, '').trim();
    }

    function dedupeAndCommitFinal(text) {
      const trimmed = String(text || '').trim();
      if (!trimmed) return;
      const normalized = normalizeSpeechChunk(trimmed);
      const now = Date.now();
      if (normalized && normalized === lastFinalNormalized && now - lastFinalAt < 2500) return;
      committedChunks.push(trimmed);
      lastFinalNormalized = normalized;
      lastFinalAt = now;
    }

    function buildCombinedText(interimTranscript = '') {
      return [baseText.trim(), committedChunks.join(' ').trim(), String(interimTranscript || '').trim()]
        .filter(Boolean).join(' ').trim();
    }

    function syncInput(interimTranscript = '') {
      const combined = buildCombinedText(interimTranscript);
      entryInput.value = combined;
      if (combined) entryInput.dataset.source = 'voice';
    }

    function startRecognition() {
      try { recognition.start(); }
      catch (_error) { voiceStatus.textContent = '語音啟動失敗，請再按一次'; }
    }

    voiceBtn.addEventListener('click', () => {
      if (!state.user) {
        showMessage('請先登入帳號，再開始語音輸入。', 'error');
        return;
      }
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
        if (event.results[i].isFinal) dedupeAndCommitFinal(transcript);
        else interimTranscript += transcript;
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
          if (isListening && !manuallyStopped) startRecognition();
        }, 350);
        return;
      }
      isListening = false;
      voiceBtn.textContent = '🎙️ 開始語音';
      voiceStatus.textContent = '語音已停止';
      syncInput('');
    });
  }

  loginBtn.addEventListener('click', login);
  signupBtn.addEventListener('click', signup);
  logoutBtn.addEventListener('click', logout);
  claimLegacyBtn.addEventListener('click', claimLegacyLogs);
  saveBtn.addEventListener('click', saveEntry);
  refreshBtn.addEventListener('click', () => loadLogsByDate(state.selectedDate));
  datePicker.addEventListener('change', (event) => {
    if (event.target.value && state.user) loadLogsByDate(event.target.value);
  });
  passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') login();
  });
  legacyCodeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') claimLegacyLogs();
  });
  entryInput.addEventListener('input', () => {
    if (!entryInput.value.trim()) entryInput.dataset.source = 'keyboard';
  });

  initSpeech();
  initAuth();
})();
