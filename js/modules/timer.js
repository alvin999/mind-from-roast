import { state } from './state.js';
import { elements } from './dom.js';
import { getModeConfig } from './config.js';
import { updateDisplay, updateQuoteDisplay, animatePanelResize, showWisdomModal } from './ui.js';
import { t } from './i18n.js';
import { addLog } from './stats.js';
import { sendNotification } from './notifications.js';

export function initWorker() {
    if (window.Worker) {
        state.timerWorker = new Worker('js/timer_worker.js');
        state.timerWorker.onmessage = function(e) {
            const { type, timeLeft: workerTimeLeft } = e.data;
            if (type === 'tick') {
                state.timeLeft = workerTimeLeft;
                updateDisplay();
            } else if (type === 'finish') {
                state.timeLeft = 0;
                updateDisplay();
                handleFinish();
            }
        };
    } else {
        console.error("Web Workers are not supported in this browser.");
    }
}

export function startTimer() {
    if (!state.timerWorker) initWorker();
    
    elements.startBtn.disabled = true;
    elements.pauseBtn.disabled = false;
    if (elements.bgVideo) elements.bgVideo.style.filter = "brightness(0.6) blur(0px)";
    document.querySelector('.timer-display').classList.add('running');
    
    state.timerWorker.postMessage({ action: 'start', value: state.timeLeft });
}

export function pauseTimer() {
    if (state.timerWorker) {
        state.timerWorker.postMessage({ action: 'pause' });
    }
    elements.startBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    if (elements.bgVideo) elements.bgVideo.style.filter = "brightness(0.7) blur(2px)";
    document.querySelector('.timer-display').classList.remove('running');
}

export function resetTimer() {
    pauseTimer();
    
    const modeCfg = getModeConfig()[state.currentMode];
    localStorage.removeItem(`muda_${state.currentMode.toLowerCase()}_duration`);
    
    setMode(state.currentMode);
    addLog(t('log_reset_mode', { mode: t(modeCfg.textKey) }));
}

export function setMode(modeKey, customMinutes = null) {
    state.currentMode = modeKey;
    const modeCfg = getModeConfig()[modeKey];
    
    if (customMinutes) {
        localStorage.setItem(`muda_${modeKey.toLowerCase()}_duration`, customMinutes);
        if (elements.customInput) elements.customInput.value = customMinutes;
    }
    
    const savedDuration = localStorage.getItem(`muda_${modeKey.toLowerCase()}_duration`);
    const duration = savedDuration ? parseInt(savedDuration) : modeCfg.default;
    
    state.totalTime = duration * 60;
    state.timeLeft = state.totalTime;
    
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

export function handleFinish() {
    if (elements.bellSound) elements.bellSound.play();
    
    const notifyTitle = t('notify_finish_title');
    
    if (state.currentMode === 'FOCUS') {
        state.completedPomos++;
        state.stats.today.pomos++;
        state.stats.today.minutes += Math.floor(state.totalTime / 60);
        addLog(t('log_finish_focus', { min: Math.floor(state.totalTime / 60) }));
        sendNotification(notifyTitle, t('notify_finish_focus'));
        showWisdomModal();
    } else {
        const modeLabel = state.currentMode === 'SHORT_BREAK' ? t('short_break') : t('long_break');
        addLog(t('log_finish_break', { mode: modeLabel }));
        sendNotification(notifyTitle, t('notify_finish_break'));
        if (state.completedPomos % 4 === 0 && state.completedPomos > 0) {
            setMode('LONG_BREAK');
        } else {
            setMode('FOCUS');
        }
    }
}
