/* ========================================
   Scratch Game - 刮刮樂邏輯
   ======================================== */

(function() {
  'use strict';

  // ========== 常數定義 ==========
  const STORAGE_KEY = 'LUCKY_SCRATCH_V1';
  const LOGS_KEY = 'LUCKY_SCRATCH_V1_LOGS';
  const VERSION = 'LUCKY_SCRATCH_V1';
  const REVEAL_THRESHOLD = 0.45; // 45% 揭曉門檻

  // 預設資料
  const DEFAULT_DATA = {
    version: VERSION,
    mode: 'pool', // 'pool' | 'weight'
    maxCards: 10,
    poolItems: [
      { prize: '特獎 iPhone 16', count: 1, isWin: true },
      { prize: '頭獎 iPad Air', count: 2, isWin: true },
      { prize: '貳獎 AirPods Pro', count: 3, isWin: true },
      { prize: '參獎 禮券500元', count: 5, isWin: true },
      { prize: '謝謝參與', count: 20, isWin: false }
    ],
    weightItems: [
      { prize: '大獎', weight: 5, isWin: true },
      { prize: '中獎', weight: 15, isWin: true },
      { prize: '小獎', weight: 30, isWin: true },
      { prize: '謝謝參與', weight: 50, isWin: false }
    ],
    sessionResults: [],
    currentPrize: null,
    isRevealed: false,
    scratchedCount: 0
  };

  // ========== 狀態管理 ==========
  let state = null;
  let canvas, ctx;
  let isDrawing = false;
  let scratchedPixels = 0;
  let totalPixels = 0;

  // ========== DOM 元素 ==========
  const $ = LuckyUtils.$;
  const elements = {};

  function initElements() {
    elements.scratchCard = $('#scratchCard');
    elements.scratchCanvas = $('#scratchCanvas');
    elements.scratchHint = $('#scratchHint');
    elements.cardPrize = $('#cardPrize');
    elements.prizeIcon = $('.prize-icon');
    elements.prizeText = $('.prize-text');
    elements.progressFill = $('#progressFill');
    elements.progressText = $('#progressText');
    elements.resultDisplay = $('#resultDisplay');
    elements.resultText = $('#resultText');
    elements.nextCardBtn = $('#nextCardBtn');
    elements.newGameBtn = $('#newGameBtn');
    elements.maxCards = $('#maxCards');
    elements.cardCount = $('#cardCount');
    elements.scratchedCount = $('#scratchedCount');
    elements.poolRemain = $('#poolRemain');
    elements.poolMode = $('#poolMode');
    elements.weightMode = $('#weightMode');
    elements.poolSettings = $('#poolSettings');
    elements.weightSettings = $('#weightSettings');
    elements.addPoolItemBtn = $('#addPoolItemBtn');
    elements.addWeightItemBtn = $('#addWeightItemBtn');
    elements.applySettingsBtn = $('#applySettingsBtn');
    elements.sessionResults = $('#sessionResults');
    elements.clearSessionBtn = $('#clearSessionBtn');
    elements.logsList = $('#logsList');
    elements.logsCount = $('#logsCount');
    elements.logsToggle = $('#logsToggle');
    elements.logsContent = $('#logsContent');
    elements.exportBtn = $('#exportBtn');
    elements.importBtn = $('#importBtn');
    elements.resetBtn = $('#resetBtn');
    elements.importModal = $('#importModal');
    elements.importFile = $('#importFile');
    elements.importText = $('#importText');
    elements.confirmImport = $('#confirmImport');
    elements.cancelImport = $('#cancelImport');
    elements.closeImportModal = $('#closeImportModal');
  }

  // ========== Canvas 初始化 ==========
  function initCanvas() {
    canvas = elements.scratchCanvas;
    ctx = canvas.getContext('2d');

    // 設定 canvas 尺寸
    const rect = elements.scratchCard.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    totalPixels = canvas.width * canvas.height;

    // 畫遮罩
    drawMask();

    // 事件監聽
    canvas.addEventListener('mousedown', startScratch);
    canvas.addEventListener('mousemove', scratch);
    canvas.addEventListener('mouseup', endScratch);
    canvas.addEventListener('mouseleave', endScratch);

    // 觸控支援
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', endScratch);
  }

  function drawMask() {
    // 純色遮罩背景
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 裝飾圖案
    ctx.fillStyle = '#6b7280';
    const patternSize = 20;
    for (let x = 0; x < canvas.width; x += patternSize * 2) {
      for (let y = 0; y < canvas.height; y += patternSize * 2) {
        ctx.fillRect(x, y, patternSize, patternSize);
        ctx.fillRect(x + patternSize, y + patternSize, patternSize, patternSize);
      }
    }

    // 刮刮樂文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('刮開有獎', canvas.width / 2, canvas.height / 2);

    scratchedPixels = 0;
    updateProgress();
  }

  // ========== 刮除邏輯 ==========
  function startScratch(e) {
    if (state.isRevealed) return;
    isDrawing = true;
    elements.scratchCard.classList.add('scratching');
    scratch(e);
  }

  function scratch(e) {
    if (!isDrawing || state.isRevealed) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 使用 destination-out 模式刮除
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    updateScratchProgress();
  }

  function endScratch() {
    isDrawing = false;
    elements.scratchCard.classList.remove('scratching');
  }

  function handleTouchStart(e) {
    e.preventDefault();
    if (state.isRevealed) return;
    isDrawing = true;
    elements.scratchCard.classList.add('scratching');
    handleTouchMove(e);
  }

  function handleTouchMove(e) {
    e.preventDefault();
    if (!isDrawing || state.isRevealed) return;

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    updateScratchProgress();
  }

  function updateScratchProgress() {
    // 計算已刮除的比例
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;

    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) {
        transparent++;
      }
    }

    const percentage = transparent / (totalPixels);
    updateProgress(percentage);

    // 達到門檻揭曉
    if (percentage >= REVEAL_THRESHOLD && !state.isRevealed) {
      reveal();
    }
  }

  function updateProgress(percentage = 0) {
    const percent = Math.round(percentage * 100);
    elements.progressFill.style.width = `${percent}%`;
    elements.progressText.textContent = `已刮 ${percent}%`;
  }

  // ========== 揭曉與結果 ==========
  function reveal() {
    state.isRevealed = true;
    elements.scratchCard.classList.add('revealed', 'locked');

    // 清除剩餘遮罩
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateProgress(1);

    // 記錄結果
    state.sessionResults.push({
      prize: state.currentPrize.prize,
      isWin: state.currentPrize.isWin
    });
    state.scratchedCount++;

    // 獎池模式扣庫存
    if (state.mode === 'pool') {
      const poolItem = state.poolItems.find(i => i.prize === state.currentPrize.prize);
      if (poolItem && poolItem.count > 0) {
        poolItem.count--;
      }
    }

    // 寫入 log
    LuckyUtils.addLog(LOGS_KEY, '刮刮樂', state.currentPrize.prize);

    saveState();
    updateUI();

    // 顯示結果
    elements.resultDisplay.classList.remove('hidden');
    elements.resultText.textContent = state.currentPrize.prize;

    if (state.currentPrize.isWin) {
      LuckyUtils.showToast(`恭喜獲得：${state.currentPrize.prize}`, 'success');
    } else {
      LuckyUtils.showToast(state.currentPrize.prize, 'info');
    }
  }

  // ========== 卡片管理 ==========
  function prepareNewCard() {
    // 檢查是否還能抽
    if (state.mode === 'pool') {
      const available = state.poolItems.filter(i => i.count > 0);
      if (available.length === 0) {
        LuckyUtils.showToast('獎池已空', 'warning');
        elements.nextCardBtn.disabled = true;
        return false;
      }
    }

    // 檢查張數限制
    if (state.maxCards > 0 && state.scratchedCount >= state.maxCards) {
      LuckyUtils.showToast('本場已達張數上限', 'warning');
      elements.nextCardBtn.disabled = true;
      return false;
    }

    // 決定獎項
    state.currentPrize = determinePrize();
    state.isRevealed = false;

    // 重置 UI
    elements.scratchCard.classList.remove('revealed', 'locked');
    elements.resultDisplay.classList.add('hidden');
    elements.scratchHint.style.opacity = '1';

    // 更新獎項顯示
    if (state.currentPrize.isWin) {
      elements.prizeIcon.textContent = '$';
      elements.prizeIcon.className = 'prize-icon win';
    } else {
      elements.prizeIcon.textContent = '×';
      elements.prizeIcon.className = 'prize-icon lose';
    }
    elements.prizeText.textContent = state.currentPrize.prize;

    // 重繪遮罩
    ctx.globalCompositeOperation = 'source-over';
    drawMask();

    saveState();
    updateUI();
    return true;
  }

  function determinePrize() {
    if (state.mode === 'pool') {
      const available = state.poolItems.filter(i => i.count > 0);
      const weightedItems = available.map(i => ({ item: i, weight: i.count }));
      return LuckyUtils.weightedRandomPick(weightedItems);
    } else {
      const weightedItems = state.weightItems.map(i => ({ item: i, weight: i.weight }));
      return LuckyUtils.weightedRandomPick(weightedItems);
    }
  }

  function newGame() {
    state.sessionResults = [];
    state.scratchedCount = 0;
    state.currentPrize = null;
    state.isRevealed = false;

    // 重置獎池
    if (state.mode === 'pool') {
      state.poolItems.forEach(item => {
        // 這裡不重置 count，保持使用者設定
      });
    }

    prepareNewCard();
    saveState();
    updateUI();

    LuckyUtils.showToast('新一場開始！', 'success');
  }

  // ========== 資料載入與儲存 ==========
  function loadState() {
    state = LuckyUtils.getData(STORAGE_KEY, DEFAULT_DATA);
    state = { ...DEFAULT_DATA, ...state, version: VERSION };
  }

  function saveState() {
    LuckyUtils.setData(STORAGE_KEY, state);
  }

  // ========== UI 更新 ==========
  function updateUI() {
    updateModeUI();
    updateStats();
    updateSettings();
    updateSessionResults();
    updateLogs();
    updateButtons();
  }

  function updateModeUI() {
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === state.mode);
    });
    elements.poolMode.classList.toggle('active', state.mode === 'pool');
    elements.weightMode.classList.toggle('active', state.mode === 'weight');
    elements.maxCards.value = state.maxCards;
  }

  function updateStats() {
    elements.cardCount.textContent = state.maxCards || '∞';
    elements.scratchedCount.textContent = state.scratchedCount;

    if (state.mode === 'pool') {
      const remain = state.poolItems.reduce((sum, i) => sum + i.count, 0);
      elements.poolRemain.textContent = remain;
    } else {
      elements.poolRemain.textContent = '∞';
    }
  }

  function updateButtons() {
    const canNext = state.isRevealed &&
      (state.maxCards === 0 || state.scratchedCount < state.maxCards);

    if (state.mode === 'pool') {
      const available = state.poolItems.filter(i => i.count > 0);
      elements.nextCardBtn.disabled = !canNext || available.length === 0;
    } else {
      elements.nextCardBtn.disabled = !canNext;
    }
  }

  function updateSettings() {
    // 獎池模式設定
    let poolHtml = '';
    state.poolItems.forEach((item, index) => {
      poolHtml += `
        <div class="setting-row">
          <input type="text" value="${escapeHtml(item.prize)}" class="setting-prize" data-mode="pool" data-index="${index}">
          <input type="number" value="${item.count}" min="0" class="setting-count" data-mode="pool" data-index="${index}">
          <button class="remove-btn" data-mode="pool" data-index="${index}">&times;</button>
        </div>
      `;
    });
    elements.poolSettings.innerHTML = poolHtml || '<p class="empty-text">尚無獎項</p>';

    // 機率模式設定
    let weightHtml = '';
    state.weightItems.forEach((item, index) => {
      weightHtml += `
        <div class="setting-row">
          <input type="text" value="${escapeHtml(item.prize)}" class="setting-prize" data-mode="weight" data-index="${index}">
          <input type="number" value="${item.weight}" min="1" class="setting-weight" data-mode="weight" data-index="${index}">
          <button class="remove-btn" data-mode="weight" data-index="${index}">&times;</button>
        </div>
      `;
    });
    elements.weightSettings.innerHTML = weightHtml || '<p class="empty-text">尚無獎項</p>';

    // 綁定移除按鈕
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        const index = parseInt(btn.dataset.index);
        removeItem(mode, index);
      });
    });
  }

  function updateSessionResults() {
    if (state.sessionResults.length === 0) {
      elements.sessionResults.innerHTML = '<p class="empty-text">尚無紀錄</p>';
    } else {
      elements.sessionResults.innerHTML = state.sessionResults.map((item, index) => `
        <div class="session-item">
          <span class="session-number">${index + 1}</span>
          <span class="session-prize ${item.isWin ? 'win' : 'lose'}">${escapeHtml(item.prize)}</span>
        </div>
      `).join('');
    }
  }

  function updateLogs() {
    const logs = LuckyUtils.getLogs(LOGS_KEY, 10);
    elements.logsCount.textContent = `${LuckyUtils.getLogs(LOGS_KEY).length} 筆`;

    if (logs.length === 0) {
      elements.logsList.innerHTML = '<p class="empty-text" style="padding: var(--space-md);">尚無紀錄</p>';
    } else {
      elements.logsList.innerHTML = logs.map(log => `
        <div class="log-item">
          <div class="log-content">
            <span class="log-action">${escapeHtml(log.action)}</span>
            <span class="log-result">${escapeHtml(log.result)}</span>
          </div>
          <span class="log-time">${LuckyUtils.formatTime(log.timestamp)}</span>
        </div>
      `).join('');
    }
  }

  // ========== 設定管理 ==========
  function addPoolItem() {
    state.poolItems.push({ prize: '新獎項', count: 5, isWin: true });
    saveState();
    updateSettings();
  }

  function addWeightItem() {
    state.weightItems.push({ prize: '新獎項', weight: 10, isWin: true });
    saveState();
    updateSettings();
  }

  function removeItem(mode, index) {
    if (mode === 'pool') {
      state.poolItems.splice(index, 1);
    } else {
      state.weightItems.splice(index, 1);
    }
    saveState();
    updateUI();
  }

  function applySettings() {
    // 讀取設定
    state.maxCards = parseInt(elements.maxCards.value) || 0;

    // 獎池設定
    document.querySelectorAll('#poolSettings .setting-row').forEach((row, index) => {
      if (state.poolItems[index]) {
        const prize = row.querySelector('.setting-prize').value.trim();
        state.poolItems[index].prize = prize || '未命名';
        state.poolItems[index].count = parseInt(row.querySelector('.setting-count').value) || 0;
        // 判斷是否為「謝謝參與」類型
        state.poolItems[index].isWin = !prize.includes('謝謝') && !prize.includes('銘謝');
      }
    });

    // 機率設定
    document.querySelectorAll('#weightSettings .setting-row').forEach((row, index) => {
      if (state.weightItems[index]) {
        const prize = row.querySelector('.setting-prize').value.trim();
        state.weightItems[index].prize = prize || '未命名';
        state.weightItems[index].weight = parseInt(row.querySelector('.setting-weight').value) || 1;
        state.weightItems[index].isWin = !prize.includes('謝謝') && !prize.includes('銘謝');
      }
    });

    saveState();
    updateUI();
    LuckyUtils.showToast('設定已套用', 'success');
  }

  function switchMode(mode) {
    state.mode = mode;
    saveState();
    updateUI();
  }

  function clearSession() {
    state.sessionResults = [];
    state.scratchedCount = 0;
    saveState();
    updateUI();
    LuckyUtils.showToast('紀錄已清除', 'success');
  }

  // ========== 資料匯出入 ==========
  function exportData() {
    const data = {
      ...state,
      exportedAt: LuckyUtils.now(),
      logs: LuckyUtils.getLogs(LOGS_KEY)
    };
    const filename = `scratch_${new Date().toISOString().split('T')[0]}.json`;
    LuckyUtils.exportJSON(data, filename);
    LuckyUtils.showToast('匯出成功', 'success');
  }

  function openImportModal() {
    elements.importModal.classList.add('active');
    elements.importFile.value = '';
    elements.importText.value = '';
  }

  function closeImportModal() {
    elements.importModal.classList.remove('active');
  }

  async function confirmImport() {
    let data = null;

    if (elements.importFile.files.length > 0) {
      try {
        data = await LuckyUtils.importJSONFromFile(elements.importFile.files[0]);
      } catch (e) {
        LuckyUtils.showToast(e.message, 'error');
        return;
      }
    } else if (elements.importText.value.trim()) {
      data = LuckyUtils.parseJSON(elements.importText.value);
      if (!data) {
        LuckyUtils.showToast('JSON 格式錯誤', 'error');
        return;
      }
    } else {
      LuckyUtils.showToast('請選擇檔案或貼上 JSON', 'warning');
      return;
    }

    const validation = LuckyUtils.validateImportData(data, VERSION, ['mode']);
    if (!validation.valid) {
      LuckyUtils.showToast(validation.error, 'error');
      return;
    }

    state = {
      ...DEFAULT_DATA,
      ...data,
      version: VERSION
    };

    if (Array.isArray(data.logs)) {
      LuckyUtils.setData(LOGS_KEY, data.logs);
    }

    saveState();
    prepareNewCard();
    closeImportModal();

    LuckyUtils.showToast('匯入成功', 'success');
  }

  function resetGame() {
    if (!confirm('確定要重置遊戲嗎？所有資料將被清除！')) return;

    state = JSON.parse(JSON.stringify(DEFAULT_DATA));
    LuckyUtils.setData(LOGS_KEY, []);
    saveState();
    prepareNewCard();

    LuckyUtils.showToast('已重置遊戲', 'success');
  }

  // ========== Logs 展開收合 ==========
  function toggleLogs() {
    elements.logsToggle.classList.toggle('expanded');
    elements.logsContent.classList.toggle('expanded');
  }

  // ========== 工具函式 ==========
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========== 事件綁定 ==========
  function bindEvents() {
    elements.nextCardBtn.addEventListener('click', prepareNewCard);
    elements.newGameBtn.addEventListener('click', newGame);
    elements.addPoolItemBtn.addEventListener('click', addPoolItem);
    elements.addWeightItemBtn.addEventListener('click', addWeightItem);
    elements.applySettingsBtn.addEventListener('click', applySettings);
    elements.clearSessionBtn.addEventListener('click', clearSession);
    elements.logsToggle.addEventListener('click', toggleLogs);
    elements.exportBtn.addEventListener('click', exportData);
    elements.importBtn.addEventListener('click', openImportModal);
    elements.resetBtn.addEventListener('click', resetGame);
    elements.confirmImport.addEventListener('click', confirmImport);
    elements.cancelImport.addEventListener('click', closeImportModal);
    elements.closeImportModal.addEventListener('click', closeImportModal);

    // 模式切換
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => switchMode(tab.dataset.mode));
    });

    elements.importModal.addEventListener('click', (e) => {
      if (e.target === elements.importModal) {
        closeImportModal();
      }
    });

    // 視窗大小改變時重新初始化 canvas
    window.addEventListener('resize', () => {
      if (!state.isRevealed) {
        initCanvas();
      }
    });
  }

  // ========== 初始化 ==========
  function init() {
    initElements();
    loadState();
    initCanvas();
    bindEvents();
    prepareNewCard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
