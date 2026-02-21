
import React from 'react';

interface TerminalHeaderProps {
  onMenuClick?: () => void;
  onProfileClick?: () => void;
  theme: 'light' | 'dark';
  onThemeToggle?: () => void;
}

const TerminalHeader: React.FC<TerminalHeaderProps> = ({ onMenuClick, onProfileClick, theme, onThemeToggle }) => {
  return (
    <div className="w-full relative py-3 mb-6 select-none">
      <div className="flex items-center justify-between">
        
        {/* Left: Status Badge & Theme Toggle */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-md">
            <span className="text-[10px] font-bold tracking-widest text-blue-400">LIVE</span>
          </div>
          
          {/* Theme Toggle Switch */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold tracking-tighter text-gray-500 uppercase hidden sm:inline">
              {theme === 'dark' ? 'Neural' : 'Solar'}
            </span>
            <button 
              onClick={onThemeToggle}
              className={`relative w-12 h-6 rounded-full transition-all duration-500 border border-black/10 dark:border-white/10 flex items-center px-1 ${
                theme === 'dark' ? 'bg-blue-600/20' : 'bg-amber-500/20'
              }`}
              title="Toggle Neural/Solar Mode"
            >
              <div 
                className={`absolute w-4 h-4 rounded-full transition-all duration-500 flex items-center justify-center shadow-lg ${
                  theme === 'dark' 
                    ? 'translate-x-6 bg-blue-500 shadow-blue-500/50' 
                    : 'translate-x-0 bg-amber-500 shadow-amber-500/50'
                }`}
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5 text-white">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5 text-white">
                    <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                  </svg>
                )}
              </div>
            </button>
          </div>

          <button 
            onClick={onProfileClick}
            className="p-2 rounded-full bg-white/5 border border-black/10 dark:border-white/10 text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-95"
            title="Profile Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </button>
        </div>

        {/* Right: Brand Identity & Menu */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end cursor-default">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-[0.2em] text-black dark:text-white leading-none">
                NEXUS
              </h1>
            </div>
            <p className="text-[8px] tracking-[0.15em] text-gray-500 uppercase font-light mt-1">
              Neural Synchronization
            </p>
          </div>
          
          <button 
            onClick={onMenuClick}
            className="p-2.5 rounded-xl bg-white/5 border border-black/10 dark:border-white/10 text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TerminalHeader;
