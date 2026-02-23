
import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
  syncScore?: number;
}

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ isOpen, onClose, profile, onUpdate, syncScore = 0 }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Nexus: Camera access failed", err);
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        // Here we could update the profile with the image if UserProfile had a photo field
        // For now, let's just log it or add it to interests as a placeholder
        console.log("Nexus: Captured photo", dataUrl);
        stopCamera();
      }
    }
  };

  const handleChange = (field: keyof UserProfile, value: string) => {
    onUpdate({ ...profile, [field]: value });
  };

  // Fix: Ensure syncScore is treated as a number
  const syncPercent = Math.min(100, (syncScore || 0) * 5);

  const resetProfile = () => {
    if (window.confirm("آیا از بازنشانی تنظیمات نکسوس اطمینان دارید؟ (Reset Core Settings?)")) {
      // Fix: Added themePreference which is a required property of UserProfile
      onUpdate({ 
        name: '', 
        languagePreference: 'auto', 
        tonePreference: 'poetic', 
        themePreference: profile.themePreference,
        interests: '',
        imageSize: '1K',
        aspectRatio: '1:1',
        imageStyle: 'cinematic'
      });
    }
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />
      
      <div className={`fixed top-0 left-0 bottom-0 w-80 bg-zinc-950/90 backdrop-blur-3xl border-r border-white/10 z-50 transform transition-transform duration-500 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold tracking-[0.2em] text-white uppercase">Neural Core</h2>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">✕</button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">Sync Level</span>
                <span className="text-[10px] text-gray-400 font-mono">{syncPercent}%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000"
                  style={{ width: `${syncPercent}%` }}
                />
              </div>
              <p className="text-[8px] text-gray-600 uppercase tracking-[0.2em] animate-pulse">Neural link established</p>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto py-8 px-6 space-y-8 scrollbar-hide">
            <div className="space-y-4">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block">Neural Identity Capture</label>
              <div className="relative w-full aspect-video bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center group">
                {isCapturing ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                      <button onClick={capturePhoto} className="px-4 py-2 bg-blue-600 text-white rounded-full text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-blue-600/20">Capture</button>
                      <button onClick={stopCamera} className="px-4 py-2 bg-white/10 text-white rounded-full text-[10px] uppercase tracking-widest font-bold backdrop-blur-md">Cancel</button>
                    </div>
                  </>
                ) : (
                  <button 
                    onClick={startCamera}
                    className="flex flex-col items-center gap-3 text-gray-500 group-hover:text-blue-400 transition-colors"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="text-[10px] uppercase tracking-widest">Initialize Camera</span>
                  </button>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block">Subject Identity</label>
              <input 
                type="text" 
                value={profile.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all font-light text-sm"
                placeholder="Name..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block">Core Language</label>
              <select 
                value={profile.languagePreference}
                onChange={(e) => handleChange('languagePreference', e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all font-light text-sm appearance-none"
              >
                <option value="auto">Auto-Detect</option>
                <option value="fa">Persian (فارسی)</option>
                <option value="en">English (انگلیسی)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block">Neural Tone</label>
              <div className="grid grid-cols-2 gap-2">
                {['poetic', 'visionary', 'analytical', 'casual'].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleChange('tonePreference', t as any)}
                    className={`px-3 py-2 rounded-lg text-[9px] uppercase tracking-widest border transition-all ${
                      profile.tonePreference === t 
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.2)]' 
                      : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block">Visual Resolution (Image Size)</label>
              <div className="grid grid-cols-3 gap-2">
                {['1K', '2K', '4K'].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleChange('imageSize', size as any)}
                    className={`px-3 py-2 rounded-lg text-[9px] uppercase tracking-widest border transition-all ${
                      profile.imageSize === size 
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)]' 
                      : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block">Visual Aspect Ratio</label>
              <div className="grid grid-cols-5 gap-1">
                {['1:1', '3:4', '4:3', '9:16', '16:9'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => handleChange('aspectRatio', ratio as any)}
                    className={`px-1 py-2 rounded-lg text-[8px] uppercase tracking-tighter border transition-all ${
                      profile.aspectRatio === ratio 
                      ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.2)]' 
                      : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block">Visual Style Preset</label>
              <select 
                value={profile.imageStyle}
                onChange={(e) => handleChange('imageStyle', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all font-light text-sm appearance-none"
              >
                <option value="cinematic">Cinematic</option>
                <option value="digital art">Digital Art</option>
                <option value="photorealistic">Photorealistic</option>
                <option value="anime">Anime</option>
                <option value="oil painting">Oil Painting</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="minimalist">Minimalist</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block">Nexus Directives</label>
              <textarea 
                value={profile.interests}
                onChange={(e) => handleChange('interests', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-all font-light text-sm h-32 resize-none leading-relaxed"
                placeholder="Describe your goals, interests, or how the AI should treat you..."
              />
            </div>

            <button 
              onClick={resetProfile}
              className="w-full py-3 rounded-xl border border-red-500/20 text-red-500/50 text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition-all"
            >
              Reset Core Settings
            </button>
          </div>
          
          <div className="p-6 border-t border-white/5 bg-black/40">
            <p className="text-[10px] text-center text-gray-600 uppercase tracking-widest">Nexus Neural Memory v2.1</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileDrawer;
