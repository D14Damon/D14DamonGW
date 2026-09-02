import React, { useState } from 'react';
import {
  Shield,
  Crown,
  Users,
  Search,
  Sparkles,
  Zap,
  RotateCcw,
  CheckCircle2,
  Lock,
  X,
  Edit3,
  Flame,
  Activity,
  AlertTriangle,
  Award,
  Radio,
  BarChart3,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfile, PlayerStats } from '../types';
import { AvatarRenderer } from './AvatarRenderer';
import { NgipBadge, NgipName } from './NgipBadge';
import { soundManager } from '../utils/soundEffects';

interface AdminPanelProps {
  onClose: () => void;
  publicRooms?: { id: string; name: string; playersCount: number; maxPlayers: number; status: string }[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, publicRooms = [] }) => {
  const {
    user,
    allRegisteredUsers,
    toggleUserNgip,
    adminOverrideOtherUserStats,
    resetAllUsersStats,
    adminDeleteUser,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'ngip_perks' | 'server'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState<'all' | 'ngip' | 'admins'>('all');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Master Reset All confirmation modal state
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);

  // Single User Edit Modal state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserLevel, setEditUserLevel] = useState<string>('1');
  const [editUserScore, setEditUserScore] = useState<string>('0');
  const [editUserWins, setEditUserWins] = useState<string>('0');
  const [editUserMatches, setEditUserMatches] = useState<string>('0');

  // Filter accounts
  const allAccountsList = allRegisteredUsers.length > 0 ? allRegisteredUsers : user ? [user] : [];
  const filteredAccounts = allAccountsList.filter((acc) => {
    const matchesSearch =
      acc.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.email && acc.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (accountFilter === 'ngip') return Boolean(acc.isNgip || acc.isAdmin);
    if (accountFilter === 'admins') return Boolean(acc.isAdmin);
    return true;
  });

  const notify = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusMessage({ text, type });
    if (type === 'success') {
      soundManager.playCorrect();
    } else {
      soundManager.playTick();
    }
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  const handleToggleNgip = async (targetAccount: UserProfile) => {
    const nextState = !targetAccount.isNgip;
    try {
      await toggleUserNgip(targetAccount.id, nextState);
      notify(
        nextState
          ? `👑 VIP งip granted to ${targetAccount.username}! Rainbow chroma is now ACTIVE.`
          : `VIP งip revoked from ${targetAccount.username}.`
      );
    } catch (e) {
      console.error(e);
      notify('Failed to update VIP status in database.', 'error');
    }
  };

  const handleExecuteResetAll = async () => {
    setIsResettingAll(true);
    try {
      const resetCount = await resetAllUsersStats();
      setShowResetAllConfirm(false);
      notify(
        `✅ SUCCESS: Reset all career stats (Wins: 0, Losses: 0, Matches: 0, Points: 0, Winrate: 0%) for ${resetCount || allAccountsList.length} accounts, and purged all legacy wallet data!`,
        'success'
      );
    } catch (e) {
      console.error('Reset all error:', e);
      notify('Failed to reset all users in database. Please check connection.', 'error');
    } finally {
      setIsResettingAll(false);
    }
  };

  const handleResetSingleUserStats = async (targetAccount: UserProfile) => {
    if (!window.confirm(`Reset stats for "${targetAccount.username}"? Wins, losses, matches, and points will be set to 0.`)) {
      return;
    }
    try {
      await adminOverrideOtherUserStats(
        targetAccount.id,
        {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          totalScore: 0,
          wordsGuessed: 0,
          drawingsCompleted: 0,
          highestRoundScore: 0,
          fastestGuessSec: 0,
          currentStreak: 0,
          bestStreak: 0,
        },
        1
      );
      notify(`Reset stats to 0 for ${targetAccount.username}!`);
      if (editingUser && editingUser.id === targetAccount.id) {
        setEditingUser(null);
      }
    } catch (e) {
      console.error(e);
      notify('Failed to reset user stats in database.', 'error');
    }
  };

  const handleDeleteUserAccount = async (targetAccount: UserProfile) => {
    if (!window.confirm(`⚠️ Permanently delete account for "${targetAccount.username}"? All their records on Firebase (user profile, leaderboard scores, and career stats) will be instantly deleted.`)) {
      return;
    }
    try {
      await adminDeleteUser(targetAccount.id);
      notify(`Deleted account for ${targetAccount.username} from Firebase!`);
      if (editingUser && editingUser.id === targetAccount.id) {
        setEditingUser(null);
      }
    } catch (e) {
      console.error(e);
      notify('Failed to delete user account from Firebase.', 'error');
    }
  };

  const handleOpenEditUserModal = (acc: UserProfile) => {
    setEditingUser(acc);
    setEditUserLevel(String(acc.level || 1));
    setEditUserScore(String(acc.stats?.totalScore || 0));
    setEditUserWins(String(acc.stats?.wins || 0));
    setEditUserMatches(String(acc.stats?.gamesPlayed || 0));
  };

  const handleSaveUserModalChanges = async () => {
    if (!editingUser) return;
    try {
      const levelNum = Math.max(1, parseInt(editUserLevel, 10) || 1);
      const scoreNum = Math.max(0, parseInt(editUserScore, 10) || 0);
      const winsNum = Math.max(0, parseInt(editUserWins, 10) || 0);
      const matchesNum = Math.max(winsNum, parseInt(editUserMatches, 10) || 0);
      const lossesNum = Math.max(0, matchesNum - winsNum);

      const statsUpdate: Partial<PlayerStats> = {
        totalScore: scoreNum,
        wins: winsNum,
        gamesPlayed: matchesNum,
        losses: lossesNum,
      };

      await adminOverrideOtherUserStats(editingUser.id, statsUpdate, levelNum);
      notify(`Updated stats and level for ${editingUser.username}!`);
      setEditingUser(null);
    } catch (e) {
      console.error(e);
      notify('Failed to update user stats.', 'error');
    }
  };

  return (
    <div
      id="admin-panel-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div
        id="admin-panel-modal"
        className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl shadow-amber-500/10 overflow-hidden text-slate-100"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Crown className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>D14 Master Admin Console</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black uppercase">
                    Root Access
                  </span>
                </h2>
              </div>
              <p className="text-xs text-amber-200/70">
                Live user management, competitive career stats, and VIP Ngip system
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Prominent Master RESET ALL Button */}
            <button
              id="admin-reset-all-btn"
              onClick={() => setShowResetAllConfirm(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 border border-rose-400/50 shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              title="Reset all user career stats to 0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESET ALL STATS</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Master Reset All Confirmation Modal */}
        {showResetAllConfirm && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-slate-950 border-2 border-rose-500 rounded-3xl p-6 max-w-lg w-full shadow-2xl shadow-rose-500/20 space-y-4 animate-scaleUp">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl">
                  <AlertTriangle className="w-7 h-7 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Reset Career Stats For ALL Users?</h3>
                  <p className="text-xs text-rose-300 font-bold">Danger Zone • System-Wide Action</p>
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="font-bold text-white">
                  This action will iterate through every user account registered in the system and execute:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong className="text-rose-300">Wins:</strong> Reset to 0</li>
                  <li><strong className="text-rose-300">Losses:</strong> Reset to 0</li>
                  <li><strong className="text-rose-300">Matches Played:</strong> Reset to 0</li>
                  <li><strong className="text-rose-300">Total Points:</strong> Reset to 0</li>
                  <li><strong className="text-rose-300">Win Rate:</strong> Reset to 0%</li>
                  <li><strong className="text-amber-300">Currencies / Wallet:</strong> Completely purged and removed from all accounts.</li>
                </ul>
                <p className="text-[11px] text-amber-400 font-bold pt-1">
                  User accounts, login credentials, and usernames will NOT be deleted.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowResetAllConfirm(false)}
                  disabled={isResettingAll}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-reset-all-action-btn"
                  onClick={handleExecuteResetAll}
                  disabled={isResettingAll}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isResettingAll ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Resetting All Users In Firestore...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>YES, RESET ALL USERS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Notification Bar */}
        {statusMessage && (
          <div
            className={`px-4 py-3 flex items-center justify-between text-xs font-bold border-b transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500/40'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/80 text-rose-200 border-rose-500/40'
                : 'bg-indigo-950/80 text-indigo-200 border-indigo-500/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-t-2xl text-xs font-black transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-slate-900 text-amber-400 border-amber-400 shadow-sm'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Player Accounts & Stats ({allAccountsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ngip_perks')}
            className={`px-4 py-2.5 rounded-t-2xl text-xs font-black transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'ngip_perks'
                ? 'bg-slate-900 text-amber-400 border-amber-400 shadow-sm'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>VIP Ngip System</span>
          </button>

          <button
            onClick={() => setActiveTab('server')}
            className={`px-4 py-2.5 rounded-t-2xl text-xs font-black transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'server'
                ? 'bg-slate-900 text-amber-400 border-amber-400 shadow-sm'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Live Multiplayer Rooms ({publicRooms.length})</span>
          </button>
        </div>

        {/* Tab 1: Users Management & Career Stats */}
        {activeTab === 'users' && (
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user by username or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setAccountFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    accountFilter === 'all'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400'
                      : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  All ({allAccountsList.length})
                </button>
                <button
                  onClick={() => setAccountFilter('ngip')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    accountFilter === 'ngip'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-400'
                      : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  VIP งip ({allAccountsList.filter((a) => a.isNgip || a.isAdmin).length})
                </button>
                <button
                  onClick={() => setAccountFilter('admins')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    accountFilter === 'admins'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-400'
                      : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  Admins ({allAccountsList.filter((a) => a.isAdmin).length})
                </button>
              </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Total Registered Players</div>
                <div className="mt-1 text-2xl font-black text-white">{allAccountsList.length}</div>
              </div>
              <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-violet-300">VIP Members</div>
                <div className="mt-1 text-2xl font-black text-white">
                  {allAccountsList.filter((a) => a.isNgip || a.isAdmin).length}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-emerald-300">Admins</div>
                <div className="mt-1 text-2xl font-black text-white">
                  {allAccountsList.filter((a) => a.isAdmin).length}
                </div>
              </div>
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-rose-300">Global Stats Action</div>
                  <div className="mt-1 text-xs font-bold text-slate-300">Reset All Career Records</div>
                </div>
                <button
                  onClick={() => setShowResetAllConfirm(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black cursor-pointer"
                >
                  RESET ALL
                </button>
              </div>
            </div>

            {/* User List Cards */}
            <div className="space-y-3">
              {filteredAccounts.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/60 rounded-3xl border border-slate-800">
                  <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-400">No matching user accounts found.</p>
                  <p className="text-xs text-slate-600 mt-1">Accounts will automatically appear as users login and play.</p>
                </div>
              ) : (
                filteredAccounts.map((account) => {
                  const isAccountNgip = Boolean(account.isNgip || account.isAdmin);
                  const isCurrentUser = account.id === user?.id;

                  const wins = account.stats?.wins || 0;
                  const gamesPlayed = account.stats?.gamesPlayed || 0;
                  const losses = typeof account.stats?.losses === 'number' ? account.stats.losses : Math.max(0, gamesPlayed - wins);
                  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
                  const points = account.stats?.totalScore || 0;

                  return (
                    <div
                      key={account.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isAccountNgip
                          ? 'bg-gradient-to-r from-slate-950 via-purple-950/30 to-slate-950 border-amber-500/50 shadow-md'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Left: Avatar & Identity */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border-2 shrink-0 relative"
                          style={{ backgroundColor: `${account.color}25`, borderColor: account.color }}
                        >
                          <AvatarRenderer avatar={account.avatar} className="w-full h-full object-cover" />
                          {isAccountNgip && (
                            <div className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow-md">
                              <Crown className="w-2.5 h-2.5 fill-current" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <NgipName name={account.username} isNgip={isAccountNgip} className="font-black text-sm text-white" />
                            {isCurrentUser && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                YOU
                              </span>
                            )}
                            {account.isAdmin && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                OWNER
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-400 font-mono">
                            {account.email || `ID: ${account.id.substring(0, 12)}...`}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="font-bold text-indigo-400">Lvl {account.level || 1}</span>
                            <span>•</span>
                            <span className="text-amber-400 font-bold">{points.toLocaleString()} Pts</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Competitive Career Stats Record */}
                      <div className="grid grid-cols-5 gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-center min-w-[300px]">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">Wins</span>
                          <span className="text-xs font-mono font-black text-emerald-400">
                            {wins}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">Losses</span>
                          <span className="text-xs font-mono font-black text-rose-400">
                            {losses}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">Matches</span>
                          <span className="text-xs font-mono font-black text-blue-400">
                            {gamesPlayed}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">Win Rate</span>
                          <span className="text-xs font-mono font-black text-amber-300">
                            {winRate}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">Points</span>
                          <span className="text-xs font-mono font-black text-purple-300">
                            {points.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Right: Quick Action Controls */}
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {/* งip Toggle Button */}
                        <button
                          onClick={() => handleToggleNgip(account)}
                          className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${
                            isAccountNgip
                              ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white border border-amber-300 shadow-amber-500/20'
                              : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/50'
                          }`}
                        >
                          <Crown className="w-3.5 h-3.5" />
                          <span>{isAccountNgip ? 'งip ACTIVE ✨' : 'Grant งip 👑'}</span>
                        </button>

                        {/* Reset Single User Stats Button */}
                        <button
                          onClick={() => handleResetSingleUserStats(account)}
                          className="px-2.5 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                          title="Reset this user's stats to 0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Stats</span>
                        </button>

                        {/* Open Edit Modal */}
                        <button
                          onClick={() => handleOpenEditUserModal(account)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
                          title="Edit Level & Stats"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete User Account Button */}
                        <button
                          onClick={() => handleDeleteUserAccount(account)}
                          className="p-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-600/40 text-rose-400 hover:text-rose-200 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                          title="Delete User Account from Firebase"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: งip VIP Perks Overview */}
        {activeTab === 'ngip_perks' && (
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
            <div className="bg-gradient-to-r from-purple-950 via-slate-950 to-amber-950 p-6 rounded-3xl border-2 border-amber-400 space-y-4">
              <div className="flex items-center gap-3">
                <NgipBadge size="lg" />
                <div>
                  <h3 className="text-lg font-black text-white">
                    งip VIP High Roller System Active
                  </h3>
                  <p className="text-xs text-amber-300">
                    Overview of VIP privilege perks, rainbow chroma names, exclusive arcade features, and VIP status.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-400/40 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>Dynamic Rainbow Chroma</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Live dynamic RGB chroma animation applied across chat messages, scoreboards, leaderboards, and lobbies.
                  </p>
                  <div className="pt-2">
                    <NgipName name="SampleVIPPlayer" isNgip={true} className="text-sm font-black" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-400/40 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>3X Points & EXP Boost</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Earn 3x points and EXP bonus when winning matches and completing arcade challenges.
                  </p>
                  <div className="text-xs font-mono font-bold text-amber-400 pt-2">
                    Match Victory: +300 Pts ➔ Won: +900 Pts (3x)
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-400/40 space-y-2">
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                    <Lock className="w-4 h-4 text-purple-400" />
                    <span>Exclusive VIP Arcade Games</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Access to Supreme VIP Mega Wheel & Cyber Matrix Decryption arcade minigames.
                  </p>
                  <div className="text-xs text-purple-300 font-bold pt-2">
                    2 Secret VIP Games Unlocked
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Live Server & Rooms */}
        {activeTab === 'server' && (
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400" />
                Active Multiplayer Rooms & Lobbies ({publicRooms.length})
              </h3>

              {publicRooms.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No active multiplayer rooms right now.</p>
              ) : (
                <div className="space-y-2">
                  {publicRooms.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                    >
                      <span className="font-bold text-white">{r.name}</span>
                      <span className="text-slate-400">
                        {r.playersCount}/{r.maxPlayers} Players • {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Deep Edit User Stats */}
        {editingUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <AvatarRenderer avatar={editingUser.avatar} className="w-8 h-8 rounded-lg" />
                  <span className="font-black text-white text-sm">{editingUser.username}</span>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats edit fields */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">Level</label>
                    <input
                      type="number"
                      value={editUserLevel}
                      onChange={(e) => setEditUserLevel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">Total Score / Points</label>
                    <input
                      type="number"
                      value={editUserScore}
                      onChange={(e) => setEditUserScore(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">Wins</label>
                    <input
                      type="number"
                      value={editUserWins}
                      onChange={(e) => setEditUserWins(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">Matches Played</label>
                    <input
                      type="number"
                      value={editUserMatches}
                      onChange={(e) => setEditUserMatches(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleResetSingleUserStats(editingUser)}
                    className="flex-1 py-2 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-300 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Reset Stats to 0
                  </button>
                  <button
                    onClick={handleSaveUserModalChanges}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
