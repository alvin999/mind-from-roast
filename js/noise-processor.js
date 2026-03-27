/**
 * NoiseProcessor - AudioWorklet 核心
 * 即時生成 White, Pink, Brown Noise 並維持濾波器狀態，徹底消除循環播放的斷層。
 */

class NoiseProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // Pink Noise 狀態 (Paul Kellet's algorithm)
        this.b0 = 0;
        this.b1 = 0;
        this.b2 = 0;
        this.b3 = 0;
        this.b4 = 0;
        this.b5 = 0;
        this.b6 = 0;
        
        // Brown Noise 狀態
        this.lastOut = 0.0;
    }

    static get parameterDescriptors() {
        return [
            {
                name: 'type',
                defaultValue: 0, // 0: White, 1: Pink, 2: Brown
                minValue: 0,
                maxValue: 2
            }
        ];
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const type = parameters.type[0];

        for (let channel = 0; channel < output.length; ++channel) {
            const outputChannel = output[channel];
            for (let i = 0; i < outputChannel.length; ++i) {
                const white = Math.random() * 2 - 1;

                if (type === 0) { 
                    // White Noise
                    outputChannel[i] = white;
                } else if (type === 1) { 
                    // Pink Noise
                    this.b0 = 0.99886 * this.b0 + white * 0.0555179;
                    this.b1 = 0.99332 * this.b1 + white * 0.0750371;
                    this.b2 = 0.96900 * this.b2 + white * 0.1538520;
                    this.b3 = 0.86650 * this.b3 + white * 0.3104856;
                    this.b4 = 0.55000 * this.b4 + white * 0.5329522;
                    this.b5 = -0.7616 * this.b5 - white * 0.0168980;
                    outputChannel[i] = (this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362) * 0.11;
                    this.b6 = white * 0.115926;
                } else if (type === 2) { 
                    // Brown Noise
                    const out = (this.lastOut + (0.02 * white)) / 1.002;
                    outputChannel[i] = out * 3.5;
                    this.lastOut = out;
                }
            }
        }
        return true;
    }
}

registerProcessor('noise-processor', NoiseProcessor);
