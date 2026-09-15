import React from 'react';
import { motion } from 'motion/react';
import { Coins, Sparkles, Shield, Crown } from 'lucide-react';
import { Lucky9Chip } from './Lucky9Chip';

export type FeltTheme = 'emerald' | 'burgundy' | 'midnight';

interface Lucky9TableFeltProps {
  theme?: FeltTheme;
  potAmount: number;
  isDealing: boolean;
  roundStatus: string;
  roundWinner?: string | null;
  children: React.ReactNode;
  onThemeChange?: (theme: FeltTheme) => void;
}

export const Lucky9TableFelt: React.FC<Lucky9TableFeltProps> = ({
  theme = 'emerald',
  potAmount,
  isDealing,
  roundStatus,
  roundWinner,
  children,
  onThemeChange,
}) => {
  const themeStyles = {
    emerald: {
      feltBg: 'bg-radial from-emerald-800 via-emerald-950 to-[#041d13]',
      railBorder: 'border-amber-700/60',
      railBg: 'bg-[#1b140c]',
      goldText: 'text-amber-300/60',
      accentGlow: 'from-amber-400/10 via-emerald-500/5 to-transparent',
    },
    burgundy: {
      feltBg: 'bg-radial from-rose-950 via-[#2d0a14] to-[#120206]',
      railBorder: 'border-amber-600/60',
      railBg: 'bg-[#1e0e0a]',
      goldText: 'text-amber-300/60',
      accentGlow: 'from-amber-400/10 via-rose-500/5 to-transparent',
    },
    midnight: {
      feltBg: 'bg-radial from-slate-900 via-indigo-950 to-[#050814]',
      railBorder: 'border-indigo-600/50',
      railBg: 'bg-[#0b0f19]',
      goldText: 'text-indigo-300/60',
      accentGlow: 'from-blue-400/10 via-indigo-500/5 to-transparent',
    },
  }[theme];

  return (
    <div className="relative w-full rounded-[32px] p-2 sm:p-3 bg-gradient-to-b from-stone-900 via-amber-950 to-stone-950 shadow-2xl border-4 border-amber-800/65">
      {/* Padded Leather Rail (Casino Armrest border with brass stitching) */}
      <div className="absolute inset-1 rounded-[28px] border-2 border-amber-500/30 pointer-events-none" />

      {/* Main Felt Surface */}
      <div
        className={`relative w-full rounded-[24px] ${themeStyles.feltBg} border-2 border-amber-600/40 p-3 sm:p-6 flex flex-col justify-between min-h-[560px] overflow-hidden shadow-inner`}
      >
        {/* Realistic Woven Felt Texture Simulation */}
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
        
        {/* Overhead Warm Casino Table Spotlight effect */}
        <div
          className={`absolute inset-0 bg-radial ${themeStyles.accentGlow} pointer-events-none`}
        />

        {/* Silkscreened Casino Felt Inscriptions & Arc Markings */}
        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center opacity-40 select-none">
          {/* Semicircular Gold Arc */}
          <div className="w-72 sm:w-96 md:w-[480px] h-36 sm:h-48 border-t-2 border-amber-400/50 rounded-t-full flex items-start justify-center pt-2" />
          <div className="text-[10px] sm:text-xs font-serif font-black tracking-[0.3em] uppercase text-amber-300/60 -mt-36 sm:-mt-48 text-center">
            ★ LUCKY 9 CASINO CLUB ★
          </div>
          <div className="text-[8px] sm:text-[9px] font-mono tracking-widest uppercase text-amber-400/40 mt-1">
            NATURAL 9 BEATS ALL • STAND ON 6 OR 7 • HIT ON 0-4
          </div>
        </div>

        {/* Felt Theme Selector on Top Right */}
        {onThemeChange && (
          <div className="absolute top-2.5 right-3 z-30 flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-xl border border-amber-500/20 text-[10px]">
            <span className="text-slate-400 font-sans hidden sm:inline">Felt:</span>
            <button
              onClick={() => onThemeChange('emerald')}
              className={`w-3.5 h-3.5 rounded-full bg-emerald-600 border ${
                theme === 'emerald' ? 'border-amber-400 scale-110 shadow-xs' : 'border-transparent opacity-60'
              }`}
              title="Casino Emerald"
            />
            <button
              onClick={() => onThemeChange('burgundy')}
              className={`w-3.5 h-3.5 rounded-full bg-rose-900 border ${
                theme === 'burgundy' ? 'border-amber-400 scale-110 shadow-xs' : 'border-transparent opacity-60'
              }`}
              title="Royal Burgundy"
            />
            <button
              onClick={() => onThemeChange('midnight')}
              className={`w-3.5 h-3.5 rounded-full bg-indigo-900 border ${
                theme === 'midnight' ? 'border-amber-400 scale-110 shadow-xs' : 'border-transparent opacity-60'
              }`}
              title="Midnight Blue"
            />
          </div>
        )}

        {/* Content Children */}
        {children}
      </div>
    </div>
  );
};
