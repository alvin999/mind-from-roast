/**
 * Mind From Roast | 脈環漏 - 核心邏輯 (v3.2)
 * 包含：Gemini AI 每日格言、多語系、模式管理、進度環、智慧問答
 */

// --- 狀態變數 ---
let currentLang = 'en';
let dailyAIQuotes = { zh: [], en: [], ja: [] };

// --- 多語系與 AI 格言載入 ---
async function loadDailyQuotes() {
    try {
        const response = await fetch('daily_quotes.json');
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
    elements.quoteText.textContent = combinedQuotes[Math.floor(Math.random() * combinedQuotes.length)];
}

// --- 計時器核心 logic ---
const getModeConfig = () => ({
    FOCUS: { id: 'work-mode', textKey: 'focus_time', default: 25 },
    SHORT_BREAK: { id: 'short-break-mode', textKey: 'short_break', default: 5 },
    LONG_BREAK: { id: 'long-break-mode', textKey: 'long_break', default: 15 }
});

let timeLeft = 25 * 60;
let totalTime = 25 * 60;
let rafId = null;
let startTime = null;
let initialTimeLeft = null;
let currentMode = 'FOCUS';
let completedPomos = 0;

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
    saveCustomTime: document.getElementById('save-custom-time'),
    cancelCustomTime: document.getElementById('cancel-custom-time')
};

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
    if (rafId !== null) return;
    elements.startBtn.disabled = true;
    elements.pauseBtn.disabled = false;
    if (elements.bgVideo) elements.bgVideo.style.filter = "brightness(0.6) blur(0px)";
    document.querySelector('.timer-display').classList.add('running');
    startTime = performance.now();
    initialTimeLeft = timeLeft;

    function tick(currentTime) {
        const elapsed = (currentTime - startTime) / 1000;
        const newTimeLeft = Math.max(0, initialTimeLeft - Math.floor(elapsed));
        if (newTimeLeft !== timeLeft) {
            timeLeft = newTimeLeft;
            updateDisplay();
        }
        if (timeLeft > 0) {
            rafId = requestAnimationFrame(tick);
        } else {
            rafId = null;
            handleFinish();
        }
    }
    rafId = requestAnimationFrame(tick);
}

function pauseTimer() {
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    elements.startBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    if (elements.bgVideo) elements.bgVideo.style.filter = "brightness(0.7) blur(2px)";
    document.querySelector('.timer-display').classList.remove('running');
}

function resetTimer() {
    pauseTimer();
    timeLeft = totalTime;
    updateDisplay();
}

function setMode(modeKey, customMinutes = null) {
    currentMode = modeKey;
    const modeCfg = getModeConfig()[modeKey];
    totalTime = (customMinutes || modeCfg.default) * 60;
    timeLeft = totalTime;
    elements.statusText.textContent = t(modeCfg.textKey);
    elements.modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.id === modeCfg.id);
    });
    updateQuoteDisplay();
    updateDisplay();
    pauseTimer();
}

function handleFinish() {
    if (elements.bellSound) elements.bellSound.play();
    if (currentMode === 'FOCUS') {
        completedPomos++;
        stats.pomos++;
        stats.minutes += Math.floor(totalTime / 60);
        addLog(t('log_finish_focus', { min: Math.floor(totalTime / 60) }));
        showWisdomModal();
    } else {
        const modeLabel = currentMode === 'SHORT_BREAK' ? t('short_break') : t('long_break');
        addLog(t('log_finish_break', { mode: modeLabel }));
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
        if (completedPomos % 4 === 0) setMode('LONG_BREAK'); else setMode('SHORT_BREAK');
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
elements.cancelCustomTime.onclick = () => elements.customModal.classList.add('hidden');
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
    renderStats();
    updateDisplay();
    addLog(t('log_start'));
})();
