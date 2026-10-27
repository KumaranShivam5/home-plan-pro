import React, { useState } from 'react';
import { DownloadCloud, CheckCircle2, WifiOff } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await installApp();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Offline Status Indicator */}
      {!isOnline && (
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/60 border border-amber-800/80 text-amber-300"
          title="Working Offline - Local Storage & Service Worker Active"
        >
          <WifiOff className="w-3 h-3 text-amber-400" />
          <span className="hidden sm:inline">Offline Mode</span>
        </div>
      )}

      {/* PWA Install Button */}
      {isInstallable && !isInstalled && (
        <button
          type="button"
          onClick={handleInstall}
          disabled={isInstalling}
          title="Install Home Plan Pro Web CAD as a standalone tablet/desktop app"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-sky-200 hover:text-white bg-sky-950/70 hover:bg-sky-900/90 border border-sky-700/70 rounded transition-colors whitespace-nowrap cursor-pointer shadow-xs active:scale-95"
        >
          <DownloadCloud className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
        </button>
      )}

      {/* Installed / Standalone Badge */}
      {isInstalled && (
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-900 border border-slate-800 text-slate-300"
          title="Running in Standalone PWA Mode"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span className="hidden sm:inline">PWA App</span>
        </div>
      )}
    </div>
  );
};
