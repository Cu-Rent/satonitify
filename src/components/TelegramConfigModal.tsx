import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertCircle, HelpCircle, Key, User, Hash, ExternalLink, RefreshCw } from 'lucide-react';
import { MonitorConfig } from '../types';

interface TelegramConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MonitorConfig;
  onSave: (updated: Partial<MonitorConfig>) => Promise<void>;
  onTestTelegram: (token: string, chatId: string) => Promise<{ success: boolean; error?: string; message?: string }>;
}

export const TelegramConfigModal: React.FC<TelegramConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  onTestTelegram,
}) => {
  const [botToken, setBotToken] = useState(config.telegram_bot_token || '');
  const [chatId, setChatId] = useState(config.telegram_chat_id || '');
  const [targetUsername, setTargetUsername] = useState(config.target_username || 'Satoshi-Awareness');
  const [targetRoom, setTargetRoom] = useState(config.target_room || 'bitcoin');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTestResult(null);
    if (!botToken.trim()) {
      setTestResult({ success: false, error: 'Пожалуйста, введите Telegram Bot Token' });
      return;
    }
    if (!chatId.trim()) {
      setTestResult({ success: false, error: 'Пожалуйста, введите ваш Telegram Chat ID' });
      return;
    }

    setIsTesting(true);
    try {
      const res = await onTestTelegram(botToken.trim(), chatId.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, error: err?.message || 'Не удалось отправить тест' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        telegram_bot_token: botToken.trim(),
        telegram_chat_id: chatId.trim(),
        target_username: targetUsername.trim(),
        target_room: targetRoom.trim().toLowerCase(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Настройки Telegram & Монитора</h3>
              <p className="text-xs text-slate-400">Уведомления в Telegram и параметры чата</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
          
          {/* Quick Step Guide */}
          <div className="bg-sky-950/30 border border-sky-800/40 rounded-xl p-4 text-xs text-sky-200/90 space-y-2">
            <div className="font-semibold text-sky-300 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              Как настроить бота в Telegram за 1 минуту:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300">
              <li>
                Откройте бота <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-400 underline font-medium">@BotFather</a> в Telegram и отправьте команду <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">/newbot</code>.
              </li>
              <li>
                Задайте имя боту и скопируйте полученный <strong>API Token</strong> в поле ниже.
              </li>
              <li>
                Откройте своего нового бота в Telegram и обязательно нажмите <strong>START</strong> (или отправьте любое сообщение).
              </li>
              <li>
                Узнайте свой числовой <strong>Chat ID</strong> через бота <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-sky-400 underline font-medium">@userinfobot</a> или <a href="https://t.me/getmyid_bot" target="_blank" rel="noreferrer" className="text-sky-400 underline font-medium">@getmyid_bot</a>.
              </li>
              <li className="text-emerald-300 font-medium">
                🖼️ <strong>Графики и эмоции:</strong> Все скриншоты TradingView (<code className="text-amber-300">/x/...</code>), картинки и торговые эмодзи автоматически конвертируются и отправляются в Telegram через <code className="text-amber-300">sendPhoto</code> с защитой от пропусков сообщений!
              </li>
            </ol>
          </div>

          {/* Telegram Bot Token Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                Telegram Bot Token
              </span>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
              >
                Создать в @BotFather
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="password"
              placeholder="7123456789:AAFxxx..."
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm text-white placeholder:text-slate-600 outline-none font-mono"
            />
          </div>

          {/* Telegram Chat ID Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                Telegram Chat ID (ваш ID или ID группы/канала)
              </span>
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
              >
                Узнать через @userinfobot
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="text"
              placeholder="Например: 123456789 или -1001234567890"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm text-white placeholder:text-slate-600 outline-none font-mono"
            />
          </div>

          {/* Target Monitor Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                Отслеживаемый никнейм
              </label>
              <input
                type="text"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-white font-medium outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-400" />
                Комната чата TradingView
              </label>
              <input
                type="text"
                value={targetRoom}
                onChange={(e) => setTargetRoom(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white font-medium outline-none"
              />
              <span className="text-[10px] text-slate-500">По умолчанию bitcoin</span>
            </div>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold">
                  {testResult.success ? 'Успешно!' : 'Ошибка подключения'}
                </div>
                <div className="mt-0.5 opacity-90">
                  {testResult.message || testResult.error}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !botToken || !chatId}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Отправка теста...' : 'Проверить и отправить тест'}</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
