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

    // --- 雜訊生成器 (改用 AudioBuffer 以提升效能並避免預廢棄警告) ---

    createNoiseBuffer(type) {
        const sampleRate = this.context.sampleRate;
        const duration = 5; // 生成 5 秒的循環音
        const buffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        if (type === 'white') {
            for (let i = 0; i < data.length; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        } else if (type === 'pink') {
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < data.length; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750371;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                data[i] *= 0.11;
                b6 = white * 0.115926;
            }
        } else if (type === 'brown') {
            let lastOut = 0.0;
            for (let i = 0; i < data.length; i++) {
                const white = Math.random() * 2 - 1;
                const out = (lastOut + (0.02 * white)) / 1.002;
                data[i] = out * 3.5;
                lastOut = out;
            }
        }
        return buffer;
    }

    startNoise(type) {
        if (this.sources[type].node) return;

        const buffer = this.createNoiseBuffer(type);
        const node = this.context.createBufferSource();
        node.buffer = buffer;
        node.loop = true;
        node.connect(this.sources[type].gain);
        node.start();
        
        this.sources[type].node = node;
    }

    stopNoise(type) {
        if (this.sources[type].node) {
            this.sources[type].node.stop();
            this.sources[type].node.disconnect();
            this.sources[type].node = null;
        }
    }
}

// 導出全局單例 (如果是原生 JS 環境)
window.ambientAudio = new AmbientAudioManager();
