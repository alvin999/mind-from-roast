import { state } from './state.js';
import { elements } from './dom.js';
import { t } from './i18n.js';
import { updateDisplay } from './ui.js';

export function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

export function initStats() {
    // 確保今天日期已更新至全域 state 中
    state.todayStr = getTodayStr();
    
    const createFreshToday = () => ({ pomos: 0, minutes: 0, wisdom: 0, logs: [], date: state.todayStr });
    const createFreshStats = () => ({ today: createFreshToday(), history: [] });

    let data;
    try {
        const raw = localStorage.getItem('muda_stats');
        data = raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn('Stats 資料損毀，重新初始化。', e);
        data = null;
    }

    if (!data?.today) return createFreshStats();

    if (data.today.date !== state.todayStr) {
        if (data.today.pomos > 0 || data.today.minutes > 0) {
            data.history = data.history || [];
            data.history.unshift({
                date: data.today.date,
                pomos: data.today.pomos,
                minutes: data.today.minutes,
                wisdom: data.today.wisdom
            });
            if (data.history.length > 30) data.history.pop();
        }
        data.today = createFreshToday();
        localStorage.setItem('muda_stats', JSON.stringify(data));
    }

    return data;
}

export function saveStats() {
    localStorage.setItem('muda_stats', JSON.stringify(state.stats));
    renderStats();
}

export function renderStats() {
    if (elements.statPomos) elements.statPomos.textContent = state.stats.today.pomos;
    if (elements.statMinutes) elements.statMinutes.textContent = state.stats.today.minutes;
    if (elements.statWisdom) elements.statWisdom.textContent = state.stats.today.wisdom;
    
    if (elements.logList) {
        elements.logList.innerHTML = state.stats.today.logs.slice().reverse().map(log => `
            <div class="log-item">
                <small class="log-time">${log.time}</small>
                <div class="log-msg">${log.msg}</div>
            </div>
        `).join('');
    }
}

export function addLog(msg) {
    // 基礎防護：如果與最後一條紀錄完全相同，則不重複新增（防止重複點擊 UI）
    const lastLog = state.stats.today.logs[state.stats.today.logs.length - 1];
    if (lastLog && lastLog.msg === msg) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    state.stats.today.logs.push({ time: timeStr, msg: msg });
    if (state.stats.today.logs.length > 50) state.stats.today.logs.shift();
    saveStats();
}

export function checkDailyReset() {
    const currentTodayStr = getTodayStr();
    
    if (state.stats.today.date !== currentTodayStr) {
        if (state.stats.today.pomos > 0 || state.stats.today.minutes > 0) {
            state.stats.history.unshift({
                date: state.stats.today.date,
                pomos: state.stats.today.pomos,
                minutes: state.stats.today.minutes,
                wisdom: state.stats.today.wisdom
            });
            if (state.stats.history.length > 30) state.stats.history.pop();
        }
        
        state.stats.today = {
            pomos: 0,
            minutes: 0,
            wisdom: 0,
            logs: [],
            date: currentTodayStr
        };
        state.todayStr = currentTodayStr; // 更新狀態的今天字串
        saveStats();
        renderStats();
        updateDisplay();
        return true;
    }
    return false;
}

export function renderHistory() {
    if (!elements.historyContainer) return;
    
    if (!state.stats.history || state.stats.history.length === 0) {
        elements.historyContainer.innerHTML = `<div class="no-history-msg">${t('no_history')}</div>`;
        return;
    }
    
    elements.historyContainer.innerHTML = state.stats.history.map(item => `
        <div class="history-item">
            <span class="history-item-date">${item.date}</span>
            <div class="history-item-stats">
                <div class="history-stat">
                    <span class="history-stat-value">${item.pomos}</span>
                    <span class="history-stat-label">${t('pomodoros')}</span>
                </div>
                <div class="history-stat">
                    <span class="history-stat-value">${item.minutes}</span>
                    <span class="history-stat-label">${t('minutes')}</span>
                </div>
                <div class="history-stat">
                    <span class="history-stat-value">${item.wisdom}</span>
                    <span class="history-stat-label">${t('wisdom')}</span>
                </div>
            </div>
        </div>
    `).join('');
}
