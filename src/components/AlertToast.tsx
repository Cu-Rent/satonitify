import React, { useEffect } from 'react';
import { BellRing, X, ExternalLink, Send, Image } from 'lucide-react';
import { TradingViewMessage } from '../types';

interface AlertToastProps {
  alert: TradingViewMessage | null;
  onDismiss: () => void;
}

export const AlertToast: React.FC<AlertToastProps> = ({ alert, onDismiss }) => {
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 12000);
    return () => clearTimeout(timer);
  }, [alert, onDismiss]);

  if (!alert) return null;

  const directUrl = alert.id
    ? `https://www.tradingview.com/chat/m/${alert.id.replace(/-/g, '')}/`
    : `https://www.tradingview.com/chat/#${alert.room_id || 'bitcoin'}`;

  const content = alert.formatted_text || alert.text;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full animate-bounce-short">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-4 shadow-2xl shadow-amber-500/20 text-white relative overflow-hidden backdrop-blur-md">
        
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Новое сообщение от трейдера!
              </div>
              <div className="text-sm font-semibold text-white">
                @{alert.username}
              </div>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-2 text-xs text-slate-200 line-clamp-3 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 whitespace-pre-wrap">
          {content}
        </div>

        {alert.image_url && (
          <div className="mt-2 rounded-lg overflow-hidden border border-amber-500/30 max-h-32">
            <img
              src={alert.image_url}
              alt="Snapshot"
              className="w-full h-32 object-cover object-top"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            {alert.telegram_status === 'sent' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <Send className="w-3 h-3" />
                В Telegram {alert.image_url ? '(с фото)' : ''}
              </span>
            )}
            {alert.telegram_status === 'queued' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-sky-400 font-medium animate-pulse">
                <Send className="w-3 h-3" />
                Отправка в TG...
              </span>
            )}
            {alert.image_url && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                <Image className="w-3 h-3" />
                График
              </span>
            )}
          </div>

          <a
            href={directUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-semibold text-xs"
          >
            <span>Открыть в чате</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
};
