/**
 * Mind From Roast | 脈環漏 - 核心邏輯 (v4.0 ES Modules)
 * 包含：Gemini AI 每日格言、多語系、模式管理、進度環、智慧問答
 */

import { state } from './modules/state.js';
import { elements } from './modules/dom.js';
import { loadDailyQuotes, detectLanguage, changeLanguageState, t } from './modules/i18n.js';
import { initStats, checkDailyReset, renderStats, addLog } from './modules/stats.js';
import { updateNotiUI } from './modules/notifications.js';
import { restoreTheme } from './modules/theme.js';
import { initUIOptions, updateUI } from './modules/ui.js';
import { initWorker, setMode } from './modules/timer.js';
import { initEvents } from './modules/events.js';

function restoreAmbientState() {
    const savedState = JSON.parse(localStorage.getItem('muda_ambient_state') || '{}');
    const savedVol = JSON.parse(localStorage.getItem('muda_ambient_volume') || '{}');
    
    elements.ambientBtns.forEach(btn => {
        const type = btn.dataset.type;
        if (savedState[type]) {
            btn.classList.add('active');
        }
    });

    elements.ambientSliders.forEach(slider => {
        const type = slider.dataset.type;
        if (savedVol[type] !== undefined) {
            slider.value = savedVol[type];
        }
    });
}

(async function init() {
    // 預先取得本機端 stats 進 state 中，並處理每日重做邏輯
    state.stats = initStats(); 
    checkDailyReset(); 
    
    // 初始化多語系與 AI 語錄
    await loadDailyQuotes();
    const activeLang = detectLanguage();
    changeLanguageState(activeLang);
    elements.langBtns.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.lang === activeLang);
    });

    // 恢復外觀狀態設定
    restoreTheme();
    restoreAmbientState();
    initUIOptions();

    // 綁定所有事件
    initEvents();

    // 初始化模式並套用上次的設定
    setMode('FOCUS');

    initWorker();
    updateNotiUI();
    
    renderStats();
    updateUI();

    if (state.stats.today.logs.length === 0) addLog(t('log_start'));

    // 每分鐘檢查一次日期，防止用戶開著網頁過夜沒重設
    setInterval(() => {
        if (checkDailyReset()) {
            console.log("Date changed, stats reset.");
        }
    }, 60000);
})();
