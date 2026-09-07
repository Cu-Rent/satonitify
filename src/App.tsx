import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { TargetBanner } from './components/TargetBanner';
import { AlertsList } from './components/AlertsList';
import { LiveChatStream } from './components/LiveChatStream';
import { TelegramConfigModal } from './components/TelegramConfigModal';
import { AlertToast } from './components/AlertToast';
import { MonitorConfig, MonitorStatus, TradingViewMessage } from './types';
import { playTargetAlertSound, sendDesktopNotification } from './utils/audioAlert';

export default function App() {
  const [status, setStatus] = useState<MonitorStatus>({
    connected: false,
    room: 'bitcoin',
    target_username: 'Satoshi-Awareness',
    messages_received: 0,
    target_alerts_count: 0,
    last_heartbeat: Date.now(),
    last_message_at: null,
    last_alert_at: null,
    telegram_configured: false,
    error: null,
    uptime_seconds: 0,
  });

  const [config, setConfig] = useState<MonitorConfig>({
    target_username: 'Satoshi-Awareness',
    target_room: 'bitcoin',
    telegram_bot_token: '',
    telegram_chat_id: '',
    telegram_enabled: true,
    sound_enabled: true,
  });

  const [alerts, setAlerts] = useState<TradingViewMessage[]>([]);
  const [recentMessages, setRecentMessages] = useState<TradingViewMessage[]>([]);
  const [activeToastAlert, setActiveToastAlert] = useState<TradingViewMessage | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Initial fetch for state
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg) setConfig((prev) => ({ ...prev, ...cfg }));
      })
      .catch((e) => console.warn('Could not load config:', e));

    fetch('/api/messages')
      .then((r) => r.json())
      .then((data) => {
        if (data.recent) setRecentMessages(data.recent);
        if (data.alerts) setAlerts(data.alerts);
        if (data.status) setStatus(data.status);
      })
      .catch((e) => console.warn('Could not load messages:', e));
  }, []);

  // SSE Realtime connection to our backend
  useEffect(() => {
    const eventSource = new EventSource('/api/stream');

    eventSource.addEventListener('init', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.status) setStatus(data.status);
        if (data.config) setConfig((prev) => ({ ...prev, ...data.config }));
        if (data.recent) setRecentMessages(data.recent);
        if (data.alerts) setAlerts(data.alerts);
      } catch (err) {
        console.error('SSE init error:', err);
      }
    });

    eventSource.addEventListener('status', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setStatus(data);
      } catch (err) {
        console.error('SSE status error:', err);
      }
    });

    eventSource.addEventListener('config', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setConfig((prev) => ({ ...prev, ...data }));
      } catch (err) {
        console.error('SSE config error:', err);
      }
    });

    eventSource.addEventListener('message', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.message) {
          setRecentMessages((prev) => {
            // deduplicate by id and text to allow consecutive stacked messages
            if (prev.some((m) => m.id === data.message.id && m.text === data.message.text)) return prev;
            return [data.message, ...prev.slice(0, 79)];
          });
        }
        if (data.status) setStatus(data.status);
      } catch (err) {
        console.error('SSE message error:', err);
      }
    });

    eventSource.addEventListener('alert', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const newMsg: TradingViewMessage = data.message;
        if (!newMsg) return;

        // Prepend to alerts list (deduplicate by id and text)
        setAlerts((prev) => {
          if (prev.some((m) => m.id === newMsg.id && m.text === newMsg.text)) return prev;
          return [newMsg, ...prev.slice(0, 99)];
        });

        // Also prepend to recent messages
        setRecentMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id && m.text === newMsg.text)) return prev;
          return [newMsg, ...prev.slice(0, 79)];
        });

        if (data.status) setStatus(data.status);

        // Trigger Audio Chime if sound is enabled
        if (configRef.current.sound_enabled) {
          playTargetAlertSound();
        }

        // Trigger Desktop Browser Notification
        sendDesktopNotification(
          `🚨 TradingView: ${newMsg.username}`,
          newMsg.text.slice(0, 120),
          newMsg.user_pic
        );

        // Show floating toast
        setActiveToastAlert(newMsg);
      } catch (err) {
        console.error('SSE alert error:', err);
      }
    });

    eventSource.onerror = () => {
      setStatus((prev) => ({ ...prev, connected: false }));
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleToggleSound = useCallback(() => {
    const updated = !config.sound_enabled;
    setConfig((prev) => ({ ...prev, sound_enabled: updated }));
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sound_enabled: updated }),
    }).catch((e) => console.error(e));
  }, [config.sound_enabled]);

  const handleSaveConfig = useCallback(async (updated: Partial<MonitorConfig>) => {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const data = await res.json();
    if (data.config) {
      setConfig((prev) => ({ ...prev, ...data.config }));
    }
  }, []);

  const handleTestTelegram = useCallback(async (token: string, chatId: string) => {
    const res = await fetch('/api/test-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, chat_id: chatId }),
    });
    return res.json();
  }, []);

  const handleSimulateAlert = useCallback(async () => {
    const res = await fetch('/api/simulate-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `BTC breakout confirmation above key resistance! Watching $98,500 target. Sentiment: Bullish.`,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to simulate');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Navigation & Status Bar */}
      <Header
        status={status}
        config={config}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleSound={handleToggleSound}
        notificationPermission={notificationPermission}
        onUpdatePermission={setNotificationPermission}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Monitored User Spotlight & Quick Controls */}
        <TargetBanner
          config={config}
          status={status}
          latestAlert={alerts[0]}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSimulateAlert={handleSimulateAlert}
        />

        {/* Dual Panel Layout: Targeted Alerts + Live TradingView Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Column 1: Captured Alerts from Satoshi-Awareness */}
          <AlertsList
            alerts={alerts}
            config={config}
            onSimulateAlert={handleSimulateAlert}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {/* Column 2: Live TradingView Bitcoin Chat Stream */}
          <LiveChatStream
            messages={recentMessages}
            config={config}
          />

        </div>

      </main>

      {/* Footer info */}
      <footer className="border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Прямое подключение к TradingView PushStream WebSocket/SSE API • Канал <code className="text-slate-400">#{config.target_room}</code>
          </span>
          <span>
            Интеграция с Telegram Bot API • Синтезатор звука Web Audio API
          </span>
        </div>
      </footer>

      {/* Telegram & Monitor Settings Modal */}
      <TelegramConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={handleSaveConfig}
        onTestTelegram={handleTestTelegram}
      />

      {/* Realtime Alert Pop-up Toast */}
      <AlertToast
        alert={activeToastAlert}
        onDismiss={() => setActiveToastAlert(null)}
      />

    </div>
  );
}
