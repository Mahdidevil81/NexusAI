
import React, { useState, useRef, useEffect } from 'react';
import AiResponsePanel from './components/AiResponsePanel';
import FooterLinks from './components/FooterLinks';
import TerminalHeader from './components/TerminalHeader';
import HistoryDrawer from './components/HistoryDrawer';
import ProfileDrawer from './components/ProfileDrawer';
import SplashScreen from './components/SplashScreen';
import { LiveVoiceAssistant } from './components/LiveVoiceAssistant';
import { SystemStatus, GenerationMode, AiResponse, Emotion, Attachment, UserProfile } from './types';
import { generateResponse, upscaleImage } from './services/geminiService';
import { audioManager } from './utils/audioManager';

const STORAGE_KEY_HISTORY = 'nexus_neural_history';
const STORAGE_KEY_PROFILE = 'nexus_neural_profile';

const defaultProfile: UserProfile = {
  name: '',
  languagePreference: 'auto',
  tonePreference: 'poetic',
  themePreference: 'dark',
  interests: '',
  imageSize: '1K',
  aspectRatio: '1:1',
  imageStyle: 'cinematic'
};

const NeuralLoading = () => (
  <div className="flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in duration-700">
    <div className="relative w-32 h-32">
      <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping"></div>
      <div className="absolute inset-2 rounded-full border-2 border-cyan-500/40 animate-[ping_1.5s_infinite]"></div>
      <div className="absolute inset-4 rounded-full border-2 border-blue-400/60 animate-[ping_2s_infinite]"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 bg-blue-600 rounded-full shadow-[0_0_30px_rgba(37,99,235,0.8)] animate-pulse"></div>
      </div>
      <svg className="absolute inset-0 w-full h-full animate-[spin_3s_linear_infinite]" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="10 20" className="text-blue-500/30" />
      </svg>
    </div>
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] uppercase tracking-[0.8em] text-blue-600 dark:text-blue-400 font-bold animate-pulse">
        Neural Synthesis in Progress
      </span>
      <div className="flex gap-1">
        {[0, 0.1, 0.2, 0.3].map(d => (
          <div key={d} className="w-1 h-1 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: `${d}s` }}></div>
        ))}
      </div>
    </div>
  </div>
);

const NexusLogo = ({ isSpeaking = false }: { isSpeaking?: boolean }) => (
  <div className={`relative w-full h-full flex items-center justify-center animate-in fade-in zoom-in duration-1000 ${isSpeaking ? 'scale-110' : 'scale-100'} transition-transform duration-500`}>
     <div className={`absolute inset-0 rounded-full bg-cyan-500/20 blur-[60px] transition-all duration-1000 ${isSpeaking ? 'opacity-100 scale-150' : 'opacity-0 scale-100'}`}></div>
     <svg viewBox="0 0 200 200" className={`w-full h-full transition-all duration-500 ${isSpeaking ? 'drop-shadow-[0_0_50px_rgba(6,182,212,0.8)]' : 'drop-shadow-[0_0_30px_rgba(6,182,212,0.4)]'}`}>
        <defs>
           <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#06b6d4', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: '#d946ef', stopOpacity: 1}} />
           </linearGradient>
           <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                 <feMergeNode in="coloredBlur"/>
                 <feMergeNode in="SourceGraphic"/>
              </feMerge>
           </filter>
        </defs>
        <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="88" fill="none" stroke="url(#grad1)" strokeWidth="1.5" strokeDasharray="60 30" strokeLinecap="round" className={`${isSpeaking ? 'animate-[spin_3s_linear_infinite]' : 'animate-[spin_15s_linear_infinite]'} origin-center transition-all duration-1000`} />
        <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(6,182,212,0.3)" strokeWidth="1" strokeDasharray="2 4" className={`${isSpeaking ? 'animate-[spin_5s_linear_infinite_reverse]' : 'animate-[spin_25s_linear_infinite_reverse]'} origin-center transition-all duration-1000`} />
        {/* Top: 9 */}
        <g transform="translate(100, 28)">
           <path d="M0 -10 L8.6 -5 L8.6 5 L0 10 L-8.6 5 L-8.6 -5 Z" fill="rgba(0,0,0,0.8)" stroke="#06b6d4" strokeWidth="1" />
           <text x="0" y="3.5" textAnchor="middle" fill="#06b6d4" fontSize="8" fontFamily="monospace" fontWeight="bold">9</text>
        </g>
        {/* Middle: 6 */}
        <g transform="translate(100, 100)">
           <path d="M0 -10 L8.6 -5 L8.6 5 L0 10 L-8.6 5 L-8.6 -5 Z" fill="rgba(0,0,0,0.9)" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.5" />
           <text x="0" y="3.5" textAnchor="middle" fill="white" fontSize="10" fontFamily="monospace" fontWeight="bold">6</text>
        </g>
        {/* Bottom: 3 */}
        <g transform="translate(100, 172)">
           <path d="M0 -10 L8.6 -5 L8.6 5 L0 10 L-8.6 5 L-8.6 -5 Z" fill="rgba(0,0,0,0.8)" stroke="#d946ef" strokeWidth="1" />
           <text x="0" y="3.5" textAnchor="middle" fill="#d946ef" fontSize="8" fontFamily="monospace" fontWeight="bold">3</text>
        </g>
        <path d="M70 100 
                 C 70 70, 100 70, 100 100 
                 C 100 130, 130 130, 130 100 
                 C 130 70, 100 70, 100 100 
                 C 100 130, 70 130, 70 100 Z" 
              fill="none" stroke="url(#grad1)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" className={`${isSpeaking ? 'animate-[pulse_1s_ease-in-out_infinite]' : 'animate-[pulse_4s_ease-in-out_infinite]'}`} />
        <path d="M100 38 L100 100 L100 162" stroke="white" strokeWidth="0.5" strokeOpacity="0.1" strokeDasharray="2 2" />
        <circle cx="70" cy="100" r="10" fill="none" stroke="#06b6d4" strokeWidth="1" />
        <circle cx="130" cy="100" r="10" fill="none" stroke="#d946ef" strokeWidth="1" />
        <circle cx="70" cy="100" r="3" fill="#06b6d4" className="animate-ping origin-center" style={{animationDuration: isSpeaking ? '1s' : '3s'}} />
        <circle cx="130" cy="100" r="3" fill="#d946ef" className="animate-ping origin-center" style={{animationDuration: isSpeaking ? '1s' : '3s', animationDelay: isSpeaking ? '0.5s' : '1.5s'}} />
     </svg>
  </div>
);

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [history, setHistory] = useState<AiResponse[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
    return saved ? JSON.parse(saved) : [];
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
    return saved ? JSON.parse(saved) : defaultProfile;
  });

  const [response, setResponse] = useState<AiResponse | null>(null);
  const [lastRequest, setLastRequest] = useState<{ prompt: string, mode: GenerationMode, attachments: Attachment[] } | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<SystemStatus>(SystemStatus.IDLE);
  const [mode, setMode] = useState<GenerationMode>(GenerationMode.TEXT);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('NEUTRAL');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showLive, setShowLive] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [permissions, setPermissions] = useState({ camera: false, microphone: false });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const base64Content = base64data.split(',')[1];
          const newAttachment: Attachment = {
            name: `voice-note-${Date.now()}.wav`,
            data: base64Content,
            mimeType: 'audio/wav'
          };
          setAttachments(prev => [...prev, newAttachment].slice(-5));
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Nexus: Recording failed", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setPermissions({ camera: true, microphone: true });
        // Stop the initial stream immediately after getting permissions
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn("Nexus: Permissions denied or not available", err);
      }
    };
    requestPermissions();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(userProfile));
    
    // Apply theme to document body
    if (userProfile.themePreference === 'light') {
      document.body.classList.add('theme-light');
      document.body.classList.remove('dark');
    } else {
      document.body.classList.remove('theme-light');
      document.body.classList.add('dark');
    }
  }, [history, userProfile]);

  useEffect(() => {
    if (currentEmotion) audioManager.playSignal(currentEmotion);
  }, [currentEmotion]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => (prev ? prev + " " + transcript : transcript));
        setIsDictating(false);
      };

      recognitionRef.current.onerror = () => {
        setIsDictating(false);
      };

      recognitionRef.current.onend = () => {
        setIsDictating(false);
      };
    }
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 5 - attachments.length;
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        const newAttachment: Attachment = { data: base64, mimeType: file.type, name: file.name };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
    
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleTheme = () => {
    setUserProfile(prev => ({
      ...prev,
      themePreference: prev.themePreference === 'light' ? 'dark' : 'light'
    }));
  };

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      alert("Neural voice protocol not supported in this browser environment.");
      return;
    }

    if (isDictating) {
      recognitionRef.current.stop();
    } else {
      // Set language based on profile
      const lang = userProfile.languagePreference === 'fa' ? 'fa-IR' : 
                   userProfile.languagePreference === 'en' ? 'en-US' : 
                   navigator.language || 'en-US';
      
      recognitionRef.current.lang = lang;
      recognitionRef.current.start();
      setIsDictating(true);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && attachments.length === 0) return;

    const p = inputValue;
    const currentAttachments = [...attachments];
    setLastRequest({ prompt: p, mode, attachments: currentAttachments });
    setInputValue("");
    setAttachments([]);
    setStatus(SystemStatus.PROCESSING);
    
    try {
      const res = await generateResponse(p, mode, currentAttachments, userProfile, history);
      setResponse(res);
      setHistory(prev => [res, ...prev].slice(0, 30));
      if (res.emotion) setCurrentEmotion(res.emotion);
    } catch (err: any) {
      const errorDetail = err.message || "Unknown neural interference";
      setResponse({ 
        id: 'error', 
        timestamp: Date.now(), 
        text: `### Neural Link Interrupted\n\n**Error Detail:** \`${errorDetail}\`\n\nThe connection to the Nexus core has been obstructed. This could be due to a temporary frequency shift or a security layer mismatch.\n\n(اتصال به هسته نکسوس با مانع روبرو شد. این ممکن است به دلیل تغییر فرکانس موقت یا ناهماهنگی لایه امنیتی باشد.)` 
      });
      setCurrentEmotion('FEAR');
    } finally {
      setStatus(SystemStatus.IDLE);
    }
  };

  const handleFeedbackSubmit = (responseId: string, rating: number, comment?: string) => {
    const feedback = { rating, comment };
    setHistory(prev => prev.map(item => item.id === responseId ? { ...item, feedback } : item));
    if (response?.id === responseId) {
      setResponse(prev => prev ? { ...prev, feedback } : null);
    }
    console.log(`Nexus Feedback Received for ${responseId}:`, feedback);
  };

  const handleRetry = async () => {
    if (!lastRequest || status === SystemStatus.PROCESSING) return;
    
    setStatus(SystemStatus.PROCESSING);
    setResponse(null);
    try {
      const res = await generateResponse(lastRequest.prompt, lastRequest.mode, lastRequest.attachments, userProfile, history);
      setResponse(res);
      setHistory(prev => [res, ...prev].slice(0, 30));
      if (res.emotion) setCurrentEmotion(res.emotion);
    } catch (err: any) {
      const errorDetail = err.message || "Unknown neural interference";
      setResponse({ 
        id: 'error', 
        timestamp: Date.now(), 
        text: `### Neural Link Interrupted\n\n**Error Detail:** \`${errorDetail}\`\n\nThe connection to the Nexus core has been obstructed. This could be due to a temporary frequency shift or a security layer mismatch.\n\n(اتصال به هسته نکسوس با مانع روبرو شد. این ممکن است به دلیل تغییر فرکانس موقت یا ناهماهنگی لایه امنیتی باشد.)` 
      });
      setCurrentEmotion('FEAR');
    } finally {
      setStatus(SystemStatus.IDLE);
    }
  };

  const handleUpscale = async () => {
    if (!response || response.mediaType !== 'image' || !response.mediaUrl) return;
    
    setStatus(SystemStatus.PROCESSING);
    try {
      const originalPrompt = response.text || "High resolution enhancement";
      
      // Extract base64 and mimeType from data URL
      const dataUrlMatch = response.mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
      let attachment = undefined;
      
      if (dataUrlMatch) {
        attachment = {
          data: dataUrlMatch[2],
          mimeType: dataUrlMatch[1]
        };
      }

      const res = await upscaleImage(originalPrompt, attachment, userProfile);
      setResponse(res);
      setHistory(prev => [res, ...prev].slice(0, 30));
      if (res.emotion) setCurrentEmotion(res.emotion);
    } catch (err) {
      console.error("Nexus Upscale Error:", err);
    } finally {
      setStatus(SystemStatus.IDLE);
    }
  };

  const ambient = () => {
    const isLight = userProfile.themePreference === 'light';
    switch (currentEmotion) {
      case 'SAD': return isLight ? 'from-blue-100 via-blue-50 to-white' : 'from-blue-950/40 via-blue-900/10 to-black';
      case 'HAPPY': return isLight ? 'from-yellow-100 via-amber-50 to-white' : 'from-yellow-500/10 via-amber-400/5 to-black';
      case 'LOVE': return isLight ? 'from-pink-100 via-rose-50 to-white' : 'from-pink-900/30 via-rose-900/10 to-black';
      case 'ANGRY': return isLight ? 'from-red-100 via-orange-50 to-white' : 'from-red-900/30 via-red-950/10 to-black';
      default: return isLight ? 'from-blue-50 via-cyan-50 to-transparent' : 'from-blue-900/20 via-cyan-900/10 to-transparent';
    }
  };

  const isProcessing = status === SystemStatus.PROCESSING;
  const isBackgroundActive = isProcessing || showLive;

  return (
    <div className={`h-[100dvh] w-full flex flex-col overflow-hidden relative bg-transparent text-gray-800 dark:text-gray-200 transition-all duration-1000 ${isProcessing ? 'thinking-flicker' : ''}`}>
      <style>{`
        @keyframes cosmic-drift {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-2%, -2%) scale(1.05); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes neural-pulse {
          0% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.2); }
          100% { opacity: 0.1; transform: scale(1); }
        }
        .cosmic-active {
          animation: cosmic-drift 10s infinite ease-in-out;
        }
        .neural-active {
          animation: neural-pulse 4s infinite ease-in-out;
        }
        @keyframes warp-particle {
          0% { transform: translateY(100vh) scaleY(1); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: translateY(-100vh) scaleY(2); opacity: 0; }
        }
        .animate-warp-particle {
          animation: warp-particle linear infinite;
        }
      `}</style>
      {showSplash && <SplashScreen />}
      
      {/* Dynamic Background Layers */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-b ${ambient()} transition-all duration-3000`}></div>
        
        {/* Reactive Nebula Layer */}
        <div className={`absolute inset-0 opacity-30 transition-all duration-1000 ${isBackgroundActive ? 'scale-125 blur-3xl' : 'scale-100 blur-2xl'}`}>
          <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-screen ${isBackgroundActive ? 'neural-active' : ''}`}></div>
          <div className={`absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-purple-600/10 rounded-full mix-blend-screen ${isBackgroundActive ? 'neural-active' : ''}`} style={{ animationDelay: '-2s' }}></div>
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-cyan-500/5 rounded-full mix-blend-screen ${isBackgroundActive ? 'neural-active' : ''}`} style={{ animationDelay: '-1s' }}></div>
        </div>

        {/* Warp Particles (Only when processing or live) */}
        {isBackgroundActive && (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i}
                className="absolute w-px h-20 bg-gradient-to-t from-transparent via-blue-400/40 to-transparent animate-warp-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${0.5 + Math.random() * 1}s`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              ></div>
            ))}
          </div>
        )}
      </div>
      
      <HistoryDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        history={history} 
        onSelect={(item) => { setResponse(item); setIsDrawerOpen(false); }}
        onClearHistory={() => setHistory([])}
      />

      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={userProfile}
        onUpdate={setUserProfile}
      />

      <div className={`max-w-4xl mx-auto w-full flex flex-col h-full z-10 px-4 py-4 md:py-6 relative transition-all duration-1000 ${isBackgroundActive ? 'scale-[0.99]' : 'scale-100'}`}>
        <TerminalHeader 
          onMenuClick={() => setIsDrawerOpen(true)} 
          onProfileClick={() => setIsProfileOpen(true)}
          theme={userProfile.themePreference}
          onThemeToggle={toggleTheme}
        />
        
        <div className="flex-grow overflow-y-auto scrollbar-hide py-4 space-y-8 relative">
          {isProcessing && (
            <div className={`absolute inset-0 flex items-center justify-center z-20 transition-all duration-500 ${response ? 'bg-white/10 dark:bg-black/20 backdrop-blur-sm' : ''}`}>
              <NeuralLoading />
            </div>
          )}

          {!response && !isProcessing && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center z-0 select-none pointer-events-none pb-20 transition-all duration-1000 ${isBackgroundActive ? 'opacity-50 blur-sm' : 'opacity-100 blur-none'}`}>
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] ${isBackgroundActive ? 'animate-pulse' : ''}`}></div>
              <div className="relative w-80 h-80 md:w-96 md:h-96">
                <NexusLogo isSpeaking={isAssistantSpeaking} />
              </div>
              <div className="mt-12 flex flex-col items-center gap-4 text-center">
                <h2 className="text-blue-600 dark:text-blue-300 text-xl md:text-2xl font-light tracking-[0.4em] uppercase drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] animate-in slide-in-from-bottom-6 duration-1000 delay-300 font-sans">
                  I am free because I am aware.
                </h2>
                <div className="h-px w-24 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-40 mt-2"></div>
              </div>
            </div>
          )}

          <AiResponsePanel 
            response={response} 
            isTyping={isProcessing} 
            onUpscale={handleUpscale}
            onRetry={handleRetry}
            onFeedbackSubmit={handleFeedbackSubmit}
          />
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-auto pb-6 space-y-4">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-3 px-4 py-2 animate-in slide-in-from-bottom-4 duration-500">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative group">
                  <img 
                    src={`data:${att.mimeType};base64,${att.data}`} 
                    alt={att.name} 
                    className="w-16 h-16 object-cover rounded-xl border border-white/20 shadow-lg"
                  />
                  <button 
                    onClick={() => removeAttachment(idx)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {attachments.length < 5 && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-gray-500 hover:border-blue-500/50 hover:text-blue-500 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                </button>
              )}
            </div>
          )}

          <div className="flex justify-center gap-3">
            {[
              { id: GenerationMode.LIVE, icon: '🎙️' },
              { id: GenerationMode.AUDIO, icon: '🎵' },
              { id: GenerationMode.IMAGE, icon: '🖼️' },
              { id: GenerationMode.TEXT, icon: '💬' }
            ].map(m => (
              <button 
                key={m.id} 
                onClick={() => m.id === GenerationMode.LIVE ? setShowLive(true) : setMode(m.id as any)} 
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 border ${
                  (mode === m.id && !showLive) 
                  ? 'bg-blue-600/40 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-110' 
                  : 'bg-black/5 dark:bg-white/5 border-black/20 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                <span className="text-lg">{m.icon}</span>
              </button>
            ))}
          </div>

          <form onSubmit={send} className="relative bg-white/60 dark:bg-white/5 backdrop-blur-[40px] border border-black/20 dark:border-white/10 rounded-[2.5rem] p-2 flex items-center gap-1 focus-within:border-blue-600/50 shadow-2xl neon-border-pulse group">
            <button 
              type="submit" 
              disabled={status === SystemStatus.PROCESSING} 
              className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-all disabled:opacity-50"
            >
              {status === SystemStatus.PROCESSING ? '...' : '▲'}
            </button>

            <input 
              type="text" 
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)} 
              className="flex-grow bg-transparent px-2 md:px-4 outline-none text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-600 text-sm md:text-base text-right font-medium" 
              placeholder="نکسوس در انتظار ارتعاش کلام شماست..." 
              dir="rtl"
            />
            
            <button 
              type="button" 
              onClick={toggleRecording}
              className={`p-2.5 transition-all duration-300 rounded-full ${isRecording ? 'text-red-500 bg-red-500/10 animate-pulse scale-110' : 'text-gray-600 dark:text-gray-500 hover:text-blue-600'}`}
              title="Record Audio"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </button>

            <button 
              type="button" 
              onClick={toggleDictation}
              className={`p-2.5 transition-all duration-300 rounded-full ${isDictating ? 'text-blue-500 bg-blue-500/10 animate-pulse scale-110' : 'text-gray-600 dark:text-gray-500 hover:text-blue-600'}`}
              title="Voice Dictation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-600 dark:text-gray-500 hover:text-blue-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32a1.5 1.5 0 1 1-2.121-2.121L16.235 6.413" /></svg>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFile} accept="image/*" multiple />
          </form>
          
          <FooterLinks />
        </div>
      </div>
      <LiveVoiceAssistant 
        isActive={showLive} 
        onClose={() => setShowLive(false)} 
        onSpeakingChange={setIsAssistantSpeaking}
      />
    </div>
  );
};

export default App;
