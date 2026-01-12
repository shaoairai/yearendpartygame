/* ========================================
   Picker Game - 抽籤筒邏輯
   加入籤條抽出打橫顯示名字效果
   ======================================== */

(function() {
  'use strict';

  // ========== 常數定義 ==========
  const STORAGE_KEY = 'LUCKY_PICKER_V1';
  const LOGS_KEY = 'LUCKY_PICKER_V1_LOGS';
  const VERSION = 'LUCKY_PICKER_V1';

  // 預設資料
  const DEFAULT_DATA = {
    version: VERSION,
    allNames: [
      '王小明', '李小華', '張大偉', '陳美麗', '林志明',
      '黃小芳', '劉建國', '吳美玲', '周大同', '鄭小雯'
    ],
    blacklist: [],
    pool: [],
    drawn: [],
    lastDrawn: null
  };

  // ========== 狀態管理 ==========
  let state = null;
  let isPicking = false;

  // ========== DOM 元素 ==========
  const $ = LuckyUtils.$;
  const elements = {};

  function initElements() {
    elements.pickerJar = $('#pickerJar');
    elements.sticksContainer = $('#sticksContainer');
    elements.shakeHint = $('#shakeHint');
    elements.pickedStickContainer = $('#pickedStickContainer');
    elements.pickedStickName = $('#pickedStickName');
    elements.pickBtn = $('#pickBtn');
    elements.undoBtn = $('#undoBtn');
    elements.listInput = $('#listInput');
    elements.blacklistInput = $('#blacklistInput');
    elements.applyListBtn = $('#applyListBtn');
    elements.applyBlacklistBtn = $('#applyBlacklistBtn');
    elements.resultText = $('#resultText');
    elements.resultDisplay = $('#resultDisplay');
    elements.totalCount = $('#totalCount');
    elements.remainCount = $('#remainCount');
    elements.drawnCount = $('#drawnCount');
    elements.drawnList = $('#drawnList');
    elements.clearDrawnBtn = $('#clearDrawnBtn');
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
    state = LuckyUtils.getData(STORAGE_KEY, null);
    if (!state) {
      state = { ...DEFAULT_DATA };
      updatePool();
    }
    state = { ...DEFAULT_DATA, ...state, version: VERSION };
  }

  function saveState() {
    LuckyUtils.setData(STORAGE_KEY, state);
  }

  function updatePool() {
    const blackSet = new Set(state.blacklist.map(n => n.toLowerCase()));
    const drawnSet = new Set(state.drawn.map(n => n.toLowerCase()));

    state.pool = state.allNames.filter(name => {
      const lower = name.toLowerCase();
      return !blackSet.has(lower) && !drawnSet.has(lower);
    });
  }

  // ========== UI 更新 ==========
  function updateUI() {
    updateStats();
    updateSticks();
    updateDrawnList();
    updateLogs();
    updateUndoButton();

    elements.listInput.value = state.allNames.join('\n');
    elements.blacklistInput.value = state.blacklist.join('\n');
  }

  function updateStats() {
    const total = state.allNames.length - state.blacklist.length;
    const remain = state.pool.length;
    const drawn = state.drawn.length;

    elements.totalCount.textContent = total;
    elements.remainCount.textContent = remain;
    elements.drawnCount.textContent = drawn;

    elements.pickBtn.disabled = remain === 0 || isPicking;
  }

  function updateUndoButton() {
    elements.undoBtn.disabled = !state.lastDrawn || isPicking;
  }

  function updateSticks() {
    const count = Math.min(state.pool.length, 7);
    let html = '';

    if (count === 0) {
      html = '<div class="jar-empty">空了</div>';
    } else {
      for (let i = 0; i < count; i++) {
        html += '<div class="stick"></div>';
      }
    }

    elements.sticksContainer.innerHTML = html;
  }

  function updateDrawnList() {
    if (state.drawn.length === 0) {
      elements.drawnList.innerHTML = '<p class="empty-text">尚無已抽人員</p>';
    } else {
      elements.drawnList.innerHTML = state.drawn
        .map((name, index) => `
          <span class="drawn-item">
            <span class="drawn-item-number">${index + 1}</span>
            ${escapeHtml(name)}
          </span>
        `)
        .join('');
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

  // ========== 抽籤邏輯 ==========
  function pick() {
    if (isPicking || state.pool.length === 0) return;

    isPicking = true;
    elements.pickBtn.disabled = true;
    elements.undoBtn.disabled = true;

    // 隱藏之前的籤條
    elements.pickedStickContainer.classList.remove('show');

    // 搖晃動畫
    elements.pickerJar.classList.add('shaking');
    elements.shakeHint.classList.add('hidden');
    elements.resultText.textContent = '抽籤中...';

    setTimeout(() => {
      elements.pickerJar.classList.remove('shaking');

      // 決定結果
      const result = LuckyUtils.randomPick(state.pool);
      finishPick(result);
    }, 600);
  }

  function finishPick(result) {
    // 顯示抽出的籤條（打橫並顯示名字）
    elements.pickedStickName.textContent = result;
    elements.pickedStickContainer.classList.add('show');

    // 延遲後完成處理
    setTimeout(() => {
      isPicking = false;

      // 儲存供 Undo
      state.lastDrawn = result;

      // 從 pool 移除，加入 drawn
      const index = state.pool.indexOf(result);
      if (index !== -1) {
        state.pool.splice(index, 1);
      }
      state.drawn.push(result);

      // 更新 UI
      elements.resultText.textContent = result;
      elements.shakeHint.classList.remove('hidden');
      elements.shakeHint.textContent = '點擊抽籤或搖一搖';

      // 寫入 log
      LuckyUtils.addLog(LOGS_KEY, '抽籤', result);

      saveState();
      updateUI();

      LuckyUtils.showToast(`抽中：${result}`, 'success');
    }, 1000);
  }

  function undo() {
    if (!state.lastDrawn) return;

    const name = state.lastDrawn;

    // 從 drawn 移除
    const index = state.drawn.indexOf(name);
    if (index !== -1) {
      state.drawn.splice(index, 1);
    }

    // 更新 pool
    updatePool();

    LuckyUtils.addLog(LOGS_KEY, '復原', name);

    state.lastDrawn = null;
    saveState();
    updateUI();

    // 隱藏籤條
    elements.pickedStickContainer.classList.remove('show');
    elements.resultText.textContent = '已復原';
    LuckyUtils.showToast('已復原上一次抽籤', 'info');
  }

  // ========== 名單管理 ==========
  function applyList() {
    const text = elements.listInput.value;
    const names = LuckyUtils.parseLines(text, true);

    if (names.length === 0) {
      LuckyUtils.showToast('請輸入至少一個名字', 'warning');
      return;
    }

    state.allNames = names;
    state.drawn = [];
    state.lastDrawn = null;
    updatePool();
    saveState();
    updateUI();

    // 隱藏籤條
    elements.pickedStickContainer.classList.remove('show');
    LuckyUtils.showToast(`已套用 ${names.length} 人名單`, 'success');
  }

  function applyBlacklist() {
    const text = elements.blacklistInput.value;
    const blacklist = LuckyUtils.parseLines(text, true);

    state.blacklist = blacklist;
    updatePool();
    saveState();
    updateUI();

    LuckyUtils.showToast(`黑名單已更新（${blacklist.length} 人）`, 'success');
  }

  function clearDrawn() {
    if (state.drawn.length === 0) return;

    state.drawn = [];
    state.lastDrawn = null;
    updatePool();

    LuckyUtils.addLog(LOGS_KEY, '清除已抽', `${state.pool.length} 人回池`);

    saveState();
    updateUI();

    // 隱藏籤條
    elements.pickedStickContainer.classList.remove('show');
    elements.resultText.textContent = '等待抽籤...';
    LuckyUtils.showToast('已清除，所有人回到池中', 'success');
  }

  // ========== 資料匯出入 ==========
  function exportData() {
    const data = {
      ...state,
      exportedAt: LuckyUtils.now(),
      logs: LuckyUtils.getLogs(LOGS_KEY)
    };
    const filename = `picker_${new Date().toISOString().split('T')[0]}.json`;
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

    const validation = LuckyUtils.validateImportData(data, VERSION, ['allNames']);
    if (!validation.valid) {
      LuckyUtils.showToast(validation.error, 'error');
      return;
    }

    state = {
      ...DEFAULT_DATA,
      ...data,
      version: VERSION
    };
    updatePool();

    if (Array.isArray(data.logs)) {
      LuckyUtils.setData(LOGS_KEY, data.logs);
    }

    saveState();
    updateUI();
    closeImportModal();

    elements.pickedStickContainer.classList.remove('show');
    LuckyUtils.showToast('匯入成功', 'success');
  }

  function resetGame() {
    if (!confirm('確定要重置遊戲嗎？所有資料將被清除！')) return;

    state = { ...DEFAULT_DATA };
    updatePool();
    LuckyUtils.setData(LOGS_KEY, []);
    saveState();
    updateUI();

    elements.pickedStickContainer.classList.remove('show');
    elements.resultText.textContent = '等待抽籤...';
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
    elements.pickBtn.addEventListener('click', pick);
    elements.pickerJar.addEventListener('click', pick);
    elements.undoBtn.addEventListener('click', undo);
    elements.applyListBtn.addEventListener('click', applyList);
    elements.applyBlacklistBtn.addEventListener('click', applyBlacklist);
    elements.clearDrawnBtn.addEventListener('click', clearDrawn);
    elements.logsToggle.addEventListener('click', toggleLogs);
    elements.exportBtn.addEventListener('click', exportData);
    elements.importBtn.addEventListener('click', openImportModal);
    elements.resetBtn.addEventListener('click', resetGame);
    elements.confirmImport.addEventListener('click', confirmImport);
    elements.cancelImport.addEventListener('click', closeImportModal);
    elements.closeImportModal.addEventListener('click', closeImportModal);

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
