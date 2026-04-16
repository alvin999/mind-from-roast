import { t } from './i18n.js';
import { elements } from './dom.js';
import { state } from './state.js';

export async function requestNotificationPermission() {
    if (!("Notification" in window)) return false;
    
    if (Notification.permission === "granted") {
        state.isNotificationEnabled = !state.isNotificationEnabled;
    } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        state.isNotificationEnabled = (permission === "granted");
    } else {
        alert(t('notify_permission_denied'));
        state.isNotificationEnabled = false;
    }
    
    localStorage.setItem('muda_notifications', state.isNotificationEnabled);
    updateNotiUI();
    return state.isNotificationEnabled;
}

export function updateNotiUI() {
    if (!elements.notiToggle) return;
    elements.notiToggle.classList.toggle('active', state.isNotificationEnabled);
}

export function sendNotification(title, body) {
    if (state.isNotificationEnabled && Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: 'assets/images/logo.png'
        });
    }
}
