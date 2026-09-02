import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Sparkles,
  LogOut,
  X,
  Volume2,
  VolumeX,
  Save,
  Crown,
  Sliders,
  RotateCcw,
  Pencil,
} from 'lucide-react';
import { useAuth, ADMIN_EMAILS } from '../context/AuthContext';
import { AvatarSelector } from './AvatarSelector';
import { AvatarRenderer } from './AvatarRenderer';
import { AdminPanel } from './AdminPanel';
import { soundManager } from '../utils/soundEffects';
import { NgipBadge, NgipName } from './NgipBadge';

export const ProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}> = ({
  isOpen,
  onClose,
}) => {
  const {
    user,
    isAdmin,
    isNgip,
    logout,
    updateAvatar,
    updateUsername,
    overrideStats,
    unlockAllAchievements,
    resetUserStats,
  } = useAuth();

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);

  useEffect(() => {
    if (user) {
      setNameInput(user.username);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = nameInput.trim();
    if (clean && clean !== user.username) {
      updateUsername(clean);
      soundManager.playCorrect();
      setSaveSuccessMsg('Username updated!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
    setIsEditingName(false);
  };

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const safeGamesPlayed = Math.max(
    user.stats.gamesPlayed || 0,
    user.stats.wins || 0
  );

  const losses = typeof user.stats.losses === 'number'
    ? user.stats.losses
    : Math.max(0, safeGamesPlayed - (user.stats.wins || 0));

  const winRate =
    safeGamesPlayed > 0
      ? Math.round(((user.stats.wins || 0) / safeGamesPlayed) * 100)
      : 0;

  const xpPercent = Math.min(100, Math.round(((user.xp % 600) / 600) * 100));
  const currentLevelXp = user.xp % 600;

  const isOwnerAdmin = Boolean(
    isAdmin ||
    (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim()))
  );

  return (
    <>
      <div
        id="profile-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
        onClick={onClose}
      >
        <div
          id="profile-modal-container"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Player Profile
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {saveSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
              {saveSuccessMsg}
            </div>
          )}

          {/* Identity Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker((prev) => !prev)}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-indigo-500/40 hover:border-indigo-500 transition-all cursor-pointer shadow-sm relative group"
                  style={{ backgroundColor: `${user.color}25` }}
                >
                  <AvatarRenderer avatar={user.avatar} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                    Change
                  </div>
                </button>
              </div>

              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      maxLength={24}
                      autoFocus
                      className="flex-1 px-2.5 py-1 text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter new username"
                    />
                    <button
                      type="submit"
                      className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title="Save Username"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNameInput(user.username);
                        setIsEditingName(false);
                      }}
                      className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <NgipName
                      name={user.username}
                      isNgip={Boolean(user.isNgip || isAdmin)}
                      className="text-base font-extrabold text-slate-900 dark:text-white truncate"
                    />
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Edit Name"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {Boolean(user.isNgip || isAdmin) && <NgipBadge size="xs" />}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                      Level {user.level || 1}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-slate-400 truncate">
                    {user.email || 'Cloud Synced Player'}
                  </p>
                  {isOwnerAdmin && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black border border-amber-500/30">
                      <Crown className="w-2.5 h-2.5" />
                      <span>Owner Admin</span>
                    </span>
                  )}
                </div>

                {/* XP Progress Bar */}
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                    <span>Level Progression</span>
                    <span>{currentLevelXp} / 600 XP</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Avatar Picker Accordion */}
          {showAvatarPicker && (
            <div className="p-4 bg-slate-900/95 border border-indigo-500/30 rounded-2xl space-y-3 animate-scale-in text-white">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-200">
                  Select Avatar or Upload Custom Picture:
                </p>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <AvatarSelector
                value={user.avatar}
                onChange={(newAvatar) => {
                  updateAvatar(newAvatar);
                }}
                compact={true}
              />
            </div>
          )}

          {/* Audio Settings */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Sound Effects & Audio
                </p>
                <p className="text-[10px] text-slate-400">
                  {isMuted ? 'Muted (Audio Off)' : 'Active (SFX & Audio On)'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSound}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isMuted
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  : 'bg-indigo-600 text-white shadow-xs'
              }`}
            >
              {isMuted ? 'Turn Sound On' : 'Turn Sound Off'}
            </button>
          </div>

          {/* OWNER ADMIN MANAGEMENT SECTION */}
          {isOwnerAdmin && (
            <div className="p-4 bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-indigo-500/10 dark:from-amber-950/40 dark:via-purple-950/40 dark:to-indigo-950/40 rounded-2xl border-2 border-amber-400/60 dark:border-amber-600/60 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-amber-500 text-white shadow-xs">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Owner Admin Management</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold uppercase">
                        Exclusive
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      User management, master stats reset & VIP controls
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdminModal(true)}
                  className="px-2.5 py-1 rounded-xl text-xs font-black text-white bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Full Admin Panel</span>
                </button>
              </div>

              {/* Quick Stats booster & Reset buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    overrideStats(
                      { totalScore: (user.stats.totalScore || 0) + 100000, wins: (user.stats.wins || 0) + 50 },
                      100,
                      60000
                    );
                    unlockAllAchievements();
                    soundManager.playCorrect();
                    setSaveSuccessMsg('Level 100 VIP + All Badges Activated!');
                    setTimeout(() => setSaveSuccessMsg(null), 3000);
                  }}
                  className="py-1.5 px-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 text-amber-900 dark:text-amber-200 text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Crown className="w-3 h-3 text-amber-600" />
                  <span>Boost Lvl 100 & Badges</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset all your stats to zero?')) {
                      resetUserStats();
                      soundManager.playCorrect();
                      setSaveSuccessMsg('Career stats reset to 0.');
                      setTimeout(() => setSaveSuccessMsg(null), 3000);
                    }
                  }}
                  className="py-1.5 px-2 rounded-lg bg-rose-100 dark:bg-rose-950/50 hover:bg-rose-200 text-rose-800 dark:text-rose-300 text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset My Stats to 0</span>
                </button>
              </div>
            </div>
          )}

          {/* Lifetime Career Stats Grid */}
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Career Records & Win/Loss Count
            </p>
            <div className="grid grid-cols-3 gap-2">
              {/* Wins */}
              <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
                <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {user.stats.wins || 0}
                </p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase">Wins</p>
              </div>

              {/* Losses */}
              <div className="p-2.5 bg-rose-50/60 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-800 text-center">
                <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                  {losses}
                </p>
                <p className="text-[10px] text-rose-700 dark:text-rose-300 font-bold uppercase">Losses</p>
              </div>

              {/* Games Played */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
                <p className="text-base sm:text-lg font-black text-slate-700 dark:text-slate-300">
                  {safeGamesPlayed}
                </p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Total Games</p>
              </div>

              {/* Total Points */}
              <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-center">
                <p className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {user.stats.totalScore.toLocaleString()}
                </p>
                <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold uppercase">Points</p>
              </div>

              {/* Win Rate */}
              <div className="p-2.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 text-center">
                <p className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
                  {winRate}%
                </p>
                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase">Win Rate</p>
              </div>

              {/* Words Guessed */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
                <p className="text-base sm:text-lg font-black text-slate-700 dark:text-slate-300">
                  {user.stats.wordsGuessed || 0}
                </p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Guessed</p>
              </div>
            </div>
          </div>

          {/* Badges & Achievements */}
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Unlocked Achievements
            </p>
            <div className="flex flex-wrap gap-2">
              {user.unlockedBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Logout */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Panel Modal launched from Profile */}
      {showAdminModal && <AdminPanel onClose={() => setShowAdminModal(false)} />}
    </>
  );
};
