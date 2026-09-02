import React, { useState, useRef } from 'react';
import { Upload, Check, Trash2, Camera, RefreshCw } from 'lucide-react';
import { PRESET_AVATARS } from '../utils/avatarIcons';
import { resizeImageTo500x500Base64, isImageAvatar } from '../utils/avatarUtils';
import { soundManager } from '../utils/soundEffects';

interface AvatarSelectorProps {
  value: string;
  onChange: (avatar: string) => void;
  compact?: boolean;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const isCustomPhoto = isImageAvatar(value) && !value.includes('xmlns=');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const base64 = await resizeImageTo500x500Base64(file);
      onChange(base64);
      soundManager.playCorrectGuess();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to process image. Please try another.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleRemoveCustomAvatar = () => {
    onChange(PRESET_AVATARS[0].id);
    soundManager.playTick();
  };

  return (
    <div className="space-y-2">
      {/* ERROR ALERT */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* UPLOAD CUSTOM PHOTO VIEW */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {isCustomPhoto ? (
          /* Uploaded Photo Preview Card */
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/30 flex items-center gap-3.5">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-indigo-500/60 shadow-md flex-shrink-0 bg-slate-900">
              <img
                src={value}
                alt="Custom Profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-1 right-1 p-0.5 bg-emerald-500 rounded-full text-white">
                <Check className="w-2.5 h-2.5" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Custom Profile Photo</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  500×500 HD
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Synchronized to your player badge & matchmaking.
              </p>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Change Photo</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemoveCustomAvatar}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[11px] font-semibold flex items-center gap-1 transition-colors border border-rose-500/20 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Drag and Drop Zone */
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`p-4 sm:p-5 rounded-xl border border-dashed text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                : 'border-slate-800 hover:border-indigo-500/50 bg-slate-950/60 hover:bg-slate-950/90'
            }`}
          >
            {isProcessing ? (
              <div className="py-3 flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                <p className="text-xs font-semibold text-slate-200">
                  Optimizing Profile Photo...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    Click to choose photo or drag & drop here
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    JPG, PNG, WebP • Auto center-cropped to 500×500 px
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
