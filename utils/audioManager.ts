
import { Emotion } from '../types';

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private currentEmotion: Emotion | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public playSignal(emotion: Emotion) {
    this.init();
    if (this.currentEmotion === emotion && this.oscillators.length > 0) return;
    this.currentEmotion = emotion;
    if (!this.ctx || !this.masterGain) return;

    this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    
    setTimeout(() => {
      this.oscillators.forEach(osc => { 
        try { 
          osc.stop(); 
          osc.disconnect(); 
        } catch(e) {} 
      });
      this.oscillators = [];
      this.startNewSignal(emotion);
    }, 150);
  }

  private startNewSignal(emotion: Emotion) {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    
    const createOsc = (freq: number, type: OscillatorType = 'sine', volume: number = 0.05, duration: number = 0.2) => {
      const safeFreq = Math.min(freq, 2000); // Allow higher frequencies
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(safeFreq, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.01); // Faster attack
      gain.gain.setTargetAtTime(0, now + (duration * 0.1), duration / 2); // Smoother, quicker decay

      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(now);
      osc.stop(now + duration); // Stop precisely after duration
      
      this.oscillators.push(osc);
      return { osc, gain };
    };

    switch (emotion) {
      case 'HAPPY':
        // Quick, bright major arpeggio
        createOsc(523.25, 'triangle', 0.06, 0.3); // C5
        setTimeout(() => createOsc(659.25, 'triangle', 0.06, 0.3), 80); // E5
        setTimeout(() => createOsc(783.99, 'triangle', 0.06, 0.3), 160); // G5
        break;
      case 'LOVE':
        // Soft, warm chord
        createOsc(261.63, 'sine', 0.05, 0.5); // C4
        createOsc(329.63, 'sine', 0.04, 0.5); // E4
        break;
      case 'ANGRY':
        // Short, low, harsh burst
        createOsc(110.00, 'sawtooth', 0.08, 0.15); // A2
        createOsc(116.54, 'sawtooth', 0.08, 0.15); // A#2
        break;
      case 'SAD':
        // Descending minor interval
        const sad = createOsc(392.00, 'sine', 0.05, 0.6); // G4
        sad.osc.frequency.setTargetAtTime(329.63, now + 0.1, 0.2); // Ramp down to E4
        break;
      case 'FEAR':
        // Quiet, low, detuned drone
        createOsc(130.81, 'sine', 0.06, 0.4); // C3
        createOsc(134.31, 'sine', 0.06, 0.4); // Slightly detuned
        break;
      case 'SURPRISE':
        // A short, high-pitched "ping"
        createOsc(1046.50, 'sine', 0.07, 0.2); // C6
        break;
      case 'NEUTRAL':
      default:
        // Clean, simple confirmation blip
        createOsc(440.00, 'sine', 0.06, 0.15); // A4
        break;
    }

    // Lower master gain for subtlety
    this.masterGain.gain.setTargetAtTime(0.1, now, 0.05);
  }

  public stopSignal() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
    this.currentEmotion = null;
  }
}

export const audioManager = new AudioManager();
