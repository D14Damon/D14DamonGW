import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  UserPlus,
  LogIn,
  ArrowRight,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { useAuth, COLOR_OPTIONS } from '../context/AuthContext';
import { PRESET_AVATARS } from '../utils/avatarIcons';
import { soundManager } from '../utils/soundEffects';
import { themeMusic } from '../utils/themeMusic';
import { AvatarSelector } from './AvatarSelector';
import { AvatarRenderer } from './AvatarRenderer';
import { GWLogo } from './GWLogo';
import { DarkModeToggle } from './DarkModeToggle';

interface WelcomeAuthGateProps {
  onEnter: () => void;
}

export const WelcomeAuthGate: React.FC<WelcomeAuthGateProps> = ({ onEnter }) => {
  const {
    user,
    loginWithFirebaseGoogle,
    loginWithFirebaseEmail,
    registerWithFirebaseEmail,
    isFirebaseConnected,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register');

  // Form states
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].id);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startThemeAndEnter = () => {
    themeMusic.start();
    onEnter();
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      if (activeTab === 'login') {
        await loginWithFirebaseEmail(email, password);
      } else {
        await registerWithFirebaseEmail(
          email,
          password,
          username.trim() || email.split('@')[0],
          selectedAvatar,
          selectedColor
        );
      }
      soundManager.playVictory();
      startThemeAndEnter();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please verify your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await loginWithFirebaseGoogle();
      soundManager.playVictory();
      startThemeAndEnter();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Google authentication was cancelled or failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithSaved = () => {
    soundManager.playCorrectGuess();
    startThemeAndEnter();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900 text-slate-100 relative overflow-hidden font-sans select-none">
      {/* Refined Ambient Glow & Dynamic Cyber Grids */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(15,23,42,1))] pointer-events-none" />
      <div className="absolute -top-32 left-1/4 w-[500px] sm:w-[700px] h-[400px] bg-purple-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-[450px] sm:w-[600px] h-[350px] bg-indigo-600/15 rounded-full blur-[110px] pointer-events-none" />

      {/* Cyber Grid Accent */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Floating Header Actions */}
      <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20 flex items-center gap-2">
        <DarkModeToggle />
      </div>

      {/* Main Clean Centered Console */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md max-h-[96vh] flex flex-col rounded-3xl bg-slate-900/90 backdrop-blur-2xl border border-purple-900/40 shadow-2xl shadow-purple-950/50 relative z-10 overflow-hidden p-5 sm:p-7 space-y-4"
      >
        {/* Brand Header */}
        <div className="flex justify-center pb-1">
          <GWLogo size="md" showText={true} />
        </div>

        {/* Top Quick Actions */}
        <div className="space-y-3.5">
          {/* Google Authentication Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-2.5 sm:py-3 px-4 rounded-2xl font-black text-xs sm:text-sm text-slate-900 bg-white hover:bg-slate-100 disabled:opacity-60 transition-all shadow-md shadow-white/10 flex items-center justify-center gap-2.5 border border-slate-200 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Connect with Gmail / Google</span>
          </motion.button>

          {/* Subtle Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-slate-800" />
            <span className="absolute px-3 bg-slate-900 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              or with email
            </span>
          </div>

          {/* Segmented 2-Way Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                soundManager.playTick();
              }}
              className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center truncate ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Register</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                soundManager.playTick();
              }}
              className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center truncate ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Sign In</span>
            </button>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {/* Active Session Quick Resume Card */}
          {user && (
            <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-800/50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 text-xs min-w-0">
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-800 border border-purple-600/40 flex items-center justify-center shrink-0">
                  <AvatarRenderer avatar={user.avatar} className="w-full h-full object-cover" />
                </div>
                <div className="truncate">
                  <span className="font-black text-white block leading-tight truncate">
                    {user.username}
                  </span>
                  <span className="text-purple-300 text-[10px]">Saved Profile Active</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleContinueWithSaved}
                className="px-3 py-1.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-sm flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
              >
                <span>Resume</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB: REGISTER */}
          {/* ============================================================= */}
          {activeTab === 'register' && (
            <motion.form
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleEmailAuth}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <label className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  <span>Player Gamer Tag</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. MasterGamer"
                  maxLength={20}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-semibold placeholder-slate-500 text-xs transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-semibold placeholder-slate-500 text-xs transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-semibold placeholder-slate-500 text-xs transition-colors pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Avatar Selection */}
              <div className="space-y-1.5 pt-0.5">
                <label className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Choose Battle Avatar</span>
                </label>
                <AvatarSelector
                  value={selectedAvatar}
                  onChange={setSelectedAvatar}
                  compact={true}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{loading ? 'Registering Account...' : 'Create Account & Play'}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.form>
          )}

          {/* ============================================================= */}
          {/* TAB: SIGN IN */}
          {/* ============================================================= */}
          {activeTab === 'login' && (
            <motion.form
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleEmailAuth}
              className="space-y-3.5 text-xs"
            >
              <div className="space-y-1">
                <label className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-semibold placeholder-slate-500 text-xs transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-semibold placeholder-slate-500 text-xs transition-colors pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{loading ? 'Signing In...' : 'Sign In & Enter Arcade'}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.form>
          )}
        </div>
      </motion.div>
    </div>
  );
};