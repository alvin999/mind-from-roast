/**
 * Muda Tomato - 核心邏輯 (v2.0)
 * 包含：模式管理、進度環、智慧問答、紀錄系統
 */

// --- 常數設定 ---
const MODES = {
    FOCUS: { id: 'work-mode', text: 'Focus Time', default: 25 },
    SHORT_BREAK: { id: 'short-break-mode', text: 'Short Break', default: 5 },
    LONG_BREAK: { id: 'long-break-mode', text: 'Long Break', default: 15 }
};

const WISDOM_RESPONSES = {
    YES: "那就不必擔心了！專注於腳下的每一步，事情會自然迎刃而解。",
    NO: "擔心也沒用，放下吧～ 先休息一下，讓大腦重新開機，靈感也許會在不經意間出現。"
};

// --- 狀態變數 ---
let timeLeft = 25 * 60;
let totalTime = 25 * 60;
let rafId = null;
let startTime = null;
let initialTimeLeft = null;
let currentMode = 'FOCUS';
let completedPomos = 0;

// 紀錄系統資料結構
let stats = JSON.parse(localStorage.getItem('muda_stats')) || {
    pomos: 0,
    minutes: 0,
    wisdom: 0,
    logs: []
};

// --- DOM 元素 ---
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
    
    // 紀錄面板
    statPomos: document.getElementById('stat-pomos'),
    statMinutes: document.getElementById('stat-minutes'),
    statWisdom: document.getElementById('stat-wisdom'),
    logList: document.getElementById('log-container'),

    // Modal
    modal: document.getElementById('wisdom-modal'),
    solveYes: document.getElementById('solve-yes'),
    solveNo: document.getElementById('solve-no'),
    wisdomResult: document.getElementById('wisdom-result'),
    wisdomMsg: document.getElementById('wisdom-message'),
    closeModal: document.getElementById('close-modal'),

    // 自訂時間 Modal
    customModal: document.getElementById('custom-time-modal'),
    customInput: document.getElementById('custom-minutes-input'),
    saveCustomTime: document.getElementById('save-custom-time'),
    cancelCustomTime: document.getElementById('cancel-custom-time')
};

const quotes = [
    "Take a deep breath.",
    "Small steps every day.",
    "Stay focused, stay tender.",
    "You're doing great.",
    "Peace begins with a smile.",
    "專注是最高級的放鬆。",
    "慢慢來，比較快。"
];

// --- 初始化進度環 ---
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

// --- 更新顯示 ---
function updateDisplay() {
    const min = Math.floor(timeLeft / 60);
    const sec = timeLeft % 60;
    elements.minutes.textContent = min.toString().padStart(2, '0');
    elements.seconds.textContent = sec.toString().padStart(2, '0');
    
    // 更新進度環
    const percent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
    setProgress(percent);

    // 更新標題
    document.title = `${elements.minutes.textContent}:${elements.seconds.textContent} - Mind From Roast | 脈環漏`;
}

// --- 紀錄功能 ---
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

// --- 模式切換 ---
function setMode(modeKey, customMinutes = null) {
    currentMode = modeKey;
    const modeCfg = MODES[modeKey];
    
    totalTime = (customMinutes || modeCfg.default) * 60;
    timeLeft = totalTime;
    elements.statusText.textContent = modeCfg.text;
    
    elements.modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.id === modeCfg.id);
    });

    elements.quoteText.textContent = quotes[Math.floor(Math.random() * quotes.length)];
    
    updateDisplay();
    pauseTimer();
}

// --- 完成處理 ---
function handleFinish() {
    if (elements.bellSound) elements.bellSound.play();
    
    if (currentMode === 'FOCUS') {
        completedPomos++;
        stats.pomos++;
        stats.minutes += Math.floor(totalTime / 60);
        addLog(`完成專注之旅: ${Math.floor(totalTime / 60)} 分鐘`);
        showWisdomModal();
    } else {
        addLog(`休息結束: ${currentMode === 'SHORT_BREAK' ? 'Short' : 'Long'} Break`);
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
    if (elements.wisdomMsg) elements.wisdomMsg.textContent = WISDOM_RESPONSES[answer];
    
    addLog(`智慧對話: ${answer === 'YES' ? '能解決' : '暫時不能'}`);
}

if (elements.solveYes) elements.solveYes.onclick = () => handleWisdomAnswer('YES');
if (elements.solveNo) elements.solveNo.onclick = () => handleWisdomAnswer('NO');
if (elements.closeModal) {
    elements.closeModal.onclick = () => {
        elements.modal.classList.add('hidden');
        if (completedPomos % 4 === 0) {
            setMode('LONG_BREAK');
        } else {
            setMode('SHORT_BREAK');
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

// 自訂時間彈窗邏輯
elements.saveCustomTime.onclick = () => {
    const val = parseInt(elements.customInput.value);
    if (val && val > 0 && val <= 120) {
        setMode(currentMode, val);
        elements.customModal.classList.add('hidden');
        elements.durationBtns.forEach(b => b.classList.remove('active'));
        document.getElementById('custom-time-btn').classList.add('active');
    } else {
        alert("請輸入 1 到 120 之間的數字。");
    }
};

elements.cancelCustomTime.onclick = () => {
    elements.customModal.classList.add('hidden');
};

document.getElementById('work-mode').onclick = () => setMode('FOCUS');
document.getElementById('short-break-mode').onclick = () => setMode('SHORT_BREAK');
document.getElementById('long-break-mode').onclick = () => setMode('LONG_BREAK');

// --- 主題切換 ---
function setTheme(theme) {
    document.body.classList.forEach(cls => {
        if (cls.startsWith('theme-')) document.body.classList.remove(cls);
    });
    
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('muda_theme', theme);
    
    elements.themeDots.forEach(dot => {
        dot.classList.toggle('active', dot.dataset.theme === theme);
    });
}

elements.themeDots.forEach(dot => {
    dot.onclick = (e) => {
        setTheme(dot.dataset.theme);
        elements.themeOptions.classList.add('hidden'); // 選完自動收合
        e.stopPropagation();
    };
});

// 選單開關
elements.themeToggle.onclick = (e) => {
    elements.themeOptions.classList.toggle('hidden');
    e.stopPropagation();
};

// 點擊外部關閉選單
document.addEventListener('click', () => {
    elements.themeOptions.classList.add('hidden');
});

// --- 初始化 ---
const savedTheme = localStorage.getItem('muda_theme') || 'red';
setTheme(savedTheme);

renderStats();
updateDisplay();
addLog("脈環漏系統啟動，歡迎開始專注之旅。");
