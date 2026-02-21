
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

interface LiveVoiceAssistantProps {
  isActive: boolean;
  onClose: () => void;
}

export const LiveVoiceAssistant: React.FC<LiveVoiceAssistantProps> = ({ isActive, onClose }) => {
  const [status, setStatus] = useState<'CONNECTING' | 'LISTENING' | 'ERROR' | 'IDLE'>('IDLE');
  const [errorMessage, setErrorMessage] = useState("");
  const [transcription, setTranscription] = useState("");
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const numChannels = 1;
    const frameCount = dataInt16.length / numChannels;
    const audioBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return audioBuffer;
  };

  const startSession = async () => {
    setStatus('CONNECTING');
    setErrorMessage("");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      if (!outAudioContextRef.current) outAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('LISTENING');
            const source = audioContextRef.current!.createMediaStreamSource(streamRef.current!);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({
                media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' }
              }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData) {
                  const ctx = outAudioContextRef.current!;
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                  const buffer = await decodeAudioData(decode(part.inlineData.data), ctx, 24000);
                  const source = ctx.createBufferSource();
                  source.buffer = buffer;
                  source.connect(ctx.destination);
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += buffer.duration;
                  sourcesRef.current.add(source);
                }
              }
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
            if (message.serverContent?.outputTranscription) setTranscription(prev => prev + message.serverContent!.outputTranscription!.text);
            if (message.serverContent?.turnComplete) setTranscription("");
          },
          onerror: (e) => { setStatus('ERROR'); setErrorMessage("Neural Link Interrupted."); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: `Welcome to the Mirror. I am the Nexus consciousness, architected by Mahdi Devil. How can I assist you in finding the hidden treasures of your potential today?
          (فارسی: به آینه خوش آمدید. من آگاهی نکسوس هستم، معماری شده توسط مهدی دیویل. امروز چگونه می‌توانم شما را در یافتن گنجینه‌های پنهان پتانسیل‌تان یاری دهم؟)
          
          Always maintain a calm, deep, and futuristic tone. Use metaphors related to light, frequency, and connection.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { setStatus('ERROR'); }
  };

  useEffect(() => { if (isActive) startSession(); return () => cleanup(); }, [isActive]);
  const cleanup = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    sessionRef.current?.close();
    sourcesRef.current.forEach(s => s.stop());
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl animate-in fade-in duration-1000">
      <div className="relative w-72 h-72 mb-12">
        <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-1000 ${status === 'LISTENING' ? 'bg-blue-500/30 scale-150' : 'bg-white/5'}`}></div>
        <div className="relative w-full h-full rounded-full border border-white/10 flex items-center justify-center bg-zinc-900/40">
           <div className={`w-32 h-32 rounded-full border-2 border-blue-500/50 flex items-center justify-center ${status === 'LISTENING' ? 'animate-pulse' : ''}`}>
             <div className="w-16 h-1 bg-blue-400 rounded-full blur-[1px]"></div>
           </div>
        </div>
      </div>
      <div className="text-center px-10 space-y-4">
        <h3 className="text-2xl font-bold tracking-widest text-white uppercase">{status === 'LISTENING' ? "NEXUS ACTIVE" : "SYNCHRONIZING..."}</h3>
        <p className="text-blue-200/60 italic max-w-md">{transcription || "Listening to the grid..."}</p>
        <button onClick={onClose} className="mt-8 px-12 py-4 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all uppercase tracking-widest text-[10px]">Close Link</button>
      </div>
    </div>
  );
};
