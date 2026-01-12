/* ========================================
   Gacha Game - 扭蛋機邏輯
   ======================================== */

(function() {
  'use strict';

  // ========== 常數定義 ==========
  const STORAGE_KEY = 'LUCKY_GACHA_V1';
  const LOGS_KEY = 'LUCKY_GACHA_V1_LOGS';
  const VERSION = 'LUCKY_GACHA_V1';

  // 預設資料
  const DEFAULT_DATA = {
    version: VERSION,
    colors: [
      { id: 1, color: '#ef4444', name: '特獎', total: 1, remaining: 1 },
      { id: 2, color: '#f59e0b', name: '頭獎', total: 2, remaining: 2 },
      { id: 3, color: '#22c55e', name: '貳獎', total: 5, remaining: 5 },
      { id: 4, color: '#3b82f6', name: '參獎', total: 10, remaining: 10 },
      { id: 5, color: '#8b5cf6', name: '參加獎', total: 20, remaining: 20 }
    ],
    drawnCount: 0,
    nextColorId: 6
  };

  // ========== 狀態管理 ==========
  let state = null;
  let isDrawing = false;

  // ========== DOM 元素 ==========
  const $ = LuckyUtils.$;
  const elements = {};

  function initElements() {
    elements.capsulesDisplay = $('#capsulesDisplay');
    elements.machineKnob = $('#machineKnob');
    elements.fallingCapsule = $('#fallingCapsule');
    elements.gachaBtn = $('#gachaBtn');
    elements.resultText = $('#resultText');
    elements.resultCapsule = $('#resultCapsule');
    elements.resultPrize = $('#resultPrize');
    elements.inventoryGrid = $('#inventoryGrid');
    elements.totalCount = $('#totalCount');
    elements.drawnCount = $('#drawnCount');
    elements.colorSettings = $('#colorSettings');
    elements.addColorBtn = $('#addColorBtn');
    elements.applySettingsBtn = $('#applySettingsBtn');
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
    updateCapsulesDisplay();
    updateInventory();
    updateStats();
    updateColorSettings();
    updateLogs();
    updateButtons();
  }

  function updateCapsulesDisplay() {
    let html = '';
    const maxDisplay = 30;
    let count = 0;

    // 產生小膠囊球展示
    state.colors.forEach(colorItem => {
      for (let i = 0; i < colorItem.remaining && count < maxDisplay; i++) {
        html += `<div class="mini-capsule" style="background: ${colorItem.color}"></div>`;
        count++;
      }
    });

    if (count === 0) {
      html = '<div style="color: var(--text-tertiary); text-align: center; padding: 20px;">空了</div>';
    }

    elements.capsulesDisplay.innerHTML = html;
  }

  function updateInventory() {
    let html = '';

    state.colors.forEach(colorItem => {
      html += `
        <div class="inventory-item">
          <div class="inventory-color" style="background: ${colorItem.color}"></div>
          <div class="inventory-info">
            <div class="inventory-name">${escapeHtml(colorItem.name)}</div>
            <div class="inventory-count">剩餘 ${colorItem.remaining} / ${colorItem.total}</div>
          </div>
        </div>
      `;
    });

    elements.inventoryGrid.innerHTML = html || '<p style="color: var(--text-tertiary);">尚未設定顏色</p>';
  }

  function updateStats() {
    const total = state.colors.reduce((sum, c) => sum + c.total, 0);
    const remaining = state.colors.reduce((sum, c) => sum + c.remaining, 0);

    elements.totalCount.textContent = remaining;
    elements.drawnCount.textContent = state.drawnCount;
  }

  function updateButtons() {
    const remaining = state.colors.reduce((sum, c) => sum + c.remaining, 0);
    elements.gachaBtn.disabled = remaining === 0 || isDrawing;
  }

  function updateColorSettings() {
    let html = '';

    state.colors.forEach((colorItem, index) => {
      html += `
        <div class="color-setting-row" data-id="${colorItem.id}">
          <input type="color" value="${colorItem.color}" class="setting-color">
          <input type="text" value="${escapeHtml(colorItem.name)}" placeholder="獎項名稱" class="setting-name">
          <input type="number" value="${colorItem.total}" min="0" class="setting-count">
          <button class="remove-color-btn" data-id="${colorItem.id}">&times;</button>
        </div>
      `;
    });

    elements.colorSettings.innerHTML = html || '<p style="color: var(--text-tertiary);">點擊「新增顏色」來設定獎項</p>';

    // 綁定移除按鈕事件
    elements.colorSettings.querySelectorAll('.remove-color-btn').forEach(btn => {
      btn.addEventListener('click', () => removeColor(parseInt(btn.dataset.id)));
    });
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

  // ========== 扭蛋邏輯 ==========
  function draw() {
    if (isDrawing) return;

    // 計算可抽的顏色
    const availableColors = state.colors.filter(c => c.remaining > 0);
    if (availableColors.length === 0) {
      LuckyUtils.showToast('沒有可抽的扭蛋了', 'warning');
      return;
    }

    isDrawing = true;
    updateButtons();

    // 轉鈕動畫
    elements.machineKnob.classList.add('turning');
    elements.resultText.textContent = '扭蛋中...';
    elements.resultCapsule.classList.add('hidden');
    elements.resultPrize.classList.add('hidden');

    // 根據剩餘數量計算權重
    const weightedItems = availableColors.map(c => ({
      item: c,
      weight: c.remaining
    }));

    const result = LuckyUtils.weightedRandomPick(weightedItems);

    setTimeout(() => {
      elements.machineKnob.classList.remove('turning');

      // 設定掉落膠囊顏色
      const capsule = elements.fallingCapsule.querySelector('.capsule');
      capsule.querySelector('.capsule-top').style.background = result.color;
      elements.fallingCapsule.classList.remove('hidden');
      elements.fallingCapsule.classList.add('dropping');

      setTimeout(() => {
        finishDraw(result);
      }, 800);
    }, 500);
  }

  function finishDraw(result) {
    isDrawing = false;

    // 重置掉落動畫
    elements.fallingCapsule.classList.remove('dropping');
    elements.fallingCapsule.classList.add('hidden');

    // 扣庫存
    result.remaining--;
    state.drawnCount++;

    // 顯示結果
    const resultCapsuleTop = elements.resultCapsule.querySelector('.capsule-top');
    resultCapsuleTop.style.background = result.color;
    elements.resultCapsule.classList.remove('hidden');
    elements.resultText.textContent = result.name;
    elements.resultPrize.textContent = `恭喜獲得！`;
    elements.resultPrize.classList.remove('hidden');

    // 寫入 log
    LuckyUtils.addLog(LOGS_KEY, '扭蛋', `${result.name} (${result.color})`);

    saveState();
    updateUI();

    LuckyUtils.showToast(`恭喜獲得：${result.name}`, 'success');
  }

  // ========== 顏色設定管理 ==========
  function addColor() {
    const newColor = {
      id: state.nextColorId++,
      color: getRandomColor(),
      name: '新獎項',
      total: 5,
      remaining: 5
    };
    state.colors.push(newColor);
    saveState();
    updateColorSettings();
  }

  function removeColor(id) {
    state.colors = state.colors.filter(c => c.id !== id);
    saveState();
    updateUI();
  }

  function applySettings() {
    const rows = elements.colorSettings.querySelectorAll('.color-setting-row');

    rows.forEach(row => {
      const id = parseInt(row.dataset.id);
      const colorItem = state.colors.find(c => c.id === id);
      if (!colorItem) return;

      const newColor = row.querySelector('.setting-color').value;
      const newName = row.querySelector('.setting-name').value.trim();
      const newTotal = parseInt(row.querySelector('.setting-count').value) || 0;

      // 計算已抽數量
      const drawn = colorItem.total - colorItem.remaining;
      const newRemaining = Math.max(0, newTotal - drawn);

      colorItem.color = newColor;
      colorItem.name = newName || '未命名';
      colorItem.total = newTotal;
      colorItem.remaining = newRemaining;
    });

    saveState();
    updateUI();

    LuckyUtils.showToast('設定已套用', 'success');
  }

  function getRandomColor() {
    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // ========== 資料匯出入 ==========
  function exportData() {
    const data = {
      ...state,
      exportedAt: LuckyUtils.now(),
      logs: LuckyUtils.getLogs(LOGS_KEY)
    };
    const filename = `gacha_${new Date().toISOString().split('T')[0]}.json`;
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

    const validation = LuckyUtils.validateImportData(data, VERSION, ['colors']);
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

    elements.resultText.textContent = '點擊轉鈕開始扭蛋';
    elements.resultCapsule.classList.add('hidden');
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
    elements.gachaBtn.addEventListener('click', draw);
    elements.machineKnob.addEventListener('click', draw);
    elements.addColorBtn.addEventListener('click', addColor);
    elements.applySettingsBtn.addEventListener('click', applySettings);
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
