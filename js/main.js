/**
 * Mind From Roast | 脈環漏 - 核心邏輯 (v3.2)
 * 包含：Gemini AI 每日格言、多語系、模式管理、進度環、智慧問答
 */

// --- 狀態變數 ---
let currentLang = 'en';
let dailyAIQuotes = { zh: [], en: [], ja: [] };
let rafId = null; // 處理 requestAnimationFrame 的 ID

// --- 多語系與 AI 格言載入 ---
async function loadDailyQuotes() {
    try {
        const response = await fetch('data/daily_quotes.json');
        if (response.ok) {
            dailyAIQuotes = await response.json();
        }
    } catch (e) {
        console.log("Daily quotes not found, using fallbacks.");
    }
}

function detectLanguage() {
    const savedLang = localStorage.getItem('muda_lang');
    if (savedLang && TRANSLATIONS[savedLang]) return savedLang;

    const navLang = navigator.language.toLowerCase();
    if (navLang.startsWith('zh')) return 'zh';
    if (navLang.startsWith('ja')) return 'ja';
    return 'en';
}

function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    localStorage.setItem('muda_lang', lang);
    
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.lang === lang);
    });

    updateUI();
    
    if (rafId === null) {
        updateQuoteDisplay();
    }
}

function t(key, params = {}) {
    if (!TRANSLATIONS[currentLang]) currentLang = 'en';
    const translation = TRANSLATIONS[currentLang][key];
    if (!translation) return key;
    
    if (typeof translation === 'string') {
        let text = translation;
        for (const [pKey, pVal] of Object.entries(params)) {
            text = text.replace(`{${pKey}}`, pVal);
        }
        return text;
    }
    return translation;
}

function updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    document.querySelectorAll('.theme-dot').forEach(dot => {
        const theme = dot.dataset.theme;
        if (TRANSLATIONS[currentLang].themes[theme]) {
            dot.title = TRANSLATIONS[currentLang].themes[theme];
        }
    });

    updateDisplay();
}

function updateQuoteDisplay() {
    const aiQuotes = dailyAIQuotes[currentLang] || [];
    const staticQuotes = t('quotes');
    const combinedQuotes = aiQuotes.length > 0 ? aiQuotes : staticQuotes;
    const newQuote = combinedQuotes[Math.floor(Math.random() * combinedQuotes.length)];
    
    elements.quoteText.classList.add('fade-out');
    
    // 等待淡出才更新內容與縮放面板
    setTimeout(() => {
        animatePanelResize(elements.mainPanel, () => {
            elements.quoteText.textContent = newQuote;
        });
        
        // 更新完後淡入
        setTimeout(() => {
            elements.quoteText.classList.remove('fade-out');
        }, 50);
    }, 300);
}

// --- 計時器核心 logic ---
const getModeConfig = () => ({
    FOCUS: { id: 'work-mode', textKey: 'focus_time', default: 25, options: [25, 45, 60] },
    SHORT_BREAK: { id: 'short-break-mode', textKey: 'short_break', default: 5, options: [5, 10, 15] },
    LONG_BREAK: { id: 'long-break-mode', textKey: 'long_break', default: 15, options: [15, 20, 30] }
});

let timeLeft = 25 * 60;
let totalTime = 25 * 60;
let timerWorker = null;
let currentMode = 'FOCUS';
let completedPomos = 0;
let isNotificationEnabled = localStorage.getItem('muda_notifications') === 'true';

let stats = JSON.parse(localStorage.getItem('muda_stats')) || {
    pomos: 0,
    minutes: 0,
    wisdom: 0,
    logs: []
};

const elements = {
    minutes: document.getElementById('minutes'),
    seconds: document.getElementById('seconds'),
    startBtn: document.getElementById('start-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    resetBtn: document.getElementById('reset-btn'),
    statusText: document.getElementById('status-text'),
    progressIndicator: document.getElementById('progress-indicator'),
    bgVideo: document.getElementById('bg-video'),
    quoteText: document.getElementById('quote'),
    bellSound: document.getElementById('bell-sound'),
    durationBtns: document.querySelectorAll('.duration-btn'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    themeDots: document.querySelectorAll('.theme-dot'),
    themeToggle: document.getElementById('theme-toggle'),
    themeOptions: document.getElementById('theme-options'),
    langToggle: document.getElementById('lang-toggle'),
    langOptions: document.getElementById('lang-options'),
    langBtns: document.querySelectorAll('.lang-option'),
    statPomos: document.getElementById('stat-pomos'),
    statMinutes: document.getElementById('stat-minutes'),
    statWisdom: document.getElementById('stat-wisdom'),
    logList: document.getElementById('log-container'),
    modal: document.getElementById('wisdom-modal'),
    solveYes: document.getElementById('solve-yes'),
    solveNo: document.getElementById('solve-no'),
    wisdomResult: document.getElementById('wisdom-result'),
    wisdomMsg: document.getElementById('wisdom-message'),
    closeModal: document.getElementById('close-modal'),
    customModal: document.getElementById('custom-time-modal'),
    customInput: document.getElementById('custom-minutes-input'),
    decreaseTime: document.getElementById('decrease-time'),
    increaseTime: document.getElementById('increase-time'),
    saveCustomTime: document.getElementById('save-custom-time'),
    cancelCustomTime: document.getElementById('cancel-custom-time'),
    notiToggle: document.getElementById('noti-toggle'),
    mainPanel: document.querySelector('.container > .glass-panel')
};

// --- 面板尺寸平滑縮放工具 (更強健的 JS + CSS 混合方案) ---
function animatePanelResize(panel, contentUpdateFn) {
    if (!panel) return contentUpdateFn();

    // 1. 紀錄開始時的固定尺寸
    const startWidth = panel.offsetWidth;
    const startHeight = panel.offsetHeight;
    
    // 預先固定，防止內容更新時瞬間跳動
    panel.style.width = startWidth + 'px';
    panel.style.height = startHeight + 'px';
    panel.style.overflow = 'hidden';
    panel.style.transition = 'none';

    // 2. 執行內容更新
    contentUpdateFn();

    // 3. 測量新尺寸 (使用雙重 Frame 確保佈局已更新)
    requestAnimationFrame(() => {
        panel.style.width = 'auto';
        panel.style.height = 'auto';
        
        const endWidth = panel.offsetWidth;
        const endHeight = panel.offsetHeight;

        // 【深層優化】鎖定內部容器寬度
        // 為了解決放大時文字因父容器還在縮小的狀態而「瞬間換行」的問題
        // 我們將內部的標題與內容區塊全部顯式鎖定在目標寬度 (扣除 padding 的內容區域)
        const header = panel.querySelector('header');
        if (header) {
            header.style.width = (endWidth - 80) + 'px'; // 40px padding * 2
            header.style.flexShrink = '0';
        }

        // 回到原始點，準備開始動畫
        panel.style.width = startWidth + 'px';
        panel.style.height = startHeight + 'px';

        // 強制重繪
        void panel.offsetWidth; 
        
        // 4. 套用過渡與目標尺寸
        panel.style.transition = 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        
        panel.style.width = endWidth + 'px';
        panel.style.height = endHeight + 'px';
        
        // 5. 結束後清除行內樣式，恢復 CSS 定義
        setTimeout(() => {
            panel.style.width = '';
            panel.style.height = '';
            panel.style.overflow = '';
            panel.style.transition = '';
            if (header) {
                header.style.width = '';
                header.style.flexShrink = '';
            }
        }, 650);
    });
}

// --- Web Worker 初始化 ---
function initWorker() {
    if (window.Worker) {
        timerWorker = new Worker('js/timer_worker.js');
        timerWorker.onmessage = function(e) {
            const { type, timeLeft: workerTimeLeft } = e.data;
            if (type === 'tick') {
                timeLeft = workerTimeLeft;
                updateDisplay();
            } else if (type === 'finish') {
                timeLeft = 0;
                updateDisplay();
                handleFinish();
            }
        };
    } else {
        console.error("Web Workers are not supported in this browser.");
    }
}

// --- 進度環 ---
const CIRCLE_RADIUS = 140;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
if (elements.progressIndicator) {
    elements.progressIndicator.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
    elements.progressIndicator.style.strokeDashoffset = 0;
}

function setProgress(percent) {
    if (!elements.progressIndicator) return;
    const offset = CIRCLE_CIRCUMFERENCE - (percent / 100) * CIRCLE_CIRCUMFERENCE;
    elements.progressIndicator.style.strokeDashoffset = offset;
}

function updateDisplay() {
    const min = Math.floor(timeLeft / 60);
    const sec = timeLeft % 60;
    elements.minutes.textContent = min.toString().padStart(2, '0');
    elements.seconds.textContent = sec.toString().padStart(2, '0');
    const percent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
    setProgress(percent);
    document.title = `${elements.minutes.textContent}:${elements.seconds.textContent} - ${t('title')}`;
}

// --- 通知功能 ---
async function requestNotificationPermission() {
    if (!("Notification" in window)) return false;
    
    if (Notification.permission === "granted") {
        isNotificationEnabled = !isNotificationEnabled;
    } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        isNotificationEnabled = (permission === "granted");
    } else {
        alert(t('notify_permission_denied'));
        isNotificationEnabled = false;
    }
    
    localStorage.setItem('muda_notifications', isNotificationEnabled);
    updateNotiUI();
    return isNotificationEnabled;
}

function updateNotiUI() {
    if (!elements.notiToggle) return;
    elements.notiToggle.classList.toggle('active', isNotificationEnabled);
}

function sendNotification(title, body) {
    if (isNotificationEnabled && Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: 'assets/images/logo.png'
        });
    }
}

// --- 紀錄 ---
function saveStats() {
    localStorage.setItem('muda_stats', JSON.stringify(stats));
    renderStats();
}

function renderStats() {
    if (elements.statPomos) elements.statPomos.textContent = stats.pomos;
    if (elements.statMinutes) elements.statMinutes.textContent = stats.minutes;
    if (elements.statWisdom) elements.statWisdom.textContent = stats.wisdom;
    
    if (elements.logList) {
        elements.logList.innerHTML = stats.logs.slice().reverse().map(log => `
            <div class="log-item">
                <small class="log-time">${log.time}</small>
                <div class="log-msg">${log.msg}</div>
            </div>
        `).join('');
    }
}

function addLog(msg) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    stats.logs.push({ time: timeStr, msg: msg });
    if (stats.logs.length > 50) stats.logs.shift();
    saveStats();
}

// --- 計時器控制器 ---
function startTimer() {
    if (!timerWorker) initWorker();
    
    elements.startBtn.disabled = true;
    elements.pauseBtn.disabled = false;
    if (elements.bgVideo) elements.bgVideo.style.filter = "brightness(0.6) blur(0px)";
    document.querySelector('.timer-display').classList.add('running');
    
    timerWorker.postMessage({ action: 'start', value: timeLeft });
}

function pauseTimer() {
    if (timerWorker) {
        timerWorker.postMessage({ action: 'pause' });
    }
    elements.startBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    if (elements.bgVideo) elements.bgVideo.style.filter = "brightness(0.7) blur(2px)";
    document.querySelector('.timer-display').classList.remove('running');
}

function resetTimer() {
    pauseTimer();
    
    // 獲取該模式的系統初始預設值
    const modeCfg = getModeConfig()[currentMode];
    
    // 清除該模式的自訂記憶 (讓使用者點擊重設時能徹底恢復初始狀態)
    localStorage.removeItem(`muda_${currentMode.toLowerCase()}_duration`);
    
    // 重新呼叫 setMode（不帶自訂分鐘數）以套用預設值並更新 UI 按鈕狀態
    setMode(currentMode);
    
    // 確保通知日誌有記錄
    addLog(t('log_reset_mode', { mode: t(modeCfg.textKey) }));
}

function setMode(modeKey, customMinutes = null) {
    currentMode = modeKey;
    const modeCfg = getModeConfig()[modeKey];
    
    // 如果有提供分鐘數，則儲存為該模式的專屬時間
    if (customMinutes) {
        localStorage.setItem(`muda_${modeKey.toLowerCase()}_duration`, customMinutes);
        // 如果是自訂按鈕設定的，也同步更新 customInput 的顯示
        if (elements.customInput) elements.customInput.value = customMinutes;
    }
    
    // 優先讀取該模式的儲存時間，否則用預設值
    const savedDuration = localStorage.getItem(`muda_${modeKey.toLowerCase()}_duration`);
    const duration = savedDuration ? parseInt(savedDuration) : modeCfg.default;
    
    totalTime = duration * 60;
    timeLeft = totalTime;
    
    elements.statusText.classList.add('fade-out');
    
    setTimeout(() => {
        animatePanelResize(elements.mainPanel, () => {
            elements.statusText.textContent = t(modeCfg.textKey);
        });
        
        setTimeout(() => {
            elements.statusText.classList.remove('fade-out');
        }, 50);
    }, 300);

    elements.modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.id === modeCfg.id);
    });

    // 更新快速選擇按鈕的文字與數值
    const quickBtns = Array.from(elements.durationBtns).filter(btn => btn.id !== 'custom-time-btn');
    quickBtns.forEach((btn, index) => {
        if (modeCfg.options[index]) {
            btn.dataset.time = modeCfg.options[index];
            btn.textContent = modeCfg.options[index];
            btn.style.display = 'inline-block';
        } else {
            btn.style.display = 'none';
        }
    });

    // 更新 Active 狀態
    elements.durationBtns.forEach(btn => {
        const isMatch = btn.dataset.time == duration;
        btn.classList.toggle('active', isMatch);
        if (btn.id === 'custom-time-btn') {
            const isDefaultOption = modeCfg.options.includes(duration);
            btn.classList.toggle('active', !isDefaultOption);
        }
    });

    updateQuoteDisplay();
    updateDisplay();
    pauseTimer();
}

function handleFinish() {
    if (elements.bellSound) elements.bellSound.play();
    
    const notifyTitle = t('notify_finish_title');
    
    if (currentMode === 'FOCUS') {
        completedPomos++;
        stats.pomos++;
        stats.minutes += Math.floor(totalTime / 60);
        addLog(t('log_finish_focus', { min: Math.floor(totalTime / 60) }));
        sendNotification(notifyTitle, t('notify_finish_focus'));
        showWisdomModal();
    } else {
        const modeLabel = currentMode === 'SHORT_BREAK' ? t('short_break') : t('long_break');
        addLog(t('log_finish_break', { mode: modeLabel }));
        sendNotification(notifyTitle, t('notify_finish_break'));
        if (completedPomos % 4 === 0 && completedPomos > 0) {
            setMode('LONG_BREAK');
        } else {
            setMode('FOCUS');
        }
    }
}

// --- 智慧問答 Modal ---
function showWisdomModal() {
    if (!elements.modal) return;
    elements.modal.classList.remove('hidden');
    if (elements.wisdomResult) elements.wisdomResult.classList.add('hidden');
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) modalBody.classList.remove('hidden');
}

function handleWisdomAnswer(answer) {
    stats.wisdom++;
    saveStats();
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) modalBody.classList.add('hidden');
    if (elements.wisdomResult) elements.wisdomResult.classList.remove('hidden');
    
    // 固定的智慧名言 + 隨機 AI 療癒小語
    const fixedMsg = t('wisdom_fixed');
    const aiQuotes = dailyAIQuotes[currentLang] || [];
    const staticQuotes = t('quotes');
    const pool = aiQuotes.length > 0 ? aiQuotes : staticQuotes;
    const aiHealing = pool[Math.floor(Math.random() * pool.length)];
    
    if (elements.wisdomMsg) {
        elements.wisdomMsg.innerHTML = `<strong>${fixedMsg}</strong><br><br>${aiHealing}`;
    }
    
    const answerLabel = answer === 'YES' ? t('solve_yes') : t('solve_no');
    addLog(t('log_wisdom', { answer: answerLabel }));
}

if (elements.solveYes) elements.solveYes.onclick = () => handleWisdomAnswer('YES');
if (elements.solveNo) elements.solveNo.onclick = () => handleWisdomAnswer('NO');
if (elements.closeModal) {
    elements.closeModal.onclick = () => {
        elements.modal.classList.add('hidden');
        
        // 如果是自訂時間且在專注模式，則維持在專注模式，不自動跳到休息
        const savedFocus = localStorage.getItem('muda_focus_duration');
        const defaultFocus = getModeConfig().FOCUS.default;
        
        if (currentMode === 'FOCUS' && savedFocus && parseInt(savedFocus) !== defaultFocus) {
            setMode('FOCUS');
        } else {
            if (completedPomos % 4 === 0) setMode('LONG_BREAK'); else setMode('SHORT_BREAK');
        }
    };
}

// --- 事件綁定 ---
elements.startBtn.onclick = startTimer;
elements.pauseBtn.onclick = pauseTimer;
elements.resetBtn.onclick = resetTimer;
elements.durationBtns.forEach(btn => {
    btn.onclick = () => {
        const time = btn.dataset.time;
        if (time) {
            elements.durationBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setMode(currentMode, parseInt(time));
        } else if (btn.id === 'custom-time-btn') {
            elements.customModal.classList.remove('hidden');
            elements.customInput.focus();
        }
    };
});
elements.saveCustomTime.onclick = () => {
    const val = parseInt(elements.customInput.value);
    if (val && val > 0 && val <= 120) {
        setMode(currentMode, val);
        elements.customModal.classList.add('hidden');
        elements.durationBtns.forEach(b => b.classList.remove('active'));
        document.getElementById('custom-time-btn').classList.add('active');
    } else alert(t('alert_invalid_time'));
};

if (elements.decreaseTime) {
    elements.decreaseTime.onclick = () => {
        let val = parseInt(elements.customInput.value);
        if (val > 1) elements.customInput.value = val - 1;
    };
}
if (elements.increaseTime) {
    elements.increaseTime.onclick = () => {
        let val = parseInt(elements.customInput.value);
        if (val < 120) elements.customInput.value = val + 1;
    };
}
elements.cancelCustomTime.onclick = () => elements.customModal.classList.add('hidden');
elements.notiToggle.onclick = requestNotificationPermission;
document.getElementById('work-mode').onclick = () => setMode('FOCUS');
document.getElementById('short-break-mode').onclick = () => setMode('SHORT_BREAK');
document.getElementById('long-break-mode').onclick = () => setMode('LONG_BREAK');

function setTheme(theme) {
    document.body.classList.forEach(cls => { if (cls.startsWith('theme-')) document.body.classList.remove(cls); });
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('muda_theme', theme);
    elements.themeDots.forEach(dot => dot.classList.toggle('active', dot.dataset.theme === theme));
}
elements.themeDots.forEach(dot => {
    dot.onclick = (e) => { setTheme(dot.dataset.theme); elements.themeOptions.classList.add('hidden'); e.stopPropagation(); };
});
elements.themeToggle.onclick = (e) => { elements.themeOptions.classList.toggle('hidden'); elements.langOptions.classList.add('hidden'); e.stopPropagation(); };
elements.langToggle.onclick = (e) => { elements.langOptions.classList.toggle('hidden'); elements.themeOptions.classList.add('hidden'); e.stopPropagation(); };
elements.langBtns.forEach(btn => {
    btn.onclick = (e) => { setLanguage(btn.dataset.lang); elements.langOptions.classList.add('hidden'); e.stopPropagation(); };
});
document.addEventListener('click', () => { elements.themeOptions.classList.add('hidden'); elements.langOptions.classList.add('hidden'); });

// --- 初始化入口 ---
(async function init() {
    await loadDailyQuotes();
    setLanguage(detectLanguage());
    const savedTheme = localStorage.getItem('muda_theme') || 'red';
    setTheme(savedTheme);
    
    // 初始化模式並套用上次的設定
    setMode('FOCUS');

    initWorker();
    updateNotiUI();
    renderStats();
    addLog(t('log_start'));
})();
