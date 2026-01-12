/* ========================================
   Utils.js - 共用工具函式
   localStorage 封裝與通用功能
   ======================================== */

const LuckyUtils = (function() {
  'use strict';

  // ========== localStorage 操作 ==========

  /**
   * 取得 localStorage 資料
   * @param {string} key - 儲存鍵名
   * @param {*} defaultValue - 預設值
   * @returns {*} 解析後的資料或預設值
   */
  function getData(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      if (data === null) return defaultValue;
      return JSON.parse(data);
    } catch (e) {
      console.warn(`[LuckyUtils] getData error for key "${key}":`, e.message);
      return defaultValue;
    }
  }

  /**
   * 儲存資料到 localStorage
   * @param {string} key - 儲存鍵名
   * @param {*} value - 要儲存的資料
   * @returns {boolean} 是否成功
   */
  function setData(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`[LuckyUtils] setData error for key "${key}":`, e.message);
      return false;
    }
  }

  /**
   * 移除 localStorage 資料
   * @param {string} key - 儲存鍵名
   */
  function removeData(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[LuckyUtils] removeData error for key "${key}":`, e.message);
    }
  }

  /**
   * 清除特定前綴的所有 localStorage 資料
   * @param {string} prefix - 前綴字串
   */
  function clearByPrefix(prefix) {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.warn(`[LuckyUtils] clearByPrefix error:`, e.message);
    }
  }

  // ========== 資料匯出入 ==========

  /**
   * 匯出資料為 JSON 檔案下載
   * @param {*} data - 要匯出的資料
   * @param {string} filename - 檔案名稱
   */
  function exportJSON(data, filename) {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.warn(`[LuckyUtils] exportJSON error:`, e.message);
      return false;
    }
  }

  /**
   * 從檔案讀取 JSON
   * @param {File} file - 檔案物件
   * @returns {Promise<*>} 解析後的資料
   */
  function importJSONFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          resolve(data);
        } catch (err) {
          reject(new Error('JSON 格式錯誤'));
        }
      };
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsText(file);
    });
  }

  /**
   * 從字串解析 JSON
   * @param {string} jsonStr - JSON 字串
   * @returns {*} 解析後的資料或 null
   */
  function parseJSON(jsonStr) {
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      return null;
    }
  }

  // ========== 資料驗證 ==========

  /**
   * 驗證匯入資料的版本與必要欄位
   * @param {*} data - 要驗證的資料
   * @param {string} expectedVersion - 預期版本
   * @param {string[]} requiredFields - 必要欄位陣列
   * @returns {{valid: boolean, error: string|null}}
   */
  function validateImportData(data, expectedVersion, requiredFields) {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: '資料格式無效' };
    }

    if (data.version !== expectedVersion) {
      return { valid: false, error: `版本不符，預期 ${expectedVersion}，實際 ${data.version || '無版本'}` };
    }

    for (const field of requiredFields) {
      if (!(field in data)) {
        return { valid: false, error: `缺少必要欄位: ${field}` };
      }
    }

    return { valid: true, error: null };
  }

  // ========== 字串處理 ==========

  /**
   * 處理多行輸入，過濾空白與重複
   * @param {string} text - 多行文字
   * @param {boolean} unique - 是否去重，預設 true
   * @returns {string[]} 處理後的陣列
   */
  function parseLines(text, unique = true) {
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (unique) {
      return [...new Set(lines)];
    }
    return lines;
  }

  /**
   * 過濾黑名單
   * @param {string[]} list - 原始名單
   * @param {string[]} blacklist - 黑名單
   * @returns {string[]} 過濾後的名單
   */
  function filterBlacklist(list, blacklist) {
    const blackSet = new Set(blacklist.map(item => item.toLowerCase()));
    return list.filter(item => !blackSet.has(item.toLowerCase()));
  }

  // ========== 隨機函式 ==========

  /**
   * 從陣列中隨機選取一個元素
   * @param {Array} array - 來源陣列
   * @returns {*} 隨機選取的元素
   */
  function randomPick(array) {
    if (!array || array.length === 0) return null;
    const index = Math.floor(Math.random() * array.length);
    return array[index];
  }

  /**
   * 根據權重隨機選取
   * @param {Array<{item: *, weight: number}>} weightedItems - 帶權重的項目陣列
   * @returns {*} 隨機選取的項目
   */
  function weightedRandomPick(weightedItems) {
    if (!weightedItems || weightedItems.length === 0) return null;

    const totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight <= 0) return null;

    let random = Math.random() * totalWeight;
    for (const item of weightedItems) {
      random -= item.weight;
      if (random <= 0) {
        return item.item;
      }
    }
    return weightedItems[weightedItems.length - 1].item;
  }

  /**
   * 洗牌演算法 (Fisher-Yates)
   * @param {Array} array - 要洗牌的陣列
   * @returns {Array} 洗牌後的新陣列
   */
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ========== Toast 通知 ==========

  /**
   * 顯示 Toast 通知
   * @param {string} message - 訊息內容
   * @param {string} type - 類型 (success|error|info|warning)
   * @param {number} duration - 顯示時間(ms)，預設 3000
   */
  function showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  // ========== 時間格式化 ==========

  /**
   * 格式化時間戳記
   * @param {number|Date} timestamp - 時間戳記或 Date 物件
   * @returns {string} 格式化的時間字串
   */
  function formatTime(timestamp) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  /**
   * 取得當前時間戳記
   * @returns {number}
   */
  function now() {
    return Date.now();
  }

  // ========== Logs 操作 ==========

  /**
   * 新增操作紀錄
   * @param {string} key - localStorage key
   * @param {string} action - 操作類型
   * @param {string} result - 操作結果
   * @param {number} maxLogs - 最大紀錄數，預設 100
   */
  function addLog(key, action, result, maxLogs = 100) {
    const logs = getData(key, []);
    logs.unshift({
      timestamp: now(),
      action,
      result
    });
    // 限制最大紀錄數
    if (logs.length > maxLogs) {
      logs.length = maxLogs;
    }
    setData(key, logs);
  }

  /**
   * 取得操作紀錄
   * @param {string} key - localStorage key
   * @param {number} limit - 取得數量，0 表示全部
   * @returns {Array} 紀錄陣列
   */
  function getLogs(key, limit = 0) {
    const logs = getData(key, []);
    if (limit > 0) {
      return logs.slice(0, limit);
    }
    return logs;
  }

  // ========== DOM 工具 ==========

  /**
   * 簡化的元素選取器
   * @param {string} selector - CSS 選取器
   * @param {Element} parent - 父元素，預設 document
   * @returns {Element|null}
   */
  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }

  /**
   * 選取所有符合的元素
   * @param {string} selector - CSS 選取器
   * @param {Element} parent - 父元素，預設 document
   * @returns {NodeList}
   */
  function $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
  }

  /**
   * 建立元素
   * @param {string} tag - 標籤名稱
   * @param {Object} attrs - 屬性物件
   * @param {string|Element|Element[]} children - 子元素
   * @returns {Element}
   */
  function createElement(tag, attrs = {}, children = null) {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    }

    if (children) {
      if (typeof children === 'string') {
        el.textContent = children;
      } else if (Array.isArray(children)) {
        children.forEach(child => {
          if (child) el.appendChild(child);
        });
      } else {
        el.appendChild(children);
      }
    }

    return el;
  }

  // ========== 公開 API ==========

  return {
    // localStorage
    getData,
    setData,
    removeData,
    clearByPrefix,

    // 匯出入
    exportJSON,
    importJSONFromFile,
    parseJSON,
    validateImportData,

    // 字串處理
    parseLines,
    filterBlacklist,

    // 隨機
    randomPick,
    weightedRandomPick,
    shuffle,

    // Toast
    showToast,

    // 時間
    formatTime,
    now,

    // Logs
    addLog,
    getLogs,

    // DOM
    $,
    $$,
    createElement
  };
})();

// 確保全域可用
if (typeof window !== 'undefined') {
  window.LuckyUtils = LuckyUtils;
}
