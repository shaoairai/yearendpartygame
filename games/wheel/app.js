/* ========================================
   Wheel Game - 輪盤抽獎邏輯
   使用 Canvas 繪製輪盤（文字定位更精確）
   ======================================== */

(function() {
  'use strict';

  // ========== 常數定義 ==========
  const STORAGE_KEY = 'LUCKY_WHEEL_V1';
  const LOGS_KEY = 'LUCKY_WHEEL_V1_LOGS';
  const VERSION = 'LUCKY_WHEEL_V1';

  // 預設資料
  const DEFAULT_DATA = {
    version: VERSION,
    mode: 'person',
    allowDuplicate: false,
    pool: [
      '王小明', '李小華', '張大偉', '陳美麗', '林志明',
      '黃小芳', '劉建國', '吳美玲', '周大同', '鄭小雯'
    ],
    drawn: [],
    lastDrawn: null
  };

  // 輪盤顏色
  const WHEEL_COLORS = [
    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
    '#f97316', '#6366f1', '#84cc16', '#a855f7'
  ];

  // ========== 狀態管理 ==========
  let state = null;
  let isSpinning = false;
  let currentAngle = 0;
  let canvas, ctx;
  let dpr = 1; // device pixel ratio

  // ========== DOM 元素 ==========
  const $ = LuckyUtils.$;
  const elements = {};

  function initElements() {
    canvas = $('#wheelCanvas');
    ctx = canvas.getContext('2d');

    // 處理高 DPI 螢幕，讓文字清晰
    setupHighDPI();

    elements.spinBtn = $('#spinBtn');
    elements.undoBtn = $('#undoBtn');
    elements.modeToggle = $('#modeToggle');
    elements.modeLabel = $('#modeLabel');
    elements.allowDuplicate = $('#allowDuplicate');
    elements.listInput = $('#listInput');
    elements.listTitle = $('#listTitle');
    elements.applyListBtn = $('#applyListBtn');
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

  // ========== 高 DPI 處理 ==========
  function setupHighDPI() {
    dpr = window.devicePixelRatio || 1;
    const displayWidth = 320;
    const displayHeight = 320;

    // 設定 canvas 實際像素大小（乘以 dpr）
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    // 設定 CSS 顯示大小
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    // 縮放繪圖上下文
    ctx.scale(dpr, dpr);
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
    drawWheel();
    updateDrawnList();
    updateLogs();
    updateUndoButton();
    elements.listInput.value = state.pool.join('\n');
    elements.allowDuplicate.checked = state.allowDuplicate;
  }

  function updateModeUI() {
    const isPerson = state.mode === 'person';
    elements.modeLabel.textContent = isPerson ? '抽人' : '抽獎品';
    elements.modeToggle.classList.toggle('active', !isPerson);
    elements.listTitle.textContent = isPerson ? '名單編輯（每行一個）' : '獎品編輯（每行一個）';
  }

  function updateStats() {
    const total = state.pool.length + state.drawn.length;
    elements.totalCount.textContent = total;
    elements.remainCount.textContent = state.pool.length;
    elements.drawnCount.textContent = state.drawn.length;
    elements.spinBtn.disabled = state.pool.length === 0 || isSpinning;
  }

  function updateUndoButton() {
    elements.undoBtn.disabled = !state.lastDrawn || isSpinning;
  }

  function updateDrawnList() {
    if (state.drawn.length === 0) {
      elements.drawnList.innerHTML = '<p class="text-center" style="color: var(--text-tertiary);">尚無已抽項目</p>';
    } else {
      elements.drawnList.innerHTML = state.drawn
        .map(item => `<span class="drawn-item">${escapeHtml(item)}</span>`)
        .join('');
    }
  }

  function updateLogs() {
    const logs = LuckyUtils.getLogs(LOGS_KEY, 10);
    elements.logsCount.textContent = `${LuckyUtils.getLogs(LOGS_KEY).length} 筆`;

    if (logs.length === 0) {
      elements.logsList.innerHTML = '<p class="text-center" style="color: var(--text-tertiary); padding: var(--space-md);">尚無紀錄</p>';
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

  // ========== Canvas 輪盤繪製 ==========
  function drawWheel() {
    const items = state.pool;
    // 使用 CSS 顯示尺寸（不是 canvas.width，因為那是乘過 dpr 的）
    const displaySize = 320;
    const centerX = displaySize / 2;
    const centerY = displaySize / 2;
    const radius = centerX - 10;

    // 清除畫布（需要用實際像素尺寸）
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (items.length === 0) {
      // 空輪盤
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#f3f4f6';
      ctx.fill();
      ctx.fillStyle = '#9ca3af';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('沒有項目可抽', centerX, centerY);
      return;
    }

    const segmentAngle = (Math.PI * 2) / items.length;

    // 繪製每個扇形和文字
    items.forEach((item, index) => {
      const startAngle = currentAngle + index * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;
      const color = WHEEL_COLORS[index % WHEEL_COLORS.length];

      // 繪製扇形
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // 繪製邊線
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 繪製文字
      ctx.save();
      ctx.translate(centerX, centerY);
      // 文字角度：扇形中央
      const textAngle = startAngle + segmentAngle / 2;
      ctx.rotate(textAngle);

      // 文字設定
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 文字位置：從圓心往外 60% 處
      const textRadius = radius * 0.65;

      // 截斷過長文字
      let displayText = item;
      if (displayText.length > 5) {
        displayText = displayText.substring(0, 4) + '…';
      }

      // 文字陰影增加可讀性
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillText(displayText, textRadius, 0);
      ctx.restore();
    });

    // 繪製中心圓
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 中心文字
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'transparent';
    ctx.fillText('GO', centerX, centerY);

    // 繪製外框
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 9, 0, Math.PI * 2);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // ========== 抽獎動畫 ==========
  function spin() {
    if (isSpinning || state.pool.length === 0) return;

    isSpinning = true;
    elements.spinBtn.disabled = true;
    elements.undoBtn.disabled = true;
    elements.resultText.textContent = '抽獎中...';

    // 決定結果
    const resultIndex = Math.floor(Math.random() * state.pool.length);
    const result = state.pool[resultIndex];

    // 計算目標角度
    const segmentAngle = (Math.PI * 2) / state.pool.length;
    // 指針在頂部（-90度位置），要讓第 resultIndex 個扇形對準指針
    // 扇形中央對準頂部的角度
    const targetSegmentAngle = resultIndex * segmentAngle + segmentAngle / 2;
    // 輪盤需要轉到的角度（讓該扇形在頂部）
    const targetAngle = -targetSegmentAngle;

    // 轉 5 圈 + 目標角度
    const spins = 5;
    const totalRotation = spins * Math.PI * 2 + (targetAngle - (currentAngle % (Math.PI * 2)));

    // 確保是正向旋轉
    const finalAngle = currentAngle + totalRotation + (totalRotation < 0 ? Math.PI * 2 : 0);

    // 動畫參數
    const startAngle = currentAngle;
    const duration = 4000;
    const startTime = performance.now();

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 緩出效果 (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      currentAngle = startAngle + (finalAngle - startAngle) * easeOut;
      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        finishSpin(result, resultIndex);
      }
    }

    requestAnimationFrame(animate);
  }

  function finishSpin(result, index) {
    isSpinning = false;

    state.lastDrawn = { item: result, index: index };

    elements.resultText.textContent = result;
    elements.resultDisplay.style.animation = 'none';
    elements.resultDisplay.offsetHeight;
    elements.resultDisplay.style.animation = 'pulse 0.5s ease';

    if (!state.allowDuplicate) {
      state.pool.splice(index, 1);
      state.drawn.push(result);
    }

    const modeText = state.mode === 'person' ? '抽人' : '抽獎';
    LuckyUtils.addLog(LOGS_KEY, modeText, result);

    saveState();
    updateUI();
    LuckyUtils.showToast(`抽中：${result}`, 'success');
  }

  function undo() {
    if (!state.lastDrawn) return;

    const { item, index } = state.lastDrawn;
    const drawnIndex = state.drawn.indexOf(item);
    if (drawnIndex !== -1) {
      state.drawn.splice(drawnIndex, 1);
    }
    state.pool.splice(index, 0, item);

    LuckyUtils.addLog(LOGS_KEY, '復原', item);

    state.lastDrawn = null;
    saveState();
    updateUI();

    elements.resultText.textContent = '已復原';
    LuckyUtils.showToast('已復原上一次抽獎', 'info');
  }

  // ========== 名單管理 ==========
  function applyList() {
    const text = elements.listInput.value;
    const items = LuckyUtils.parseLines(text, true);

    if (items.length === 0) {
      LuckyUtils.showToast('請輸入至少一個項目', 'warning');
      return;
    }

    state.pool = items;
    state.drawn = [];
    state.lastDrawn = null;
    currentAngle = 0;
    saveState();
    updateUI();

    LuckyUtils.showToast(`已套用 ${items.length} 個項目`, 'success');
  }

  function clearDrawn() {
    if (state.drawn.length === 0) return;

    state.pool = [...state.pool, ...state.drawn];
    state.drawn = [];
    state.lastDrawn = null;

    LuckyUtils.addLog(LOGS_KEY, '清除已抽', `${state.pool.length} 項回池`);

    saveState();
    updateUI();
    LuckyUtils.showToast('已清除，所有項目回到池中', 'success');
  }

  // ========== 模式切換 ==========
  function toggleMode() {
    state.mode = state.mode === 'person' ? 'prize' : 'person';
    saveState();
    updateModeUI();
  }

  function toggleDuplicate() {
    state.allowDuplicate = elements.allowDuplicate.checked;
    saveState();
  }

  // ========== 資料匯出入 ==========
  function exportData() {
    const data = {
      ...state,
      exportedAt: LuckyUtils.now(),
      logs: LuckyUtils.getLogs(LOGS_KEY)
    };
    const filename = `wheel_${new Date().toISOString().split('T')[0]}.json`;
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

    const validation = LuckyUtils.validateImportData(data, VERSION, ['pool']);
    if (!validation.valid) {
      LuckyUtils.showToast(validation.error, 'error');
      return;
    }

    state = { ...DEFAULT_DATA, ...data, version: VERSION };

    if (Array.isArray(data.logs)) {
      LuckyUtils.setData(LOGS_KEY, data.logs);
    }

    currentAngle = 0;
    saveState();
    updateUI();
    closeImportModal();
    LuckyUtils.showToast('匯入成功', 'success');
  }

  function resetGame() {
    if (!confirm('確定要重置遊戲嗎？所有資料將被清除！')) return;

    state = { ...DEFAULT_DATA };
    LuckyUtils.setData(LOGS_KEY, []);
    currentAngle = 0;
    saveState();
    updateUI();

    elements.resultText.textContent = '點擊開始抽獎';
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
    elements.undoBtn.addEventListener('click', undo);
    elements.modeToggle.addEventListener('click', toggleMode);
    elements.allowDuplicate.addEventListener('change', toggleDuplicate);
    elements.applyListBtn.addEventListener('click', applyList);
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

    // 點擊輪盤也可以開始抽獎
    canvas.addEventListener('click', spin);
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
