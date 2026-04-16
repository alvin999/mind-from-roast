import { t } from './i18n.js';
import { state } from './state.js';
import { elements } from './dom.js';
import { TRANSLATIONS } from '../translations.js';
import { CIRCLE_CIRCUMFERENCE } from './config.js';
import { renderHistory } from './stats.js';

export function animatePanelResize(panel, contentUpdateFn) {
    if (!panel) return contentUpdateFn();

    const startWidth = panel.offsetWidth;
    const startHeight = panel.offsetHeight;
    
    panel.style.width = startWidth + 'px';
    panel.style.height = startHeight + 'px';
    panel.style.overflow = 'hidden';
    panel.style.transition = 'none';

    contentUpdateFn();

    requestAnimationFrame(() => {
        panel.style.width = 'auto';
        panel.style.height = 'auto';
        
        const endWidth = panel.offsetWidth;
        const endHeight = panel.offsetHeight;

        const header = panel.querySelector('header');
        if (header) {
            header.style.width = (endWidth - 80) + 'px';
            header.style.flexShrink = '0';
        }

        panel.style.width = startWidth + 'px';
        panel.style.height = startHeight + 'px';

        void panel.offsetWidth; 
        
        panel.style.transition = 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        
        panel.style.width = endWidth + 'px';
        panel.style.height = endHeight + 'px';
        
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

export function updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    elements.themeDots.forEach(dot => {
        const theme = dot.dataset.theme;
        if (TRANSLATIONS[state.currentLang].themes[theme]) {
            dot.title = TRANSLATIONS[state.currentLang].themes[theme];
        }
    });

    updateDisplay();
}

export function updateQuoteDisplay() {
    const aiQuotes = state.dailyAIQuotes[state.currentLang] || [];
    const staticQuotes = t('quotes');
    const combinedQuotes = aiQuotes.length > 0 ? aiQuotes : staticQuotes;
    const newQuote = combinedQuotes[Math.floor(Math.random() * combinedQuotes.length)];
    
    elements.quoteText.classList.add('fade-out');
    
    setTimeout(() => {
        animatePanelResize(elements.mainPanel, () => {
            elements.quoteText.textContent = newQuote;
        });
        
        setTimeout(() => {
            elements.quoteText.classList.remove('fade-out');
        }, 50);
    }, 300);
}

export function initUIOptions() {
    if (elements.progressIndicator) {
        elements.progressIndicator.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
        elements.progressIndicator.style.strokeDashoffset = 0;
    }
}

export function setProgress(percent) {
    if (!elements.progressIndicator) return;
    const offset = CIRCLE_CIRCUMFERENCE - (percent / 100) * CIRCLE_CIRCUMFERENCE;
    elements.progressIndicator.style.strokeDashoffset = offset;
}

export function updateDisplay() {
    const min = Math.floor(state.timeLeft / 60);
    const sec = state.timeLeft % 60;
    elements.minutes.textContent = min.toString().padStart(2, '0');
    elements.seconds.textContent = sec.toString().padStart(2, '0');
    const percent = state.totalTime > 0 ? (state.timeLeft / state.totalTime) * 100 : 0;
    setProgress(percent);
    document.title = `${elements.minutes.textContent}:${elements.seconds.textContent} - ${t('title')}`;
}

export function showWisdomModal() {
    if (!elements.modal) return;
    elements.modal.classList.remove('hidden');
    if (elements.wisdomResult) elements.wisdomResult.classList.add('hidden');
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) modalBody.classList.remove('hidden');
}

export function toggleHistoryModal(show) {
    if (!elements.historyModal) return;
    if (show) {
        renderHistory();
        elements.historyModal.classList.remove('hidden');
    } else {
        elements.historyModal.classList.add('hidden');
    }
}
