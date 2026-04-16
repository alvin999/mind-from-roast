export const state = {
    currentLang: 'en',
    dailyAIQuotes: { zh: [], en: [], ja: [] },
    rafId: null,
    todayStr: new Date().toISOString().split('T')[0],
    timeLeft: 25 * 60,
    totalTime: 25 * 60,
    timerWorker: null,
    currentMode: 'FOCUS',
    completedPomos: 0,
    isNotificationEnabled: localStorage.getItem('muda_notifications') === 'true',
    stats: null
};
