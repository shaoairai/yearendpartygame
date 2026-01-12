/* ========================================
   Slot Game - 拉霸機邏輯
   支援中獎/沒中獎機制
   ======================================== */

(function() {
  'use strict';

  // ========== 常數定義 ==========
  const STORAGE_KEY = 'LUCKY_SLOT_V1';
  const LOGS_KEY = 'LUCKY_SLOT_V1_LOGS';
  const VERSION = 'LUCKY_SLOT_V1';

  // 符號定義
  const SYMBOLS = [
    { id: 'seven', display: '7', className: 'symbol-seven' },
    { id: 'star', display: '★', className: 'symbol-star' },
    { id: 'circle', display: '●', className: 'symbol-circle' },
    { id: 'square', display: '■', className: 'symbol-square' },
    { id: 'triangle', display: '▲', className: 'symbol-triangle' },
    { id: 'diamond', display: '◆', className: 'symbol-diamond' }
  ];

  // 預設資料
  const DEFAULT_DATA = {
    version: VERSION,
    mode: 'pool', // 'pool' | 'weight'
    // 獎池模式：必定中獎，抽到後移除
    poolItems: [
      { symbol: 'seven', prize: '特獎 iPhone', count: 1 },
      { symbol: 'star', prize: '頭獎 iPad', count: 2 },
      { symbol: 'circle', prize: '貳獎 AirPods', count: 3 },
      { symbol: 'square', prize: '參獎 禮券500', count: 5 },
      { symbol: 'triangle', prize: '肆獎 禮券100', count: 10 }
    ],
    // 機率模式：根據權重，可能沒中獎
    weightItems: [
      { symbol: 'seven', prize: '大獎', weight: 5 },
      { symbol: 'star', prize: '中獎', weight: 10 },
      { symbol: 'circle', prize: '小獎', weight: 15 },
      { symbol: 'square', prize: '安慰獎', weight: 20 }
    ],
    missWeight: 50, // 沒中獎的權重
    spinCount: 0,
    winCount: 0,
    missCount: 0
  };

  // ========== 狀態管理 ==========
  let state = null;
  let isSpinning = false;

  // ========== DOM 元素 ==========
  const $ = LuckyUtils.$;
  const elements = {};

  function initElements() {
    elements.strip1 = $('#strip1');
    elements.strip2 = $('#strip2');
    elements.strip3 = $('#strip3');
    elements.lever = $('#lever');
    elements.spinBtn = $('#spinBtn');
    elements.slotMachine = $('.slot-machine');
    elements.resultText = $('#resultText');
    elements.resultPrize = $('#resultPrize');
    elements.spinCount = $('#spinCount');
    elements.winCount = $('#winCount');
    elements.missCount = $('#missCount');
    elements.poolRemain = $('#poolRemain');
    elements.poolMode = $('#poolMode');
    elements.weightMode = $('#weightMode');
    elements.poolSettings = $('#poolSettings');
    elements.weightSettings = $('#weightSettings');
    elements.missWeightInput = $('#missWeightInput');
    elements.addPoolItemBtn = $('#addPoolItemBtn');
    elements.addWeightItemBtn = $('#addWeightItemBtn');
    elements.applySettingsBtn = $('#applySettingsBtn');
    elements.winCombinations = $('#winCombinations');
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
    updateReels();
    updateWinCombinations();
    updateLogs();
    updateButtons();
  }

  function updateModeUI() {
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === state.mode);
    });
    elements.poolMode.classList.toggle('active', state.mode === 'pool');
    elements.weightMode.classList.toggle('active', state.mode === 'weight');
  }

  function updateStats() {
    elements.spinCount.textContent = state.spinCount;
    elements.winCount.textContent = state.winCount;
    elements.missCount.textContent = state.missCount;

    if (state.mode === 'pool') {
      const remain = state.poolItems.reduce((sum, item) => sum + item.count, 0);
      elements.poolRemain.textContent = remain;
    } else {
      elements.poolRemain.textContent = '∞';
    }
  }

  function updateButtons() {
    const canSpin = state.mode === 'weight' ||
      state.poolItems.some(item => item.count > 0);
    elements.spinBtn.disabled = !canSpin || isSpinning;
  }

  function updateSettings() {
    // 獎池模式設定
    let poolHtml = '';
    state.poolItems.forEach((item, index) => {
      poolHtml += createSettingRow(item, index, 'pool');
    });
    elements.poolSettings.innerHTML = poolHtml || '<p style="color: var(--text-tertiary);">尚無獎項</p>';

    // 機率模式設定
    let weightHtml = '';
    state.weightItems.forEach((item, index) => {
      weightHtml += createSettingRow(item, index, 'weight');
    });
    elements.weightSettings.innerHTML = weightHtml || '<p style="color: var(--text-tertiary);">尚無符號</p>';

    // 沒中獎權重
    if (elements.missWeightInput) {
      elements.missWeightInput.value = state.missWeight;
    }

    // 綁定移除按鈕
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        const index = parseInt(btn.dataset.index);
        removeItem(mode, index);
      });
    });
  }

  function createSettingRow(item, index, mode) {
    const symbolOptions = SYMBOLS.map(s =>
      `<option value="${s.id}" ${item.symbol === s.id ? 'selected' : ''}>${s.display}</option>`
    ).join('');

    const countField = mode === 'pool'
      ? `<input type="number" value="${item.count}" min="0" class="setting-count" data-mode="${mode}" data-index="${index}">`
      : `<input type="number" value="${item.weight}" min="1" class="setting-weight" data-mode="${mode}" data-index="${index}">`;

    return `
      <div class="setting-row">
        <select class="setting-symbol" data-mode="${mode}" data-index="${index}">
          ${symbolOptions}
        </select>
        <input type="text" value="${escapeHtml(item.prize)}" class="setting-prize" data-mode="${mode}" data-index="${index}" placeholder="獎項名稱">
        ${countField}
        <button class="remove-btn" data-mode="${mode}" data-index="${index}">&times;</button>
      </div>
    `;
  }

  function updateReels() {
    // 產生轉輪符號 - 使用所有可用符號
    const allSymbols = SYMBOLS.map(s => s.id);
    [elements.strip1, elements.strip2, elements.strip3].forEach(strip => {
      let html = '';
      // 多產生一些符號以便動畫
      for (let i = 0; i < 15; i++) {
        allSymbols.forEach(s => {
          const symbolData = SYMBOLS.find(sym => sym.id === s);
          html += `<div class="reel-symbol"><span class="${symbolData.className}">${symbolData.display}</span></div>`;
        });
      }
      strip.innerHTML = html;
      strip.style.transform = 'translateY(0)';
    });
  }

  function updateWinCombinations() {
    const items = state.mode === 'pool' ? state.poolItems : state.weightItems;
    let html = '';

    items.forEach(item => {
      const symbolData = SYMBOLS.find(s => s.id === item.symbol);
      html += `
        <div class="win-combo">
          <div class="combo-symbols">
            <span class="combo-symbol">${symbolData.display}</span>
            <span class="combo-symbol">${symbolData.display}</span>
            <span class="combo-symbol">${symbolData.display}</span>
          </div>
          <span class="combo-prize">${escapeHtml(item.prize)}</span>
        </div>
      `;
    });

    if (state.mode === 'weight') {
      html += `
        <div class="win-combo miss-combo">
          <div class="combo-symbols">
            <span class="combo-symbol">?</span>
            <span class="combo-symbol">?</span>
            <span class="combo-symbol">?</span>
          </div>
          <span class="combo-prize miss">沒中獎 (權重: ${state.missWeight})</span>
        </div>
      `;
    }

    elements.winCombinations.innerHTML = html || '<p style="color: var(--text-secondary);">尚無中獎組合</p>';
  }

  function updateLogs() {
    const logs = LuckyUtils.getLogs(LOGS_KEY, 10);
    elements.logsCount.textContent = `${LuckyUtils.getLogs(LOGS_KEY).length} 筆`;

    if (logs.length === 0) {
      elements.logsList.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: var(--space-md);">尚無紀錄</p>';
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

  // ========== 拉霸邏輯 ==========
  function spin() {
    if (isSpinning) return;

    // 檢查是否有可抽項目（獎池模式）
    if (state.mode === 'pool') {
      const available = state.poolItems.filter(i => i.count > 0);
      if (available.length === 0) {
        LuckyUtils.showToast('獎池已空', 'warning');
        return;
      }
    }

    isSpinning = true;
    updateButtons();

    // 拉桿動畫
    elements.lever.classList.add('pulled');
    elements.resultText.textContent = '旋轉中...';
    elements.resultPrize.classList.add('hidden');
    elements.slotMachine.classList.remove('winning', 'losing');

    // 先決定結果
    const result = determineResult();

    // 開始旋轉動畫
    [elements.strip1, elements.strip2, elements.strip3].forEach(strip => {
      strip.classList.add('spinning');
    });

    // 依序停止轉輪
    setTimeout(() => stopReel(elements.strip1, result.symbols[0]), 1000);
    setTimeout(() => stopReel(elements.strip2, result.symbols[1]), 1500);
    setTimeout(() => stopReel(elements.strip3, result.symbols[2]), 2000);

    setTimeout(() => {
      elements.lever.classList.remove('pulled');
      finishSpin(result);
    }, 2500);
  }

  function determineResult() {
    if (state.mode === 'pool') {
      // 獎池模式：必定中獎
      const available = state.poolItems.filter(i => i.count > 0);
      const weightedItems = available.map(i => ({ item: i, weight: i.count }));
      const winItem = LuckyUtils.weightedRandomPick(weightedItems);

      return {
        isWin: true,
        prize: winItem,
        symbols: [winItem.symbol, winItem.symbol, winItem.symbol]
      };
    } else {
      // 機率模式：可能沒中獎
      const totalWeight = state.weightItems.reduce((sum, i) => sum + i.weight, 0) + state.missWeight;
      const random = Math.random() * totalWeight;

      let cumulative = 0;
      for (const item of state.weightItems) {
        cumulative += item.weight;
        if (random < cumulative) {
          // 中獎
          return {
            isWin: true,
            prize: item,
            symbols: [item.symbol, item.symbol, item.symbol]
          };
        }
      }

      // 沒中獎 - 產生不一樣的符號組合
      const allSymbols = SYMBOLS.map(s => s.id);
      let symbols;
      do {
        symbols = [
          allSymbols[Math.floor(Math.random() * allSymbols.length)],
          allSymbols[Math.floor(Math.random() * allSymbols.length)],
          allSymbols[Math.floor(Math.random() * allSymbols.length)]
        ];
      } while (symbols[0] === symbols[1] && symbols[1] === symbols[2]);

      return {
        isWin: false,
        prize: null,
        symbols: symbols
      };
    }
  }

  function stopReel(strip, symbolId) {
    strip.classList.remove('spinning');

    // 找到對應符號的位置
    const symbolData = SYMBOLS.find(s => s.id === symbolId);
    const symbols = strip.querySelectorAll('.reel-symbol');
    let targetIndex = 0;

    // 找到一個符合的符號位置（避免太靠近開頭或結尾）
    for (let i = 10; i < symbols.length - 10; i++) {
      if (symbols[i].textContent.includes(symbolData.display)) {
        targetIndex = i;
        break;
      }
    }

    // 設定位置讓符號顯示在中央
    const symbolHeight = 90;
    const offset = targetIndex * symbolHeight;
    strip.style.transform = `translateY(-${offset}px)`;
  }

  function finishSpin(result) {
    isSpinning = false;

    state.spinCount++;

    if (result.isWin) {
      state.winCount++;

      // 獎池模式要扣庫存
      if (state.mode === 'pool') {
        const poolItem = state.poolItems.find(i => i.symbol === result.prize.symbol);
        if (poolItem) {
          poolItem.count--;
        }
      }

      // 顯示結果
      const symbolData = SYMBOLS.find(s => s.id === result.prize.symbol);
      elements.resultText.textContent = `${symbolData.display} ${symbolData.display} ${symbolData.display}`;
      elements.resultPrize.textContent = `恭喜獲得：${result.prize.prize}`;
      elements.resultPrize.classList.remove('hidden');
      elements.slotMachine.classList.add('winning');

      // 寫入 log
      LuckyUtils.addLog(LOGS_KEY, '中獎', result.prize.prize);
      LuckyUtils.showToast(`恭喜中獎：${result.prize.prize}`, 'success');
    } else {
      state.missCount++;

      // 顯示沒中獎結果
      const displaySymbols = result.symbols.map(s => {
        const data = SYMBOLS.find(sym => sym.id === s);
        return data.display;
      }).join(' ');

      elements.resultText.textContent = displaySymbols;
      elements.resultPrize.textContent = '很可惜，沒有中獎';
      elements.resultPrize.classList.remove('hidden');
      elements.slotMachine.classList.add('losing');

      // 寫入 log
      LuckyUtils.addLog(LOGS_KEY, '沒中獎', displaySymbols);
      LuckyUtils.showToast('沒有中獎，再試一次！', 'info');
    }

    saveState();
    updateUI();
  }

  // ========== 設定管理 ==========
  function addPoolItem() {
    state.poolItems.push({
      symbol: 'circle',
      prize: '新獎項',
      count: 5
    });
    saveState();
    updateSettings();
  }

  function addWeightItem() {
    state.weightItems.push({
      symbol: 'circle',
      prize: '新獎項',
      weight: 10
    });
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
    // 讀取獎池設定
    document.querySelectorAll('#poolSettings .setting-row').forEach((row, index) => {
      if (state.poolItems[index]) {
        state.poolItems[index].symbol = row.querySelector('.setting-symbol').value;
        state.poolItems[index].prize = row.querySelector('.setting-prize').value.trim() || '未命名';
        state.poolItems[index].count = parseInt(row.querySelector('.setting-count').value) || 0;
      }
    });

    // 讀取機率設定
    document.querySelectorAll('#weightSettings .setting-row').forEach((row, index) => {
      if (state.weightItems[index]) {
        state.weightItems[index].symbol = row.querySelector('.setting-symbol').value;
        state.weightItems[index].prize = row.querySelector('.setting-prize').value.trim() || '未命名';
        state.weightItems[index].weight = parseInt(row.querySelector('.setting-weight').value) || 1;
      }
    });

    // 讀取沒中獎權重
    if (elements.missWeightInput) {
      state.missWeight = parseInt(elements.missWeightInput.value) || 0;
    }

    saveState();
    updateUI();
    LuckyUtils.showToast('設定已套用', 'success');
  }

  function switchMode(mode) {
    state.mode = mode;
    saveState();
    updateUI();
  }

  // ========== 資料匯出入 ==========
  function exportData() {
    const data = {
      ...state,
      exportedAt: LuckyUtils.now(),
      logs: LuckyUtils.getLogs(LOGS_KEY)
    };
    const filename = `slot_${new Date().toISOString().split('T')[0]}.json`;
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
    updateUI();
    closeImportModal();

    LuckyUtils.showToast('匯入成功', 'success');
  }

  function resetGame() {
    if (!confirm('確定要重置遊戲嗎？所有資料將被清除！')) return;

    state = JSON.parse(JSON.stringify(DEFAULT_DATA));
    LuckyUtils.setData(LOGS_KEY, []);
    saveState();
    updateUI();

    elements.resultText.textContent = '拉下拉桿開始';
    elements.resultPrize.classList.add('hidden');
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
    elements.spinBtn.addEventListener('click', spin);
    elements.lever.addEventListener('click', spin);
    elements.addPoolItemBtn.addEventListener('click', addPoolItem);
    elements.addWeightItemBtn.addEventListener('click', addWeightItem);
    elements.applySettingsBtn.addEventListener('click', applySettings);
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
  }

  // ========== 初始化 ==========
  function init() {
    initElements();
    loadState();
    bindEvents();
    updateUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
