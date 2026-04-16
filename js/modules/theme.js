import { elements } from './dom.js';
import { themesConfig } from './config.js';

export function setTheme(theme) {
    document.body.classList.forEach(cls => { 
        if (cls.startsWith('theme-')) document.body.classList.remove(cls); 
    });
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('muda_theme', theme);
    elements.themeDots.forEach(dot => dot.classList.toggle('active', dot.dataset.theme === theme));
}

export function applyBackgroundVideoTheme(theme) {
    const targetBtn = Array.from(elements.themeBtns).find(b => b.dataset.theme === theme);
    if (!targetBtn || targetBtn.classList.contains('active')) return;
    
    // 切換按鈕狀態
    elements.themeBtns.forEach(b => b.classList.remove('active'));
    targetBtn.classList.add('active');
    
    // 執行影片切換動效
    const video = elements.bgVideo;
    video.classList.add('fading');
    
    setTimeout(() => {
        video.src = themesConfig[theme];
        video.load();
        video.play().catch(e => console.log("Video play failed:", e));
        
        video.onloadeddata = () => {
            video.classList.remove('fading');
        };
    }, 800); // 與 CSS transition 時間一致
    
    // 保存主題
    localStorage.setItem('muda_theme_bg', theme);
}

export function restoreTheme() {
    const savedTheme = localStorage.getItem('muda_theme') || 'red';
    setTheme(savedTheme);

    const savedBgTheme = localStorage.getItem('muda_theme_bg');
    if (savedBgTheme && themesConfig[savedBgTheme]) {
        applyBackgroundVideoTheme(savedBgTheme);
    }
}
