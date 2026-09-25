(function () {
  const SUPABASE_URL = window.P06_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.P06_CONFIG?.SUPABASE_ANON_KEY;
  const AUTH_STORAGE_KEY = 'P06-auth';
  const PAGE_SIZE = 10;

  const mainContainer = document.getElementById('mainContainer');
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
  const latestBtn = document.getElementById('latestBtn');
  const newerBtn = document.getElementById('newerBtn');
  const olderBtn = document.getElementById('olderBtn');
  const pageStatus = document.getElementById('pageStatus');
  const logSectionTitle = document.getElementById('logSectionTitle');
  const logHint = document.getElementById('logHint');

  const authCard = document.getElementById('authCard');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
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

  const taipeiDateTimeFormatter = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const state = {
    selectedDate: '',
    pageIndex: 0,
    user: null,
    hasOlder: false
  };

  todayLabel.textContent = `今日日期：${taipeiDateFormatter.format(new Date())}`;
  datePicker.value = '';
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
    resetTimelineState();
    updateAuthUI();

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      state.user = session?.user || null;
      resetTimelineState();
      updateAuthUI();
      window.setTimeout(() => {
        if (state.user) loadTimeline();
        else renderTimeline([]);
      }, 0);
    });

    if (state.user) await loadTimeline();
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
    hidePassword();
    showBox(authMessage, '登入成功。', 'success');
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
    const { data, error } = await supabaseClient.rpc('p06_claim_legacy_logs', { p_access_code: code });
    claimLegacyBtn.disabled = false;

    if (error) {
      showBox(claimMessage, `匯入失敗：${error.message}`, 'error');
      return;
    }

    legacyCodeInput.value = '';
    const count = Number(data || 0);
    showBox(
      claimMessage,
      count > 0
        ? `已成功匯入 ${count} 筆舊足跡到目前帳號。`
        : '目前沒有可匯入的舊紀錄；可能此 access code 的紀錄已完成歸戶。',
      count > 0 ? 'success' : 'success',
      false
    );
    resetTimelineState();
    await loadTimeline();
  }

  function resetTimelineState() {
    state.selectedDate = '';
    state.pageIndex = 0;
    state.hasOlder = false;
    datePicker.value = '';
    updateSectionTitle();
  }

  function selectedDateEndIso() {
    if (!state.selectedDate) return null;
    return new Date(`${state.selectedDate}T23:59:59.999+08:00`).toISOString();
  }

  async function loadTimeline() {
    if (!supabaseClient || !state.user) {
      renderTimeline([]);
      return;
    }

    updateSectionTitle();
    showMessage('載入足跡中…', 'success', false);

    const from = state.pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE;

    let query = supabaseClient
      .from('TblP06DiaryLogs')
      .select('id, content, source, entry_date, created_at, UserID')
      .eq('UserID', state.user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    const endIso = selectedDateEndIso();
    if (endIso) query = query.lte('created_at', endIso);

    const { data, error } = await query;

    if (error) {
      showMessage(`讀取失敗：${error.message}`, 'error');
      return;
    }

    const rows = data || [];
    state.hasOlder = rows.length > PAGE_SIZE;
    const pageRows = rows.slice(0, PAGE_SIZE);

    if (pageRows.length === 0 && state.pageIndex > 0) {
      state.pageIndex -= 1;
      return loadTimeline();
    }

    renderTimeline(pageRows);
    updatePaginationUI();
    showMessage(
      pageRows.length
        ? `已載入第 ${state.pageIndex + 1} 頁，共 ${pageRows.length} 筆。`
        : '目前沒有符合條件的足跡。',
      'success'
    );
  }

  function renderTimeline(items) {
    todayCount.textContent = String(items.length);

    if (!state.user) {
      latestTime.textContent = '尚未登入';
      timeline.innerHTML = '<div class="empty-box">請先登入帳號，系統才會顯示您的足跡。</div>';
      updatePaginationUI();
      return;
    }

    if (!items.length) {
      latestTime.textContent = '尚無資料';
      const scope = state.selectedDate
        ? `${escapeHtml(formatDateLabel(state.selectedDate))} 以前`
        : '目前';
      timeline.innerHTML = `<div class="empty-box">${scope}沒有可顯示的足跡。</div>`;
      updatePaginationUI();
      return;
    }

    latestTime.textContent = formatDateTime(items[0].created_at);
    timeline.innerHTML = items.map((item) => {
      const sourceText = item.source === 'voice' ? '語音輸入' : '鍵盤輸入';
      return `
        <article class="timeline-item">
          <div class="timeline-meta">
            <span>${formatDateTime(item.created_at)}</span>
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
    resetTimelineState();
    showMessage('已成功儲存。', 'success');
    await loadTimeline();
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

    if (signedIn) {
      mainContainer.appendChild(authCard);
      mainContainer.appendChild(legacyCard);
    } else {
      mainContainer.prepend(authCard);
    }
  }

  function updatePaginationUI() {
    const signedIn = Boolean(state.user);
    newerBtn.disabled = !signedIn || state.pageIndex === 0;
    olderBtn.disabled = !signedIn || !state.hasOlder;
    latestBtn.disabled = !signedIn || (!state.selectedDate && state.pageIndex === 0);
    pageStatus.textContent = `第 ${state.pageIndex + 1} 頁`;
  }

  function setAuthRequiredDisabled(disabled) {
    authRequiredControls.forEach((element) => { element.disabled = disabled; });
    entryInput.disabled = disabled;
    datePicker.disabled = disabled;
    refreshBtn.disabled = disabled;
    voiceBtn.disabled = disabled;
    updatePaginationUI();
  }

  function setAuthButtonsDisabled(disabled) {
    loginBtn.disabled = disabled;
  }

  function setGlobalDisabledState(disabled) {
    loginBtn.disabled = disabled;
    logoutBtn.disabled = disabled;
    claimLegacyBtn.disabled = disabled;
    entryInput.disabled = disabled;
    datePicker.disabled = disabled;
    saveBtn.disabled = disabled;
    refreshBtn.disabled = disabled;
    voiceBtn.disabled = disabled;
    latestBtn.disabled = disabled;
    newerBtn.disabled = disabled;
    olderBtn.disabled = disabled;
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

  function formatDateTime(isoString) {
    try { return taipeiDateTimeFormatter.format(new Date(isoString)); }
    catch (_error) { return isoString; }
  }

  function formatDateLabel(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${year}/${month}/${day}`;
  }

  function updateSectionTitle() {
    if (state.selectedDate) {
      logSectionTitle.textContent = `${formatDateLabel(state.selectedDate)} 以前的最近足跡`;
      logHint.textContent = `顯示截至 ${formatDateLabel(state.selectedDate)} 23:59（台灣時間）以前的紀錄，每頁 10 筆。`;
    } else {
      logSectionTitle.textContent = '最近足跡';
      logHint.textContent = '顯示目前帳號最新的紀錄，每頁 10 筆。';
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

  function hidePassword() {
    if (!togglePasswordBtn) return;
    passwordInput.type = 'password';
    togglePasswordBtn.textContent = '顯示密碼';
    togglePasswordBtn.setAttribute('aria-pressed', 'false');
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
  logoutBtn.addEventListener('click', logout);

  togglePasswordBtn?.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    togglePasswordBtn.textContent = show ? '隱藏密碼' : '顯示密碼';
    togglePasswordBtn.setAttribute('aria-pressed', String(show));
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hidePassword();
  });
  window.addEventListener('pagehide', hidePassword);

  claimLegacyBtn.addEventListener('click', claimLegacyLogs);
  saveBtn.addEventListener('click', saveEntry);
  refreshBtn.addEventListener('click', loadTimeline);

  datePicker.addEventListener('change', () => {
    state.selectedDate = datePicker.value || '';
    state.pageIndex = 0;
    state.hasOlder = false;
    loadTimeline();
  });

  latestBtn.addEventListener('click', () => {
    resetTimelineState();
    loadTimeline();
  });

  newerBtn.addEventListener('click', () => {
    if (state.pageIndex <= 0) return;
    state.pageIndex -= 1;
    loadTimeline();
  });

  olderBtn.addEventListener('click', () => {
    if (!state.hasOlder) return;
    state.pageIndex += 1;
    loadTimeline();
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
