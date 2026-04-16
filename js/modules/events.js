import { elements } from './dom.js';
import { state } from './state.js';
import { startTimer, pauseTimer, resetTimer, setMode } from './timer.js';
import { t, changeLanguageState } from './i18n.js';
import { setTheme, applyBackgroundVideoTheme } from './theme.js';
import { toggleHistoryModal, updateUI } from './ui.js';
import { requestNotificationPermission } from './notifications.js';
import { addLog, saveStats } from './stats.js';
import { getModeConfig } from './config.js';

function handleWisdomAnswer(answer) {
    state.stats.today.wisdom++;
    saveStats();
    
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) modalBody.classList.add('hidden');
    if (elements.wisdomResult) elements.wisdomResult.classList.remove('hidden');
    
    const fixedMsg = t('wisdom_fixed');
    const aiQuotes = state.dailyAIQuotes[state.currentLang] || [];
    const staticQuotes = t('quotes');
    const pool = aiQuotes.length > 0 ? aiQuotes : staticQuotes;
    const aiHealing = pool[Math.floor(Math.random() * pool.length)];
    
    if (elements.wisdomMsg) {
        elements.wisdomMsg.innerHTML = `<strong>${fixedMsg}</strong><br><br>${aiHealing}`;
    }
    
    const answerLabel = answer === 'YES' ? t('solve_yes') : t('solve_no');
    addLog(t('log_wisdom', { answer: answerLabel }));
}

export function initEvents() {
    // 計時器基本控制
    if (elements.startBtn) elements.startBtn.addEventListener('click', startTimer);
    if (elements.pauseBtn) elements.pauseBtn.addEventListener('click', pauseTimer);
    if (elements.resetBtn) elements.resetBtn.addEventListener('click', resetTimer);

    // 模式按鈕
    const workModeBtn = document.getElementById('work-mode');
    const shortBreakBtn = document.getElementById('short-break-mode');
    const longBreakBtn = document.getElementById('long-break-mode');
    
    if (workModeBtn) workModeBtn.addEventListener('click', () => setMode('FOCUS'));
    if (shortBreakBtn) shortBreakBtn.addEventListener('click', () => setMode('SHORT_BREAK'));
    if (longBreakBtn) longBreakBtn.addEventListener('click', () => setMode('LONG_BREAK'));

    // 時間長度選擇
    elements.durationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const time = btn.dataset.time;
            if (time) {
                elements.durationBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                setMode(state.currentMode, parseInt(time));
            } else if (btn.id === 'custom-time-btn') {
                elements.customModal.classList.remove('hidden');
                elements.customInput.focus();
            }
        });
    });

    // 自訂時間 Modal 操作
    if (elements.saveCustomTime) {
        elements.saveCustomTime.addEventListener('click', () => {
            const val = parseInt(elements.customInput.value);
            if (val && val > 0 && val <= 120) {
                setMode(state.currentMode, val);
                elements.customModal.classList.add('hidden');
                elements.durationBtns.forEach(b => b.classList.remove('active'));
                document.getElementById('custom-time-btn').classList.add('active');
            } else alert(t('alert_invalid_time'));
        });
    }
    
    if (elements.decreaseTime) {
        elements.decreaseTime.addEventListener('click', () => {
            let val = parseInt(elements.customInput.value);
            if (val > 1) elements.customInput.value = val - 1;
        });
    }
    if (elements.increaseTime) {
        elements.increaseTime.addEventListener('click', () => {
            let val = parseInt(elements.customInput.value);
            if (val < 120) elements.customInput.value = val + 1;
        });
    }
    if (elements.cancelCustomTime) {
        elements.cancelCustomTime.addEventListener('click', () => elements.customModal.classList.add('hidden'));
    }

    // 智慧問答 Modal
    if (elements.solveYes) elements.solveYes.addEventListener('click', () => handleWisdomAnswer('YES'));
    if (elements.solveNo) elements.solveNo.addEventListener('click', () => handleWisdomAnswer('NO'));
    if (elements.closeModal) {
        elements.closeModal.addEventListener('click', () => {
            elements.modal.classList.add('hidden');
            
            const savedFocus = localStorage.getItem('muda_focus_duration');
            const defaultFocus = getModeConfig().FOCUS.default;
            
            if (state.currentMode === 'FOCUS' && savedFocus && parseInt(savedFocus) !== defaultFocus) {
                setMode('FOCUS');
            } else {
                if (state.completedPomos % 4 === 0) setMode('LONG_BREAK'); else setMode('SHORT_BREAK');
            }
        });
    }

    // 歷史紀錄
    if (elements.historyBtn) elements.historyBtn.addEventListener('click', () => toggleHistoryModal(true));
    if (elements.closeHistory) elements.closeHistory.addEventListener('click', () => toggleHistoryModal(false));
    if (elements.historyModal) {
        elements.historyModal.addEventListener('click', (e) => {
            if (e.target === elements.historyModal) toggleHistoryModal(false);
        });
    }

    // 主題與語言選單
    elements.themeDots.forEach(dot => {
        dot.addEventListener('click', (e) => { 
            setTheme(dot.dataset.theme); 
            elements.themeOptions.classList.add('hidden'); 
            e.stopPropagation(); 
        });
    });
    
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', (e) => { 
            elements.themeOptions.classList.toggle('hidden'); 
            elements.langOptions.classList.add('hidden'); 
            e.stopPropagation(); 
        });
    }
    
    if (elements.langToggle) {
        elements.langToggle.addEventListener('click', (e) => { 
            elements.langOptions.classList.toggle('hidden'); 
            elements.themeOptions.classList.add('hidden'); 
            e.stopPropagation(); 
        });
    }
    
    elements.langBtns.forEach(btn => {
        btn.addEventListener('click', (e) => { 
            const lang = btn.dataset.lang;
            if(changeLanguageState(lang)) {
                elements.langBtns.forEach(opt => {
                    opt.classList.toggle('active', opt.dataset.lang === lang);
                });
                updateUI();
            }
            elements.langOptions.classList.add('hidden'); 
            e.stopPropagation(); 
        });
    });
    
    document.addEventListener('click', () => { 
        if (elements.themeOptions) elements.themeOptions.classList.add('hidden'); 
        if (elements.langOptions) elements.langOptions.classList.add('hidden'); 
    });

    // 通知
    if (elements.notiToggle) {
        elements.notiToggle.addEventListener('click', requestNotificationPermission);
    }

    // 背景主題影片
    elements.themeBtns.forEach(btn => {
        btn.addEventListener('click', () => applyBackgroundVideoTheme(btn.dataset.theme));
    });

    // 環境音事件
    elements.ambientBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const type = btn.dataset.type;
            const isActive = btn.classList.contains('active');
            
            if (window.ambientAudio && !window.ambientAudio.isInitialized) {
                const initialVolumes = {};
                elements.ambientSliders.forEach(s => {
                    initialVolumes[s.dataset.type] = parseFloat(s.value);
                });
                await window.ambientAudio.init(initialVolumes);
                
                elements.ambientBtns.forEach(b => {
                    if (b.classList.contains('active') && b !== btn) {
                        window.ambientAudio.toggle(b.dataset.type, true);
                    }
                });
            }
            
            const newState = !isActive;
            btn.classList.toggle('active', newState);
            if (window.ambientAudio) window.ambientAudio.toggle(type, newState);
            
            const savedState = JSON.parse(localStorage.getItem('muda_ambient_state') || '{}');
            savedState[type] = newState;
            localStorage.setItem('muda_ambient_state', JSON.stringify(savedState));
        });
    });

    elements.ambientSliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
            const type = e.target.dataset.type;
            const val = parseFloat(e.target.value);
            
            if (window.ambientAudio && window.ambientAudio.isInitialized) {
                window.ambientAudio.setVolume(type, val);
            }
            
            const savedVol = JSON.parse(localStorage.getItem('muda_ambient_volume') || '{}');
            savedVol[type] = val;
            localStorage.setItem('muda_ambient_volume', JSON.stringify(savedVol));
        });
    });

    if (elements.ambientReset) {
        elements.ambientReset.addEventListener('click', () => {
            const defaultVol = 0.5;
            const savedVol = {};
            
            elements.ambientSliders.forEach(slider => {
                const type = slider.dataset.type;
                slider.value = defaultVol;
                savedVol[type] = defaultVol;
                
                if (window.ambientAudio && window.ambientAudio.isInitialized) {
                    window.ambientAudio.setVolume(type, defaultVol);
                }
            });
            
            localStorage.setItem('muda_ambient_volume', JSON.stringify(savedVol));
            
            const icon = elements.ambientReset.querySelector('svg');
            if (icon) {
                icon.style.transition = 'transform 0.5s ease';
                icon.style.transform = 'rotate(360deg)';
                setTimeout(() => icon.style.transform = 'rotate(0deg)', 500);
            }
        });
    }
}
