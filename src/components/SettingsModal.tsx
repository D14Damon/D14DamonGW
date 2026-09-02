import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  X,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Music,
  Sliders,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { themeMusic, ThemeMusicState } from '../utils/themeMusic';
import { soundManager } from '../utils/soundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'general' | 'audio';
  onOpenAuthGate?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'general',
}) => {
  const { darkMode, toggleDarkMode } = useAuth();

  const [activeTab, setActiveTab] = useState<'general' | 'audio'>(initialTab);
  const [musicState, setMusicState] = useState<ThemeMusicState>(themeMusic.getState());
  const [isSfxMuted, setIsSfxMuted] = useState(soundManager.getMuted());
  const [musicVolume, setMusicVolume] = useState<number>(musicState.volume);

  useEffect(() => {
    const unsub = themeMusic.subscribe((st) => {
      setMusicState(st);
      setMusicVolume(st.volume);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsSfxMuted(soundManager.getMuted());
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleToggleSfx = () => {
    const nextMuted = soundManager.toggleMute();
    setIsSfxMuted(nextMuted);
    if (!nextMuted) {
      soundManager.playCorrect();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMusicVolume(val);
    themeMusic.setVolume(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-purple-900/60 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <SettingsIcon className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-none">
                Application Settings
              </h3>
              <p className="text-xs text-slate-500 dark:text-purple-300 font-bold mt-1">
                Theme, Visuals & Audio Controls
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 pt-3 border-b border-slate-200 dark:border-slate-800 gap-1 bg-slate-100/60 dark:bg-slate-950/40 overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 text-xs font-black rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'general'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Appearance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`px-4 py-2 text-xs font-black rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'audio'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Audio & Music</span>
            {musicState.isPlaying && (
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
            )}
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: APPEARANCE */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                      {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Theme Mode
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {darkMode ? 'Dark Gothic Theme Active' : 'Light Clean Mode'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleDarkMode()}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      darkMode
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {darkMode ? 'Switch to Light' : 'Switch to Dark'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIO & MUSIC */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              {/* Background Music Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400">
                      <Music className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Background Soundtrack
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Lofi synthwave retro arcade soundtrack
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => themeMusic.toggle()}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      musicState.isPlaying
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-pink-600 text-white shadow-xs'
                    }`}
                  >
                    {musicState.isPlaying ? 'Pause Music' : 'Play Music'}
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500">
                    <span>Music Volume</span>
                    <span>{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={musicVolume}
                    onChange={handleVolumeChange}
                    className="w-full accent-pink-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Sound Effects Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    {isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Gameplay Sound Effects (SFX)
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Drawing strokes, ticking timers, buzzer alerts & win chimes
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleSfx}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSfxMuted
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      : 'bg-indigo-600 text-white shadow-xs'
                  }`}
                >
                  {isSfxMuted ? 'Muted (Off)' : 'Active (On)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
