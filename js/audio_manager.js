/**
 * AmbientAudioManager - 負責生成與管理高品質環境音
 * 包含：White/Pink/Brown Noise (Web Audio 生成) 
 * 以及外部音檔 (Cafe/Rain)
 */

class AmbientAudioManager {
    constructor() {
        this.context = null;
        this.sources = {
            white: { type: 'noise', generator: 'white', gain: null, node: null, active: false },
            pink: { type: 'noise', generator: 'pink', gain: null, node: null, active: false },
            brown: { type: 'noise', generator: 'brown', gain: null, node: null, active: false },
            cafe: { type: 'file', url: 'assets/audio/cafe-ambient.mp3', gain: null, audio: null, active: false },
            rain: { type: 'file', url: 'assets/audio/rain-ambient.mp3', gain: null, audio: null, active: false }
        };
        this.isInitialized = false;
    }

    async init(initialVolumes = {}) {
        if (this.isInitialized) return;
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();
        await this.context.resume();
        
        // 載入 Noise Processor Worklet
        try {
            await this.context.audioWorklet.addModule('js/noise-processor.js');
            this.workletLoaded = true;
        } catch (e) {
            console.warn("Failed to load AudioWorklet, noise might not work:", e);
            this.workletLoaded = false;
        }

        // 初始化所有音軌的 GainNode
        for (const key in this.sources) {
            const source = this.sources[key];
            source.gain = this.context.createGain();
            
            // 設定初始音量 (優先順位：傳入參數 > 預設 0.5)
            const vol = (initialVolumes[key] !== undefined) ? initialVolumes[key] : 0.5;
            source.gain.gain.value = vol;
            
            source.gain.connect(this.context.destination);
            
            if (source.type === 'file') {
                source.audio = new Audio(source.url);
                source.audio.loop = true;
                source.audio.crossOrigin = "anonymous";
                const mediaSource = this.context.createMediaElementSource(source.audio);
                mediaSource.connect(source.gain);
            }
        }
        
        this.isInitialized = true;
    }

    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    toggle(type, state) {
        this.resume();
        const source = this.sources[type];
        if (!source) return;

        source.active = state;
        
        if (source.type === 'noise') {
            if (state) {
                this.startNoise(type);
            } else {
                this.stopNoise(type);
            }
        } else if (source.type === 'file') {
            if (state) {
                source.audio.play().catch(e => console.error("Audio play failed:", e));
            } else {
                source.audio.pause();
            }
        }
    }

    setVolume(type, value) {
        const source = this.sources[type];
        if (source && source.gain) {
            // 使用指數曲線讓音量調整更平滑
            source.gain.gain.setTargetAtTime(value, this.context.currentTime, 0.05);
        }
    }

    // --- 雜訊生成器 (使用 AudioWorklet 以提徹底消除斷層) ---

    startNoise(type) {
        if (!this.workletLoaded || this.sources[type].node) return;

        // 轉換類型為處理器參數
        const typeMap = { 'white': 0, 'pink': 1, 'brown': 2 };
        const typeValue = typeMap[type] !== undefined ? typeMap[type] : 0;

        const node = new AudioWorkletNode(this.context, 'noise-processor', {
            parameterData: { type: typeValue }
        });

        node.connect(this.sources[type].gain);
        this.sources[type].node = node;
    }

    stopNoise(type) {
        if (this.sources[type].node) {
            this.sources[type].node.disconnect();
            this.sources[type].node = null;
        }
    }
}

// 導出全局單例 (如果是原生 JS 環境)
window.ambientAudio = new AmbientAudioManager();
