import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Pause, Play, Search, ArrowDown, ExternalLink, Image } from 'lucide-react';
import { TradingViewMessage, MonitorConfig } from '../types';

interface LiveChatStreamProps {
  messages: TradingViewMessage[];
  config: MonitorConfig;
}

export const LiveChatStream: React.FC<LiveChatStreamProps> = ({ messages, config }) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [messages, autoScroll]);

  const filtered = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const textToCheck = (m.formatted_text || m.text).toLowerCase();
    return (
      m.username.toLowerCase().includes(q) ||
      textToCheck.includes(q) ||
      (m.symbol && m.symbol.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-lg overflow-hidden h-[640px]">
      
      {/* Stream Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Прямой эфир чата #{config.target_room}</h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xs text-slate-400">Поток сообщений трейдеров с графиками и эмоциями</p>
          </div>
        </div>

        {/* Search & Pause Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Поиск по чату..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white placeholder:text-slate-500 outline-none"
            />
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-lg border text-xs transition-colors shrink-0 ${
              autoScroll
                ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/50 hover:bg-amber-900/40'
            }`}
            title={autoScroll ? 'Автопрокрутка включена (нажмите для паузы)' : 'Автопрокрутка приостановлена'}
          >
            {autoScroll ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
            Подключение к потоку чата TradingView... Новые сообщения отобразятся здесь по мере поступления.
          </div>
        ) : (
          filtered.map((item) => {
            const isTarget = item.is_target;
            const displayContent = item.formatted_text || item.text;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  isTarget
                    ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {item.user_pic ? (
                      <img
                        src={item.user_pic}
                        alt={item.username}
                        className="w-5 h-5 rounded-md object-cover bg-slate-800"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                          isTarget ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`font-semibold ${
                        isTarget ? 'text-amber-300 font-bold' : 'text-slate-300'
                      }`}
                    >
                      {item.username}
                    </span>
                    {isTarget && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                        ЦЕЛЕВОЙ
                      </span>
                    )}
                    {item.symbol && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        {item.symbol}
                      </span>
                    )}
                    {item.image_url && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800">
                        <Image className="w-2.5 h-2.5" />
                        <span>График</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span>
                      {item.time ? item.time.split(' ').slice(4, 5).join('') || item.time : ''}
                    </span>
                    {item.id && (
                      <a
                        href={`https://www.tradingview.com/chat/m/${item.id.replace(/-/g, '')}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-slate-300 p-0.5"
                        title="Ссылка на TradingView"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div
                  className={`leading-relaxed whitespace-pre-wrap ${
                    isTarget ? 'text-amber-100 font-medium' : 'text-slate-300'
                  }`}
                >
                  {displayContent}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Resume Auto-Scroll Button */}
      {!autoScroll && (
        <div className="p-2 border-t border-slate-800 bg-slate-900/90 text-center">
          <button
            onClick={() => setAutoScroll(true)}
            className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 font-medium"
          >
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
            <span>Возобновить автоскролл</span>
          </button>
        </div>
      )}

    </div>
  );
};
