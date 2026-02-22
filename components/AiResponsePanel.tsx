
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { AiResponse, GenerationMode } from '../types';
import { translateToPersian, generateTTS } from '../services/geminiService';

interface CustomFilter {
  id: string;
  name: string;
  brightness: number;
  contrast: number;
  saturation: number;
  hueRotate: number;
}

interface AiResponsePanelProps {
  response: AiResponse | null;
  isTyping: boolean;
  onEditUpdate?: (newResponse: AiResponse) => void;
  onFixAuth?: () => void;
  onUpscale?: () => void;
  onRetry?: () => void;
  onFeedbackSubmit?: (responseId: string, rating: number, comment?: string) => void;
}

const VISUAL_PRESETS = [
  { id: 'none', name: 'Original', filter: '' },
  { id: 'vintage', name: 'Vintage', filter: 'sepia(50%) contrast(110%) brightness(105%) saturate(80%)' },
  { id: 'grayscale', name: 'Grayscale', filter: 'grayscale(100%)' },
  { id: 'sepia', name: 'Sepia', filter: 'sepia(100%)' },
  { id: 'noir', name: 'Noir', filter: 'grayscale(100%) contrast(150%) brightness(80%)' },
  { id: 'vivid', name: 'Vivid', filter: 'saturate(180%) contrast(110%)' },
  { id: 'cyber', name: 'Cyberpunk', filter: 'hue-rotate(-45deg) saturate(200%) contrast(120%) brightness(110%)' },
  { id: 'golden', name: 'Golden', filter: 'sepia(30%) saturate(150%) brightness(110%) hue-rotate(-10deg)' },
  { id: 'frost', name: 'Frost', filter: 'hue-rotate(180deg) saturate(80%) brightness(110%) contrast(90%)' },
  { id: 'neon', name: 'Neon', filter: 'saturate(300%) contrast(150%) brightness(120%)' },
  { id: 'matrix', name: 'Matrix', filter: 'hue-rotate(90deg) saturate(150%) brightness(110%) contrast(120%)' },
];

const useTypewriter = (text: string, speed: number = 15) => {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    setDisplayedText('');
    if (!text) return;
    const timer = setInterval(() => {
      setDisplayedText((prev) => {
        if (prev.length < text.length) return text.slice(0, prev.length + 1);
        clearInterval(timer);
        return prev;
      });
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return displayedText;
};

const CustomAudioPlayer: React.FC<{ url: string; autoPlay?: boolean }> = ({ url, autoPlay }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [url, autoPlay]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(isNaN(pct) ? 0 : pct);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const onEnded = () => setIsPlaying(false);

  return (
    <div className="w-full bg-white/20 dark:bg-white/5 backdrop-blur-[40px] border border-black/10 dark:border-white/10 rounded-[2rem] p-6 mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700 shadow-2xl overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
      <audio 
        ref={audioRef} 
        src={url} 
        onTimeUpdate={onTimeUpdate} 
        onLoadedMetadata={onLoadedMetadata} 
        onEnded={onEnded}
      />
      
      <div className="flex items-center gap-6">
        <button 
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 active:scale-90 transition-all"
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg className="w-6 h-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        <div className="flex-grow flex flex-col gap-2">
          <div className="flex justify-between text-[10px] font-mono text-blue-700 dark:text-blue-400 uppercase tracking-widest">
            <span>Neural Wave synthesis</span>
            <span>{duration > 0 ? `${Math.floor(duration)}s` : '--'} Reflection</span>
          </div>
          
          <div className="h-1 w-full bg-black/10 dark:bg-white/5 rounded-full overflow-hidden relative">
            <div 
              className="absolute top-0 left-0 h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const AiResponsePanel: React.FC<AiResponsePanelProps> = ({ response, isTyping, onFixAuth, onUpscale, onRetry, onFeedbackSubmit }) => {
  const [content, setContent] = useState(response?.text || '');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const typedContent = useTypewriter(content, 15);
  const isAnimationComplete = typedContent.length === content.length;
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isTtsMenuOpen, setIsTtsMenuOpen] = useState(false);
  const [showShimmer, setShowShimmer] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const ttsMenuRef = useRef<HTMLDivElement>(null);
  
  // Feedback states
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  
  // TTS states
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [speakingRate, setSpeakingRate] = useState(1.0);
  
  // Image states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [hueRotate, setHueRotate] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState('auto');
  const [activeVisualPreset, setActiveVisualPreset] = useState(VISUAL_PRESETS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [showAestheticEngine, setShowAestheticEngine] = useState(false);

  useEffect(() => {
    setContent(response?.text || '');
    setTtsAudioUrl(null);
    setIsUpscaling(false);
    setFeedbackRating(response?.feedback?.rating || 0);
    setFeedbackComment(response?.feedback?.comment || '');
    setIsFeedbackSubmitted(!!response?.feedback);
    setShowFeedbackForm(false);
    if (response?.mediaUrl && response.mediaType === 'image') {
      setShowShimmer(true);
      const timer = setTimeout(() => setShowShimmer(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [response?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setIsShareMenuOpen(false);
      }
      if (ttsMenuRef.current && !ttsMenuRef.current.contains(event.target as Node)) {
        setIsTtsMenuOpen(false);
      }
    };
    if (isShareMenuOpen || isTtsMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isShareMenuOpen, isTtsMenuOpen]);

  const handleTranslate = async () => {
    if (!response?.text || isTranslating) return;
    setIsTranslating(true);
    const translated = await translateToPersian(response.text);
    setContent(translated);
    setIsTranslating(false);
    setTtsAudioUrl(null); // Clear TTS if content changes
  };

  const handleListen = async () => {
    if (!content || isSpeaking) return;
    setIsSpeaking(true);
    const audioUrl = await generateTTS(content, selectedVoice, speakingRate);
    if (audioUrl) {
      setTtsAudioUrl(audioUrl);
    }
    setIsSpeaking(false);
  };

  const handleResetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setHueRotate(0);
    setRotation(0);
    setAspectRatio('auto');
    setActiveVisualPreset(VISUAL_PRESETS[0]);
  };

  useEffect(() => {
    handleResetFilters();
  }, [response?.id]);

  const handleCopyText = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.warn("Nexus Clipboard: Sync failed", err);
    }
  };

  const handleSaveTextFile = () => {
    if (!content) return;
    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nexus-reflection-${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("Nexus File Save: Sync failed", err);
    }
  };

  const handleSaveImage = () => {
    if (!response?.mediaUrl || response.mediaType !== 'image') return;
    setIsSaving(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return setIsSaving(false);
        const angleRad = (rotation * Math.PI) / 180;
        const absCos = Math.abs(Math.cos(angleRad));
        const absSin = Math.abs(Math.sin(angleRad));
        canvas.width = img.width * absCos + img.height * absSin;
        canvas.height = img.width * absSin + img.height * absCos;
        ctx.filter = `${activeVisualPreset.filter} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hueRotate}deg)`;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angleRad);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        const link = document.createElement('a');
        link.download = `nexus-reflection-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (e) {
        console.error("Nexus Image: Export failed", e);
      } finally {
        setIsSaving(false);
      }
    };
    img.onerror = () => {
      console.error("Nexus Image: Resource load failed");
      setIsSaving(false);
    };
    img.src = response.mediaUrl;
  };

  const handleUpscale = async () => {
    if (!onUpscale || isUpscaling) return;
    setIsUpscaling(true);
    try {
      await onUpscale();
    } catch (err) {
      console.error("Nexus Upscale: Sync failed", err);
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleFeedbackSubmit = () => {
    if (!response || !onFeedbackSubmit) return;
    onFeedbackSubmit(response.id, feedbackRating, feedbackComment);
    setIsFeedbackSubmitted(true);
    setShowFeedbackForm(false);
  };

  if (!content && !isTyping && !isTranslating) return null;

  const isAuthError = response?.id === 'auth_error';
  const isGeneralError = response?.id === 'error';
  const isError = isAuthError || isGeneralError;

  return (
    <div className="relative w-full max-w-2xl mx-auto mb-8 animate-in fade-in duration-700">
      <div className={`p-6 md:p-8 rounded-[3rem] bg-white/95 dark:bg-white/5 backdrop-blur-[40px] border ${isError ? 'border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 'border-black/10 dark:border-white/10'} shadow-[0_32px_128px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_128px_rgba(0,0,0,0.6)] transition-all duration-700 overflow-hidden`}>
        {(isTyping || isTranslating) && !content && (
          <div className="flex flex-col items-center gap-6 py-12 animate-pulse">
            <div className="flex gap-2">
              {[0, 0.2, 0.4].map(d => <div key={d} className="w-2 h-2 rounded-full bg-blue-500" style={{ animationDelay: `${d}s` }}></div>)}
            </div>
            <span className="text-[10px] uppercase tracking-[0.5em] text-blue-700 dark:text-blue-400 font-bold">
              {isTranslating ? "Nexus Recoding..." : "Nexus Synthesizing..."}
            </span>
          </div>
        )}

        {content && (
          <div className="space-y-8">
            <div className={`prose dark:prose-invert prose-p:leading-relaxed ${isError ? 'prose-p:text-red-700 dark:prose-p:text-red-300' : 'prose-p:text-black dark:prose-p:text-gray-100'} prose-p:font-normal prose-p:text-lg animate-materialize`} dir="auto">
              <ReactMarkdown>{typedContent}</ReactMarkdown>
            </div>

            {isAnimationComplete && isError && (
              <div className="flex flex-wrap items-center justify-center gap-4 pt-6 mt-4 border-t border-red-500/20 animate-in fade-in slide-in-from-bottom-2 duration-700">
                {onRetry && (
                  <button 
                    onClick={onRetry}
                    className="px-8 py-3 rounded-2xl bg-red-500 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-500/20 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    تلاش مجدد (Retry)
                  </button>
                )}
                <a 
                  href={`mailto:support@nexus.ai?subject=Neural Link Interruption Report&body=Neural Link Error Report:%0D%0A%0D%0A${encodeURIComponent(content)}`}
                  className="px-8 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-700 dark:text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-95 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  گزارش خطا (Report)
                </a>
              </div>
            )}

            {isAnimationComplete && !isError && (
              <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-black/10 dark:border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-1000">
                
                <div className="relative" ref={ttsMenuRef}>
                  <button 
                    onClick={() => setIsTtsMenuOpen(prev => !prev)}
                    disabled={isSpeaking}
                    className={`p-3 rounded-2xl bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-lg transition-all active:scale-95 flex items-center gap-2 ${isSpeaking ? 'text-blue-600 animate-pulse' : (ttsAudioUrl ? 'text-blue-500' : 'text-slate-800 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400')}`}
                    title="Audio Options"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                    <span className="text-[9px] uppercase tracking-widest font-bold">{isSpeaking ? 'در حال پخش' : 'شنیدن'}</span>
                  </button>

                  {isTtsMenuOpen && (
                    <div className="absolute bottom-full right-0 mb-3 w-72 bg-white/95 dark:bg-zinc-900/90 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[2rem] p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 z-20">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                          <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-600 dark:text-blue-400">تنظیمات فرکانس صوتی</h4>
                          <button onClick={() => setIsTtsMenuOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>

                        <div>
                          <label className="block text-[9px] uppercase tracking-widest text-slate-700 dark:text-gray-500 font-bold mb-3">انتخاب آگاهی (Voice Selection)</label>
                          <select 
                            value={selectedVoice} 
                            onChange={(e) => { setSelectedVoice(e.target.value); setTtsAudioUrl(null); }}
                            className="w-full p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                          >
                            <optgroup label="بهترین برای فارسی (Best for Persian)">
                              <option value="Kore">Kore (زن - آگاهی لطیف)</option>
                              <option value="Puck">Puck (مرد - آگاهی مقتدر)</option>
                            </optgroup>
                            <optgroup label="سایر فرکانس‌ها (Other Frequencies)">
                              <option value="Charon">Charon (مرد - حماسی و عمیق)</option>
                              <option value="Fenrir">Fenrir (زن - پرانرژی و مدرن)</option>
                              <option value="Zephyr">Zephyr (مرد - آرام و فیلسوف)</option>
                            </optgroup>
                          </select>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <label className="block text-[9px] uppercase tracking-widest text-slate-700 dark:text-gray-500 font-bold">سرعت انتقال (Neural Rate)</label>
                            <span className="text-[10px] font-mono text-blue-600">{speakingRate.toFixed(1)}x</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.5" 
                            max="1.5" 
                            step="0.1" 
                            value={speakingRate} 
                            onChange={(e) => { setSpeakingRate(parseFloat(e.target.value)); setTtsAudioUrl(null); }}
                            className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600"
                          />
                          <div className="flex justify-between text-[8px] font-bold text-gray-400 mt-2 uppercase tracking-tighter">
                            <span>آهسته</span>
                            <span>نرمال</span>
                            <span>سریع</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => { handleListen(); setIsTtsMenuOpen(false); }}
                          disabled={isSpeaking}
                          className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          تولید و پخش فرکانس
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className={`p-3 rounded-2xl bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-lg transition-all active:scale-95 flex items-center gap-2 ${isTranslating ? 'text-blue-600 animate-pulse' : 'text-slate-800 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400'}`}
                  title="Translate to Persian"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5c1.382 3.307 3.533 6.313 6.249 8.8"/></svg>
                  <span className="text-[9px] uppercase tracking-widest font-bold">ترجمه به فارسی</span>
                </button>

                <button 
                  onClick={handleCopyText}
                  className={`p-3 rounded-2xl bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-lg transition-all active:scale-95 flex items-center gap-2 ${copyFeedback ? 'text-green-600' : 'text-slate-800 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400'}`}
                  title="Copy to Clipboard"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                  <span className="text-[9px] uppercase tracking-widest font-bold">{copyFeedback ? 'کپی شد' : 'کپی'}</span>
                </button>

                <div className="relative" ref={shareMenuRef}>
                  <button 
                    onClick={() => setIsShareMenuOpen(prev => !prev)}
                    className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-lg text-slate-800 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400 transition-all active:scale-95"
                    title="Share Reflection"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                  </button>
                  {isShareMenuOpen && (
                    <div className="absolute bottom-full right-0 mb-3 w-56 bg-white/95 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 z-10">
                       <button onClick={() => { handleCopyText(); setIsShareMenuOpen(false); }} className="w-full flex items-center gap-4 px-4 py-2.5 text-left text-sm text-black dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
                         <svg className={`w-5 h-5 transition-colors ${copyFeedback ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                         <span>کپی بازتاب</span>
                       </button>
                       <button onClick={() => { handleSaveTextFile(); setIsShareMenuOpen(false); }} className="w-full flex items-center gap-4 px-4 py-2.5 text-left text-sm text-black dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
                         <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                         <span>ذخیره به صورت .txt</span>
                       </button>
                       <button onClick={() => { setShowFeedbackForm(true); setIsShareMenuOpen(false); }} className="w-full flex items-center gap-4 px-4 py-2.5 text-left text-sm text-black dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
                         <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                         <span>ارسال بازخورد</span>
                       </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isFeedbackSubmitted && (
              <div className="mt-4 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span className="text-xs text-green-700 dark:text-green-300 font-medium">سپاس از بازخورد شما. فرکانس‌های نکسوس با آگاهی شما تنظیم شد.</span>
              </div>
            )}

            {showFeedbackForm && !isFeedbackSubmitted && (
              <div className="mt-6 p-6 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-600 dark:text-blue-400">ارزیابی بازتاب نکسوس</h4>
                  <button onClick={() => setShowFeedbackForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-[9px] uppercase tracking-widest text-slate-700 dark:text-gray-500 font-bold">میزان رضایت (Rating)</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setFeedbackRating(star)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            feedbackRating >= star 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-110' 
                            : 'bg-black/5 dark:bg-white/5 text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'
                          }`}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-slate-700 dark:text-gray-500 font-bold mb-3">دیدگاه شما (اختیاری)</label>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="چگونه می‌توانیم این بازتاب را عمیق‌تر کنیم؟"
                      className="w-full p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none h-24"
                    />
                  </div>

                  <button
                    onClick={handleFeedbackSubmit}
                    disabled={feedbackRating === 0}
                    className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ثبت بازخورد عصبی
                  </button>
                </div>
              </div>
            )}

            {ttsAudioUrl && (
              <CustomAudioPlayer url={ttsAudioUrl} autoPlay />
            )}

            {response?.mediaUrl && (
              <div className="mt-6 space-y-6">
                <div className="rounded-[2rem] overflow-hidden border border-black/10 dark:border-white/10 bg-black/80 relative group shadow-2xl animate-in zoom-in-95 duration-1000">
                  {response.mediaType === 'image' && (
                    <div 
                      className="flex items-center justify-center bg-zinc-950 min-h-[400px] overflow-hidden p-4 relative transition-all duration-700"
                      style={{ aspectRatio: aspectRatio === 'auto' ? 'auto' : aspectRatio.replace(':', '/') }}
                    >
                      <img 
                        src={response.mediaUrl} 
                        style={{ 
                          filter: `${activeVisualPreset.filter} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hueRotate}deg)`, 
                          transform: `rotate(${rotation}deg)` 
                        }}
                        className={`max-w-full max-h-[75vh] transition-all duration-1000 rounded-2xl relative z-10 ${aspectRatio === 'auto' ? 'object-contain' : 'object-cover w-full h-full'}`} 
                        alt="Nexus Generation" 
                      />
                      {showShimmer && (
                        <div className="absolute inset-0 z-20 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer pointer-events-none"></div>
                      )}
                    </div>
                  )}
                  {response.mediaType === 'audio' && (
                    <CustomAudioPlayer url={response.mediaUrl} />
                  )}
                </div>

                {response.mediaType === 'image' && (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      {onUpscale && !response.id.startsWith('upscale-') && (
                        <button 
                          onClick={handleUpscale} 
                          disabled={isUpscaling} 
                          className={`flex-1 py-4 rounded-2xl border transition-all uppercase tracking-[0.2em] font-bold text-[10px] flex items-center justify-center gap-3 ${isUpscaling ? 'bg-blue-600/20 border-blue-500 text-blue-600 animate-pulse' : 'bg-blue-600/10 border-blue-500/30 text-blue-700 dark:text-blue-400 hover:bg-blue-600/20 hover:border-blue-500 shadow-lg shadow-blue-500/10'}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z"/></svg>
                          {isUpscaling ? 'Upscaling...' : 'ارتقای کیفیت به 2K (Upscale)'}
                        </button>
                      )}
                      <button 
                        onClick={() => setShowAestheticEngine(!showAestheticEngine)}
                        className={`py-4 px-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-700 dark:text-gray-400 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-3 ${onUpscale && !response.id.startsWith('upscale-') ? 'w-auto' : 'w-full'}`}
                      >
                        <svg className={`w-4 h-4 transition-transform duration-500 ${showAestheticEngine ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        {showAestheticEngine ? 'بستن تنظیمات' : 'تنظیمات بصری'}
                      </button>
                    </div>

                    {showAestheticEngine && (
                      <div className="p-8 bg-white/70 dark:bg-white/5 backdrop-blur-[20px] rounded-[2.5rem] border border-black/10 dark:border-white/10 space-y-10 animate-in fade-in slide-in-from-top-4 duration-700 shadow-xl">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-6">
                            <div className="flex flex-col">
                              <label className="text-[10px] uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400 font-bold">موتور زیبایی‌شناسی</label>
                              <span className="text-[8px] text-slate-700 dark:text-gray-500 uppercase tracking-widest mt-1">Refine your neural visualization</span>
                            </div>
                            <div className="flex gap-4 items-center">
                              <button 
                                onClick={handleResetFilters} 
                                className="p-2 text-slate-600 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                                title="Reset All Adjustments"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                              </button>
                              <button 
                                onClick={handleSaveImage} 
                                disabled={isSaving} 
                                className="text-[9px] text-slate-700 dark:text-gray-400 hover:text-blue-700 dark:hover:text-white transition-colors uppercase tracking-[0.2em] flex items-center gap-2"
                                title="Save Edited Image"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                {isSaving ? 'Saving...' : 'ذخیره'}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 pt-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] uppercase tracking-widest text-slate-700 dark:text-gray-500 font-bold">چرخش عصبی</span>
                                <span className="text-[9px] text-blue-700 dark:text-blue-400 font-mono">{rotation}°</span>
                              </div>
                              <input type="range" min="0" max="360" value={rotation} onChange={(e) => setRotation(parseInt(e.target.value))} className="w-full h-1 bg-black/20 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] uppercase tracking-widest text-slate-700 dark:text-gray-500 font-bold">طیف رنگی</span>
                                <span className="text-[9px] text-blue-700 dark:text-blue-400 font-mono">{hueRotate}°</span>
                              </div>
                              <input type="range" min="0" max="360" value={hueRotate} onChange={(e) => setHueRotate(parseInt(e.target.value))} className="w-full h-1 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 rounded-full appearance-none cursor-pointer accent-white dark:accent-white" />
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] uppercase tracking-widest text-slate-700 dark:text-gray-500 font-bold">تابش هسته</span>
                                <span className="text-[9px] text-blue-700 dark:text-blue-400 font-mono">{brightness}%</span>
                              </div>
                              <input type="range" min="0" max="200" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} className="w-full h-1 bg-black/20 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] uppercase tracking-widest text-slate-700 dark:text-gray-500 font-bold">تضاد رنگی</span>
                                <span className="text-[9px] text-blue-700 dark:text-blue-400 font-mono">{contrast}%</span>
                              </div>
                              <input type="range" min="0" max="200" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} className="w-full h-1 bg-black/20 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] uppercase tracking-widest text-slate-700 dark:text-gray-500 font-bold">غلظت رنگ</span>
                                <span className="text-[9px] text-blue-700 dark:text-blue-400 font-mono">{saturation}%</span>
                              </div>
                              <input type="range" min="0" max="200" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value))} className="w-full h-1 bg-black/20 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            <div className="space-y-3 col-span-full">
                              <div className="flex justify-between items-center px-1 mb-2">
                                <span className="text-[9px] uppercase tracking-widest text-slate-700 dark:text-gray-500 font-bold">پیش‌فرض‌های بصری</span>
                                <span className="text-[9px] text-blue-700 dark:text-blue-400 font-mono uppercase">{activeVisualPreset.name}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {VISUAL_PRESETS.map((preset) => (
                                  <button
                                    key={preset.id}
                                    onClick={() => setActiveVisualPreset(preset)}
                                    className={`px-4 py-2 rounded-xl text-[9px] uppercase tracking-widest border transition-all ${
                                      activeVisualPreset.id === preset.id 
                                      ? 'bg-blue-600/20 border-blue-500 text-blue-700 dark:text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
                                      : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-600 dark:text-gray-500 hover:border-black/20 dark:hover:border-white/20'
                                    }`}
                                  >
                                    {preset.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-3 col-span-full">
                              <div className="flex justify-between items-center px-1 mb-2">
                                <span className="text-[9px] uppercase tracking-widest text-slate-700 dark:text-gray-500 font-bold">نسبت ابعاد</span>
                                <span className="text-[9px] text-blue-700 dark:text-blue-400 font-mono uppercase">{aspectRatio}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {['auto', '1:1', '4:3', '3:2', '16:9', '21:9', '9:16'].map((ratio) => (
                                  <button
                                    key={ratio}
                                    onClick={() => setAspectRatio(ratio)}
                                    className={`px-4 py-2 rounded-xl text-[9px] uppercase tracking-widest border transition-all ${
                                      aspectRatio === ratio 
                                      ? 'bg-blue-600/20 border-blue-500 text-blue-700 dark:text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
                                      : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-600 dark:text-gray-500 hover:border-black/20 dark:hover:border-white/20'
                                    }`}
                                  >
                                    {ratio === 'auto' ? 'اصلی' : ratio}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiResponsePanel;
