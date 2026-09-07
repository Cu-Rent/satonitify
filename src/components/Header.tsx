import React from 'react';
import { Radio, Volume2, VolumeX, Send, Bell, Settings, ExternalLink, ShieldCheck } from 'lucide-react';
import { MonitorStatus, MonitorConfig } from '../types';
import { playTestSound, requestNotificationPermission } from '../utils/audioAlert';

interface HeaderProps {
  status: MonitorStatus;
  config: MonitorConfig;
  onOpenSettings: () => void;
  onToggleSound: () => void;
  notificationPermission: string;
  onUpdatePermission: (perm: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  config,
  onOpenSettings,
  onToggleSound,
  notificationPermission,
  onUpdatePermission,
}) => {
  const handleRequestNotification = async () => {
    const granted = await requestNotificationPermission();
    onUpdatePermission(granted ? 'granted' : 'denied');
  };

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Left: Brand & TV chat source */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold text-lg">
            ₿
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-white tracking-tight">
                TradingView Alert Monitor
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                #{status.room || 'bitcoin'}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              Слежение за пользователем <span className="text-amber-300 font-medium">@{config.target_username}</span>
              <a
                href={`https://www.tradingview.com/chat/#${status.room || 'bitcoin'}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-blue-400 hover:text-blue-300 transition-colors ml-1"
                title="Перейти в веб-чат TradingView"
              >
                <span>TradingView</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        {/* Right: Controls & Status Badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          
          {/* TV Stream Connection Status */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              status.connected
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
                : 'bg-rose-950/50 text-rose-300 border-rose-800/60 animate-pulse'
            }`}
            title={status.connected ? 'TradingView PushStream активен' : `Ошибка связи: ${status.error || 'Переподключение...'}`}
          >
            <Radio className={`w-3.5 h-3.5 ${status.connected ? 'animate-pulse text-emerald-400' : 'text-rose-400'}`} />
            <span>{status.connected ? 'TV Чат: Онлайн' : 'TV Чат: Оффлайн'}</span>
            <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-1.5">
              {status.messages_received} сообщ.
            </span>
          </div>

          {/* Telegram Status Badge */}
          <button
            onClick={onOpenSettings}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              config.telegram_bot_token && config.telegram_chat_id
                ? 'bg-sky-950/40 text-sky-300 border-sky-800/60 hover:bg-sky-900/40'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/40'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {config.telegram_bot_token && config.telegram_chat_id ? 'Telegram: Подключен' : 'Telegram: Настроить'}
            </span>
            {config.telegram_bot_token && config.telegram_chat_id && (
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            )}
          </button>

          {/* Sound alert toggle */}
          <button
            onClick={() => {
              onToggleSound();
              if (!config.sound_enabled) {
                playTestSound();
              }
            }}
            className={`p-2 rounded-lg border text-xs transition-colors ${
              config.sound_enabled
                ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-800/50 text-slate-500 border-slate-800 hover:bg-slate-800'
            }`}
            title={config.sound_enabled ? 'Звук включен (нажмите для проверки/отключения)' : 'Звук отключен'}
            aria-label="Переключить звук"
          >
            {config.sound_enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Desktop Push Notification toggle */}
          {notificationPermission !== 'granted' && (
            <button
              onClick={handleRequestNotification}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Включить всплывающие уведомления в браузере"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Браузер</span>
            </button>
          )}

          {/* Settings modal trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Настройки Telegram и монитора"
            aria-label="Настройки"
          >
            <Settings className="w-4 h-4" />
          </button>

        </div>
      </div>
    </header>
  );
};
