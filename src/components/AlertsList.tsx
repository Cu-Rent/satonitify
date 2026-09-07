import React, { useState } from 'react';
import { BellRing, Send, Check, Copy, ExternalLink, Sparkles, Filter, AlertCircle, ShieldAlert, Image, ZoomIn } from 'lucide-react';
import { TradingViewMessage, MonitorConfig } from '../types';

interface AlertsListProps {
  alerts: TradingViewMessage[];
  config: MonitorConfig;
  onSimulateAlert: () => Promise<void>;
  onOpenSettings: () => void;
}

export const AlertsList: React.FC<AlertsListProps> = ({
  alerts,
  config,
  onSimulateAlert,
  onOpenSettings,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAlerts = alerts.filter((a) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const txt = (a.formatted_text || a.text).toLowerCase();
    return (
      txt.includes(q) ||
      (a.symbol && a.symbol.toLowerCase().includes(q)) ||
      a.time.toLowerCase().includes(q)
    );
  });

  // Helper to format TradingView BBCode-like quotes `[quote="author"]text[/quote]`
  const renderMessageContent = (text: string) => {
    const quoteRegex = /\[quote="?([^"\]]*)"?\]([\s\S]*?)\[\/quote\]/g;
    const parts = [];
    let lastIdx = 0;
    let match;

    while ((match = quoteRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push({ type: 'text', content: text.substring(lastIdx, match.index) });
      }
      parts.push({
        type: 'quote',
        author: match[1],
        content: match[2].trim(),
      });
      lastIdx = match.index + match[0].length;
    }

    if (lastIdx < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIdx) });
    }

    if (parts.length === 0) {
      return <span className="whitespace-pre-wrap">{text}</span>;
    }

    return (
      <div className="space-y-2">
        {parts.map((p, i) => {
          if (p.type === 'quote') {
            return (
              <div
                key={i}
                className="bg-slate-950/60 border-l-2 border-amber-500/60 pl-3 py-1.5 pr-2 rounded-r-lg text-xs text-slate-400 italic"
              >
                <div className="font-semibold text-slate-300 not-italic text-[11px] mb-0.5">
                  Цитата {p.author ? `от @${p.author}` : ''}:
                </div>
                <div className="whitespace-pre-wrap">{p.content}</div>
              </div>
            );
          }
          return (
            <div key={i} className="whitespace-pre-wrap">
              {p.content}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-lg overflow-hidden h-[640px]">
      
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Алерты от @{config.target_username}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {alerts.length}
              </span>
            </div>
            <p className="text-xs text-slate-400">С поддержкой графиков, эмоций и дублированием в TG</p>
          </div>
        </div>

        {/* Filter Input */}
        {alerts.length > 0 && (
          <div className="relative w-full sm:w-56">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Поиск по алертам..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-amber-500 text-xs text-white placeholder:text-slate-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* Alerts Stream List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500">
              <ShieldAlert className="w-7 h-7 text-amber-400/80" />
            </div>
            <div className="max-w-md space-y-1">
              <h4 className="text-sm font-semibold text-white">
                Ожидание сообщений от {config.target_username}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Слушатель подключен через двойной контур (PushStream + опрос истории). Любое сообщение, график или эмоция от {config.target_username} будет моментально перехвачено и отправлено в Telegram.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={onSimulateAlert}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Смоделировать сигнал (тест с графиком)
              </button>

              {(!config.telegram_bot_token || !config.telegram_chat_id) && (
                <button
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-medium transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  Подключить Telegram
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredAlerts.map((item) => {
            const directUrl = item.id
              ? `https://www.tradingview.com/chat/m/${item.id.replace(/-/g, '')}/`
              : `https://www.tradingview.com/chat/#${config.target_room}`;

            const displayContent = item.formatted_text || item.text;

            return (
              <div
                key={item.id}
                className="bg-slate-950/80 border-2 border-amber-500/40 rounded-xl p-4 transition-all hover:border-amber-500/60 shadow-md relative group space-y-3"
              >
                {/* Message Header Info */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    {item.user_pic ? (
                      <img
                        src={item.user_pic}
                        alt={item.username}
                        className="w-7 h-7 rounded-lg object-cover border border-amber-500/30 bg-slate-800"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center">
                        {item.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white tracking-wide">
                          {item.username}
                        </span>
                        {item.symbol && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                            {item.symbol}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {item.time}
                      </span>
                    </div>
                  </div>

                  {/* Telegram Send Status Badge */}
                  <div className="flex items-center gap-1.5">
                    {item.telegram_status === 'sent' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                        <Send className="w-3 h-3 text-emerald-400" />
                        <span>{item.image_url ? 'В TG (с фото)' : 'В Telegram'}</span>
                      </span>
                    )}
                    {item.telegram_status === 'queued' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400 bg-sky-950/50 border border-sky-800/60 px-2 py-0.5 rounded-full animate-pulse">
                        <Send className="w-3 h-3 text-sky-400" />
                        <span>Отправка в TG...</span>
                      </span>
                    )}
                    {item.telegram_status === 'failed' && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-950/50 border border-rose-800/60 px-2 py-0.5 rounded-full"
                        title={item.telegram_error || 'Ошибка отправки в Telegram'}
                      >
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                        <span>Ошибка TG</span>
                      </span>
                    )}
                    {item.telegram_status === 'not_configured' && (
                      <button
                        onClick={onOpenSettings}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/90 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full hover:underline"
                        title="Нажмите, чтобы настроить отправку в Telegram"
                      >
                        <span>TG не настроен</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Message Body with Emotions converted */}
                <div className="text-sm text-slate-200 leading-relaxed font-normal">
                  {renderMessageContent(displayContent)}
                </div>

                {/* Attached Snapshot / Chart Image */}
                {item.image_url && (
                  <div className="pt-1">
                    <div className="text-[11px] font-medium text-amber-400/90 flex items-center gap-1 mb-1.5">
                      <Image className="w-3.5 h-3.5 text-amber-400" />
                      <span>Прикрепленный график TradingView:</span>
                    </div>
                    <div
                      className="relative rounded-xl overflow-hidden border border-amber-500/30 bg-slate-900 group/img cursor-pointer max-h-56"
                      onClick={() => setExpandedImage(item.image_url!)}
                    >
                      <img
                        src={item.image_url}
                        alt="Chart snapshot"
                        className="w-full object-cover object-top hover:scale-[1.02] transition-transform duration-200"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-medium">
                        <ZoomIn className="w-4 h-4" />
                        <span>Нажмите для увеличения</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Controls: Copy and Link to TV */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-xs">
                  <span className="text-[11px] text-slate-500">
                    ID: <span className="font-mono">{item.id.slice(0, 8)}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(displayContent, item.id)}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-800 text-[11px]"
                      title="Скопировать текст сообщения"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Скопировано</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Копировать</span>
                        </>
                      )}
                    </button>

                    <a
                      href={directUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors px-2 py-1 rounded hover:bg-slate-800 text-[11px]"
                      title="Открыть оригинальное сообщение в TradingView"
                    >
                      <span>TradingView</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Lightbox / Fullscreen Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm cursor-pointer"
          onClick={() => setExpandedImage(null)}
        >
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <img
              src={expandedImage}
              alt="Expanded chart"
              className="max-h-[85vh] max-w-full object-contain rounded-xl border border-slate-700 shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <p className="text-xs text-slate-400 mt-2">Нажмите в любом месте, чтобы закрыть просмотр</p>
          </div>
        </div>
      )}

    </div>
  );
};
