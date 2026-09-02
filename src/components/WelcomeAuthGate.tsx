import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  UserPlus,
  LogIn,
  Shield,
  ArrowRight,
  Check,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  Zap,
  Gamepad2,
  Globe,
  Upload,
  Camera,
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

  const [activeTab, setActiveTab] = useState<'register' | 'login' | 'continue'>(
    user ? 'continue' : 'register'
  );

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
          username || email.split('@')[0],
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

  const handleContinueAsGuest = () => {
    soundManager.playCorrectGuess();
    startThemeAndEnter();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden font-sans select-none transition-colors duration-200">
      {/* Refined Ambient Glow Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-100/80 via-slate-100 to-slate-100 dark:from-indigo-950/40 dark:via-slate-950 dark:to-slate-950 pointer-events-none transition-colors duration-200" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-[500px] h-[400px] bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Subtle Grid Accent */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <DarkModeToggle />
      </div>

      {/* Main Authentication Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-[460px] bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl dark:shadow-black/80 relative z-10 space-y-5 transition-colors duration-200"
      >
        {/* Brand Header */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <div className="flex items-center justify-center pt-1">
            <GWLogo size="lg" showText={true} />
          </div>

          <div className="pt-0.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              By <span className="text-amber-500 dark:text-amber-400 font-bold">D14Dąmon</span>
            </span>
          </div>
        </div>

        {/* Google Authentication Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-900 bg-white hover:bg-slate-50 dark:bg-white dark:hover:bg-slate-100 disabled:opacity-60 transition-all shadow-sm flex items-center justify-center gap-3 border border-slate-200 cursor-pointer"
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
          <span>Continue with Google</span>
        </motion.button>

        {/* Minimal Divider */}
        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          <span className="absolute px-3 bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            or with email
          </span>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              soundManager.playTick();
            }}
            className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              soundManager.playTick();
            }}
            className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {/* Active Session Quick Resume */}
        {user && activeTab !== 'continue' && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <AvatarRenderer avatar={user.avatar} className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white block leading-tight">{user.username}</span>
                <span className="text-slate-500 dark:text-slate-400 text-[10px]">Active account</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleContinueWithSaved}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Resume</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* CREATE ACCOUNT FORM */}
        {activeTab === 'register' && (
          <motion.form
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleEmailAuth}
            className="space-y-3.5 text-xs"
          >
            {/* Player Username */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                <User className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Player Username</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. MasterGamer"
                maxLength={20}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/80 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium placeholder-slate-400 dark:placeholder-slate-500 text-xs transition-colors"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                <Mail className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/80 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium placeholder-slate-400 dark:placeholder-slate-500 text-xs transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                <Lock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/80 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium placeholder-slate-400 dark:placeholder-slate-500 text-xs transition-colors pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Avatar Selector */}
            <div className="space-y-1.5 pt-0.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                <Camera className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Custom Profile Photo (Optional)</span>
              </label>
              <AvatarSelector
                value={selectedAvatar}
                onChange={setSelectedAvatar}
                compact={true}
              />
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Creating Account...' : 'Create Account & Play'}</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.form>
        )}

        {/* SIGN IN FORM */}
        {activeTab === 'login' && (
          <motion.form
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleEmailAuth}
            className="space-y-3.5 text-xs"
          >
            {/* Email Address */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                <Mail className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/80 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium placeholder-slate-400 dark:placeholder-slate-500 text-xs transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                <Lock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/80 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium placeholder-slate-400 dark:placeholder-slate-500 text-xs transition-colors pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Signing In...' : 'Sign In & Enter Arcade'}</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
};


