import React, { useState } from 'react';
import { UserCheck, Sparkles, Send, ExternalLink, Clock, Hash, AlertTriangle } from 'lucide-react';
import { MonitorConfig, MonitorStatus, TradingViewMessage } from '../types';

interface TargetBannerProps {
  config: MonitorConfig;
  status: MonitorStatus;
  latestAlert?: TradingViewMessage;
  onOpenSettings: () => void;
  onSimulateAlert: () => Promise<void>;
}

export const TargetBanner: React.FC<TargetBannerProps> = ({
  config,
  status,
  latestAlert,
  onOpenSettings,
  onSimulateAlert,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedFeedback, setSimulatedFeedback] = useState<string | null>(null);

  const handleSimulate = async () => {
    setIsSimulating(true);
    setSimulatedFeedback(null);
    try {
      await onSimulateAlert();
      setSimulatedFeedback('Сигнал успешно отправлен в систему!');
      setTimeout(() => setSimulatedFeedback(null), 4000);
    } catch (err: any) {
      setSimulatedFeedback(`Ошибка: ${err?.message || 'Не удалось отправить'}`);
      setTimeout(() => setSimulatedFeedback(null), 4000);
    } finally {
      setIsSimulating(false);
    }
  };

  const tvProfileUrl = `https://www.tradingview.com/u/${encodeURIComponent(config.target_username)}/`;
  const tvChatUrl = `https://www.tradingview.com/chat/#${encodeURIComponent(config.target_room)}`;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      
      {/* Decorative accent glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
        
        {/* Left: User Profile & Target Spec */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative">
            {latestAlert?.user_pic ? (
              <img
                src={latestAlert.user_pic}
                alt={config.target_username}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/40 shadow-md bg-slate-800"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold text-xl shadow-lg shadow-amber-500/10">
                {config.target_username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center"
              title="Мониторинг активен"
            >
              <UserCheck className="w-3 h-3 text-slate-950" />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-400/90 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Целевой трейдер
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-500" />
                комната {config.target_room}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Двойной контур: PushStream + Резервный опрос истории каждые 25 сек">
                🛡️ Zero-Drop (без пропусков)
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20" title="Поддерживает графики /x/ и TradingView эмодзи">
                🖼️ Графики + Эмоции
              </span>
            </div>

            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">
                {config.target_username}
              </h2>
              <a
                href={tvProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-amber-300 transition-colors p-1"
                title="Открыть профиль на TradingView"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {status.last_alert_at ? (
                  <>Последнее сообщ: <span className="text-slate-200">{new Date(status.last_alert_at).toLocaleTimeString()}</span></>
                ) : (
                  <span className="text-slate-500">Сообщений в текущей сессии еще не было</span>
                )}
              </span>
              <span className="inline-block w-1 h-1 rounded-full bg-slate-700" />
              <span>Поймано алертов: <strong className="text-amber-300 font-semibold">{status.target_alerts_count}</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Actions & Telegram status alert */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          
          {/* Telegram Status Callout */}
          {!config.telegram_bot_token || !config.telegram_chat_id ? (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium transition-all group text-left"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="font-semibold group-hover:underline">Настройте Telegram</div>
                <div className="text-[11px] text-amber-400/70">Для отправки уведомлений в бота</div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
              <Send className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-emerald-200">Дублирование в Telegram</div>
                <div className="text-[11px] text-emerald-400/70">Активно для @{config.target_username}</div>
              </div>
            </div>
          )}

          {/* Simulate Alert Button for testing */}
          <div className="flex flex-col items-end">
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Смоделировать появление нового сообщения от целевого трейдера (проверка звука, баннера и Telegram)"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Отправка теста...' : 'Смоделировать сигнал'}</span>
            </button>
            {simulatedFeedback && (
              <span className="text-[11px] text-amber-300 mt-1 animate-fade-in font-medium">
                {simulatedFeedback}
              </span>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
