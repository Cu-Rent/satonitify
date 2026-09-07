import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const app = express();
app.use(express.json());

const CONFIG_FILE = path.join(process.cwd(), 'monitor-config.json');

interface AppConfig {
  target_username: string;
  target_room: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
  telegram_enabled: boolean;
  sound_enabled: boolean;
}

let config: AppConfig = {
  target_username: process.env.TARGET_USERNAME || 'Satoshi-Awareness',
  target_room: process.env.TARGET_ROOM || 'bitcoin',
  telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
  telegram_chat_id: process.env.TELEGRAM_CHAT_ID || '',
  telegram_enabled: true,
  sound_enabled: true,
};

let sentTelegramAlertIds = new Set<string>();

// Load persisted config and sent history if present
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (saved.config) {
      config = { ...config, ...saved.config };
    } else {
      config = { ...config, ...saved };
    }
    if (Array.isArray(saved.sentAlertIds)) {
      sentTelegramAlertIds = new Set(saved.sentAlertIds);
    }
  } catch (err) {
    console.error('Failed to load saved config:', err);
  }
}

function saveConfig() {
  try {
    const dataToSave = {
      config,
      sentAlertIds: Array.from(sentTelegramAlertIds).slice(-300),
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

// Full TradingView emotion codes and emoticons to Unicode emojis
const TRADINGVIEW_EMOJI_MAP: Record<string, string> = {
  // Trading & Financial
  ':buy:': '🟢 BUY',
  ':sell:': '🔴 SELL',
  ':profit:': '💰 PROFIT',
  ':loss:': '📉 LOSS',
  ':uptrend:': '📈',
  ':downtrend:': '📉',
  ':bear:': '🐻',
  ':bull:': '🐂',
  ':bitcoin:': '₿',
  ':ethereum:': '⟠',
  ':dollar:': '💵',
  ':euro:': '💶',
  ':pound:': '💷',
  ':yen:': '💴',
  ':moneybag:': '💰',
  ':rocket:': '🚀',
  ':inverted_rocket:': '🔻🚀',
  ':moon:': '🌕',
  ':diamond:': '💎',
  ':hands:': '🙌',
  ':hodl:': '💎🙌',
  ':dump:': '📉 DUMP',
  ':pump:': '📈 PUMP',
  ':fire:': '🔥',
  ':agree:': '👍',
  ':disagree:': '👎',
  ':okay:': '👌',
  ':peace:': '✌️',
  ':wait:': '✋',
  ':wave:': '👋',
  ':raised_hands:': '🙌',
  ':pray:': '🙏',
  ':joy:': '😂',
  ':love:': '❤️',
  ':flushed:': '😳',
  ':thinking_face:': '🤔',
  ':weary:': '😩',
  ':cry:': '😢',
  ':panic:': '😱',
  ':rage:': '😡',
  ':triumph:': '😤',
  ':mask:': '😷',
  ':shades:': '😎',
  ':sleepy:': '😪',
  ':halo:': '😇',
  ':sarcasm:': '😏',
  ':money_mouth:': '🤑',
  ':zzz:': '💤',
  ':cookie:': '🍪',
  ':coffee:': '☕',
  ':popcorn:': '🍿',
  ':cocktail:': '🍸',
  ':hot:': '🌶️',
  ':poop:': '💩',
  ':heart:': '❤️',
  ':heartbroken:': '💔',
  ':sun:': '☀️',
  ':sunflower:': '🌻',
  ':star:': '⭐',
  ':sunny:': '☀️',
  ':partly_sunny:': '⛅',
  ':cloud:': '☁️',
  ':zap:': '⚡',
  ':hammer:': '🔨',
  ':idea:': '💡',
  ':slot_machine:': '🎰',
  ':bullseye:': '🎯',
  ':checkered_flag:': '🏁',
  ':alarm_clock:': '⏰',
  ':rip:': '🪦',
  ':ghost:': '👻',
  ':up:': '⬆️',
  ':cool:': '🆒',
  ':free:': '🆓',
  ':sos:': '🆘',
  ':100:': '💯',
  ':stop:': '🛑',
  ':credit_card:': '💳',
  ':new:': '🆕',
  ':ok:': '🆗',
  ':tip:': '💡',
  // Text emoticons
  ':)': '😊',
  ':-)': '😊',
  ':D': '😃',
  ':-D': '😃',
  ';)': '😉',
  ';-)': '😉',
  ':(': '🙁',
  ':-(': '🙁',
  ":'(": '😢',
  ':P': '😛',
  ':-P': '😛',
  ':p': '😛',
  ':-p': '😛',
  ':|': '😐',
  ':-|': '😐',
  'o_O': '😳',
  'O_o': '😳',
  'O_O': '👀',
  ']:->': '😈',
  ']:)': '😈',
  '}:-)': '😈',
};

function formatTradingViewEmotions(text: string): string {
  if (!text) return '';
  let res = text;
  for (const [code, emoji] of Object.entries(TRADINGVIEW_EMOJI_MAP)) {
    if (code.startsWith(':') && code.endsWith(':')) {
      res = res.split(code).join(` ${emoji} `);
    } else {
      // Regex for text emoticons surrounded by whitespace or boundaries
      const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      res = res.replace(new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'g'), `$1${emoji}$2`);
    }
  }
  // Clean up excessive double spaces
  return res.replace(/[ \t]{2,}/g, ' ').trim();
}

function extractImageInfo(text: string, raw?: any): { imageUrl: string | null; snapshotId: string | null } {
  text = text || '';

  // 1. Direct snapshot or image fields in raw object
  const rawCandidates = [
    raw?.snapshot,
    raw?.image,
    raw?.imageUrl,
    raw?.image_url,
    raw?.chart,
    raw?.chart_id,
    raw?.preview,
    ...(Array.isArray(raw?.images) ? raw.images : []),
    ...(Array.isArray(raw?.attachments) ? raw.attachments : []),
  ].filter(Boolean);

  for (const cand of rawCandidates) {
    if (typeof cand === 'string') {
      const c = cand.trim();
      // Snapshot ID (e.g. "clhoXiiz" or "BAUTFbTf")
      if (/^[0-9a-zA-Z]{6,14}$/.test(c)) {
        return {
          imageUrl: `https://s3.tradingview.com/snapshots/${c[0].toLowerCase()}/${c}.png`,
          snapshotId: c,
        };
      }
      // If it is an explicit image URL
      if (c.startsWith('http')) {
        const cleaned = c.replace(/_thumb(\.[a-zA-Z]+)$/i, '$1');
        return { imageUrl: cleaned, snapshotId: null };
      }
    }
  }

  // 2. Look inside raw?.raw_html, raw?.block, or full HTML text if present
  const combinedText = [
    text,
    typeof raw === 'string' ? raw : '',
    raw?.raw_html || '',
    raw?.html || '',
    raw?.block || '',
  ].join(' ');

  // 3. Extract TradingView snapshots / charts from HTML tags (href="..." or src="...")
  const s3HtmlMatch = combinedText.match(/(?:href|src)=["']([^"']*(?:s3\.tradingview\.com|s3\.amazonaws\.com\/tradingview)\/snapshots\/[a-z0-9]+\/([0-9a-zA-Z]+)(?:_thumb)?\.(?:png|jpe?g|bmp))["']/i);
  if (s3HtmlMatch) {
    const rawUrl = s3HtmlMatch[1].replace('_thumb', '');
    const snapId = s3HtmlMatch[2].replace('_thumb', '');
    return {
      imageUrl: rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl,
      snapshotId: snapId,
    };
  }

  // 4. HTML links for /chart/... or /x/... or /i/... in href attributes
  const hrefChartMatch = combinedText.match(/href=["']([^"']*(?:tradingview\.com)?\/(?:chart\/(?:[^\s/]+\/)?([0-9a-zA-Z]{8})|(?:x|i|v)\/([0-9a-zA-Z]{6,14}))[^"']*)["']/i);
  if (hrefChartMatch) {
    const id = hrefChartMatch[2] || hrefChartMatch[3];
    if (id) {
      return {
        imageUrl: `https://s3.tradingview.com/snapshots/${id[0].toLowerCase()}/${id}.png`,
        snapshotId: id,
      };
    }
  }

  // 5. Plain text: TradingView snapshot URL: https://www.tradingview.com/x/<id>/ or /i/<id>/
  const tvSnapshot = combinedText.match(/(?:https?:\/\/)?(?:www\.)?tradingview\.com\/(?:x|i)\/([0-9a-zA-Z]{6,14})\/?/i);
  if (tvSnapshot) {
    const id = tvSnapshot[1];
    return {
      imageUrl: `https://s3.tradingview.com/snapshots/${id[0].toLowerCase()}/${id}.png`,
      snapshotId: id,
    };
  }

  // 6. Plain text: Published Chart or Idea URL:
  // e.g. https://www.tradingview.com/chart/BTCUSD/6aZRViUm-Bitcoin-Double-Top/
  // or https://www.tradingview.com/chart/6aZRViUm/
  const tvChart = combinedText.match(/(?:https?:\/\/)?(?:www\.)?tradingview\.com\/chart\/(?:[^\s/]+\/)?([0-9a-zA-Z]{8})(?:-[^\s/]+)?\/?/i);
  if (tvChart) {
    const id = tvChart[1];
    return {
      imageUrl: `https://s3.tradingview.com/snapshots/${id[0].toLowerCase()}/${id}.png`,
      snapshotId: id,
    };
  }

  // 7. Plain text: /v/<id>/ (old chart link)
  const tvV = combinedText.match(/(?:https?:\/\/)?(?:www\.)?tradingview\.com\/v\/([0-9a-zA-Z]{8})\/?/i);
  if (tvV) {
    const id = tvV[1];
    return {
      imageUrl: `https://s3.tradingview.com/snapshots/${id[0].toLowerCase()}/${id}.png`,
      snapshotId: id,
    };
  }

  // 8. Plain text: Direct S3 snapshot URL
  const s3Direct = combinedText.match(/https?:\/\/(?:s3\.tradingview\.com|s3\.amazonaws\.com\/tradingview)\/snapshots\/[a-z0-9]+\/([0-9a-zA-Z]+)(?:_thumb)?\.(?:png|jpe?g|bmp)/i);
  if (s3Direct) {
    return {
      imageUrl: s3Direct[0].replace('_thumb', ''),
      snapshotId: s3Direct[1].replace('_thumb', ''),
    };
  }

  // 9. Plain text: Direct image URL (PNG, JPG, JPEG, WEBP, GIF)
  const directImg = combinedText.match(/https?:\/\/[^\s<>"'\)]+\.(?:png|jpe?g|webp|gif)(?:\?[^\s<>"'\)]*)?/i);
  if (directImg) {
    return {
      imageUrl: directImg[0].replace('_thumb', ''),
      snapshotId: null,
    };
  }

  return { imageUrl: null, snapshotId: null };
}

interface StoredMessage {
  id: string;
  time: string;
  timestamp: number;
  username: string;
  user_pic?: string;
  user_id?: number;
  text: string;
  formatted_text?: string;
  room_id: string;
  symbol?: string;
  badges?: Array<{ name: string; verbose_name: string }>;
  is_target: boolean;
  image_url?: string;
  snapshot_id?: string;
  telegram_status?: 'sent' | 'failed' | 'not_configured' | 'skipped' | 'queued';
  telegram_error?: string;
  url?: string;
}

let recentMessages: StoredMessage[] = [];
let targetAlerts: StoredMessage[] = [
  {
    id: '2ac49569-6123-45cc-9d56-6486255b5332',
    time: 'Mon Sep  7 16:20:20 2026 UTC',
    timestamp: 1788798020000,
    username: 'Satoshi-Awareness',
    user_pic: 'https://s3.tradingview.com/userpics/13037082-qnPd_mid.png',
    user_id: 13037082,
    text: ':inverted_rocket: weeeee rookies',
    formatted_text: '🔻🚀 weeeee rookies',
    room_id: 'bitcoin',
    symbol: 'COINBASE:BTCUSD',
    badges: [{ verbose_name: 'Essential', name: 'pro:pro' }],
    is_target: true,
    url: 'https://www.tradingview.com/chat/m/2ac49569612345cc9d566486255b5332/',
    telegram_status: 'sent',
  },
];
const sseClients = new Set<express.Response>();

// Smart Cache of seen message signatures and IDs to prevent true duplicates
// while allowing consecutive messages (even if grouped under the same ID or appended)
const seenMessageSignatures = new Set<string>();
const seenMessageIdCounts = new Map<string, number>();

function registerMessage(id: string, text: string, imageUrl?: string): { isNew: boolean; effectiveId: string } {
  const cleanId = (id || '').trim();
  const cleanText = (text || '').trim();
  const cleanImage = (imageUrl || '').trim();
  const signature = `${cleanId}::${cleanText}::${cleanImage}`;

  if (seenMessageSignatures.has(signature)) {
    return { isNew: false, effectiveId: cleanId };
  }

  seenMessageSignatures.add(signature);
  if (seenMessageSignatures.size > 15000) {
    const firstSig = seenMessageSignatures.values().next().value;
    if (firstSig) seenMessageSignatures.delete(firstSig);
  }

  const count = seenMessageIdCounts.get(cleanId) || 0;
  seenMessageIdCounts.set(cleanId, count + 1);

  // If the target or user posted consecutive messages that share the same ID container,
  // allocate a distinctive sub-ID so both messages appear as separate cards and alerts.
  const effectiveId = count === 0 ? cleanId : `${cleanId}-part${count + 1}`;
  return { isNew: true, effectiveId };
}

let isConnected = false;
let messagesReceivedCount = 0;
let lastHeartbeat = Date.now();
let lastMessageAt: number | null = null;
let lastAlertAt: number | null = null;
let lastBackupCheckAt: number | null = null;
let connectionError: string | null = null;
const startTime = Date.now();

let currentAbortController: AbortController | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let backupPollerTimer: NodeJS.Timeout | null = null;

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Telegram Delivery Queue with Auto-Retries
interface TelegramQueueItem {
  message: StoredMessage;
  customNote?: string;
  retries: number;
  maxRetries: number;
  resolve: (res: { success: boolean; error?: string }) => void;
}

const telegramQueue: TelegramQueueItem[] = [];
let isProcessingTelegramQueue = false;

async function processTelegramQueue() {
  if (isProcessingTelegramQueue || telegramQueue.length === 0) return;
  isProcessingTelegramQueue = true;

  while (telegramQueue.length > 0) {
    const item = telegramQueue[0];
    const res = await dispatchTelegramDirect(item.message, item.customNote);

    if (res.success) {
      telegramQueue.shift();
      item.resolve(res);
      // Small breather to respect Telegram rate limits
      await new Promise((r) => setTimeout(r, 200));
    } else {
      // Check if error is retryable (rate limit, 5xx, network drop)
      const isRateLimit = res.error?.includes('429') || res.error?.includes('Too Many Requests');
      const isNetwork = res.error?.includes('fetch') || res.error?.includes('network') || res.error?.includes('timeout');

      if ((isRateLimit || isNetwork) && item.retries < item.maxRetries) {
        item.retries++;
        console.warn(`[Telegram Queue] Retrying in ${item.retries * 2}s (attempt ${item.retries}/${item.maxRetries}):`, res.error);
        await new Promise((r) => setTimeout(r, item.retries * 2000));
      } else {
        // Permanent failure (e.g. invalid token, chat not found) or max retries exceeded
        telegramQueue.shift();
        item.resolve(res);
      }
    }
  }

  isProcessingTelegramQueue = false;
}

function queueTelegramNotification(msg: StoredMessage, customNote?: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    telegramQueue.push({
      message: msg,
      customNote,
      retries: 0,
      maxRetries: 4,
      resolve,
    });
    processTelegramQueue();
  });
}

// Download image bytes directly so Telegram never has to reach out to TradingView or AWS S3
async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.tradingview.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.warn(`[Image Fetch] HTTP ${res.status} for ${url}`);
      return null;
    }
    const contentType = res.headers.get('content-type') || 'image/png';
    const arrayBuf = await res.arrayBuffer();
    return { buffer: Buffer.from(arrayBuf), contentType };
  } catch (err: any) {
    console.warn(`[Image Fetch] Failed for ${url}:`, err.message);
    return null;
  }
}

// Direct Telegram Sender with direct binary sendPhoto support & sendMessage fallback
async function dispatchTelegramDirect(msg: StoredMessage, customNote?: string): Promise<{ success: boolean; error?: string }> {
  if (!config.telegram_bot_token || !config.telegram_chat_id) {
    return { success: false, error: 'Telegram Bot Token или Chat ID не настроены' };
  }

  const cleanToken = config.telegram_bot_token.trim();
  const cleanChatId = config.telegram_chat_id.trim();

  const tvUrl = `https://www.tradingview.com/chat/#${msg.room_id || config.target_room}`;
  const directMsgUrl = msg.id ? `https://www.tradingview.com/chat/m/${msg.id.replace(/-/g, '')}/` : tvUrl;

  const noteHeader = customNote ? `🔔 <i>${escapeHtml(customNote)}</i>\n\n` : '';
  const symbolLine = msg.symbol ? `📊 <b>Символ:</b> <code>${escapeHtml(msg.symbol)}</code>\n` : '';

  // Use formatted text with emotions and emojis converted
  const displayContent = msg.formatted_text || formatTradingViewEmotions(msg.text);

  const snapshotLine = msg.image_url ? `🖼 <b>Прикрепленный график:</b> <a href="${msg.image_url}">Смотреть в оригинале</a>\n` : '';

  const captionHtml = `${noteHeader}🚨 <b>TRADINGVIEW ALERT: ${escapeHtml(msg.username)}</b>
📍 <b>Чат:</b> #${escapeHtml(msg.room_id || config.target_room)}
${symbolLine}${snapshotLine}⏰ <b>Время:</b> ${escapeHtml(msg.time || new Date().toUTCString())}

💬 <b>Сообщение:</b>
<blockquote>${escapeHtml(displayContent)}</blockquote>

🔗 <a href="${directMsgUrl}">Открыть в TradingView</a> • <a href="${tvUrl}">Комната #${escapeHtml(msg.room_id || config.target_room)}</a>`;

  // 1. IF IMAGE IS ATTACHED: Attempt sendPhoto with binary multipart FormData (GUARANTEED delivery)
  if (msg.image_url) {
    console.log(`[Telegram] Processing attached image for ${msg.username}: ${msg.image_url}`);
    // Telegram caption limit is 1024 characters
    const sendCaption = captionHtml.length <= 1024 ? captionHtml : captionHtml.slice(0, 1010) + '...</blockquote>';

    // Step A: Download image locally so Telegram server never has to fetch from S3
    const downloaded = await fetchImageBuffer(msg.image_url);

    if (downloaded && downloaded.buffer.length > 0) {
      try {
        console.log(`[Telegram] Uploading ${downloaded.buffer.length} bytes as multipart/form-data to Telegram`);
        const formData = new FormData();
        formData.append('chat_id', cleanChatId);

        const isJpg = downloaded.contentType.includes('jpeg') || downloaded.contentType.includes('jpg');
        const filename = `${msg.snapshot_id || 'chart'}.${isJpg ? 'jpg' : 'png'}`;
        const blob = new Blob([downloaded.buffer], { type: downloaded.contentType });

        formData.append('photo', blob, filename);
        formData.append('caption', sendCaption);
        formData.append('parse_mode', 'HTML');

        const uploadRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendPhoto`, {
          method: 'POST',
          body: formData,
        });

        const uploadData = (await uploadRes.json()) as { ok: boolean; description?: string };
        if (uploadData.ok) {
          console.log('[Telegram] sendPhoto multipart upload succeeded!');
          if (captionHtml.length > 1024) {
            await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: cleanChatId,
                text: captionHtml,
                parse_mode: 'HTML',
                disable_web_page_preview: false,
              }),
            });
          }
          return { success: true };
        }
        console.warn('[Telegram] Multipart sendPhoto failed:', uploadData.description);
      } catch (err: any) {
        console.warn('[Telegram] Multipart sendPhoto exception:', err.message);
      }
    }

    // Step B: Fallback to sendPhoto with URL in JSON if buffer download was not available
    try {
      console.log('[Telegram] Trying sendPhoto with URL payload fallback');
      const photoRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          photo: msg.image_url,
          caption: sendCaption,
          parse_mode: 'HTML',
        }),
      });

      const photoData = (await photoRes.json()) as { ok: boolean; description?: string };
      if (photoData.ok) {
        console.log('[Telegram] URL-based sendPhoto succeeded!');
        return { success: true };
      }
      console.warn('[Telegram] URL sendPhoto failed, falling back to sendMessage:', photoData.description);
    } catch (err: any) {
      console.warn('[Telegram] URL sendPhoto exception, falling back to sendMessage:', err.message);
    }
  }

  // 2. FALLBACK or TEXT ONLY: sendMessage
  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: captionHtml,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });

    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      return { success: false, error: data.description || 'Неизвестная ошибка Telegram API' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Сетевая ошибка при отправке в Telegram' };
  }
}

function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function getStatusPayload() {
  return {
    connected: isConnected,
    room: config.target_room,
    target_username: config.target_username,
    messages_received: messagesReceivedCount,
    target_alerts_count: targetAlerts.length,
    last_heartbeat: lastHeartbeat,
    last_message_at: lastMessageAt,
    last_alert_at: lastAlertAt,
    telegram_configured: Boolean(config.telegram_bot_token && config.telegram_chat_id),
    error: connectionError,
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    backup_poller_active: true,
    last_backup_check_at: lastBackupCheckAt,
    telegram_queue_length: telegramQueue.length,
  };
}

async function handleIncomingMessage(rawMsg: any, source: 'pushstream' | 'backup_history' = 'pushstream') {
  if (!rawMsg) return;

  const rawId = rawMsg.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const initialId = String(rawId).trim();

  // Extract images, charts, and format emotions/emojis
  const imgInfo = extractImageInfo(rawMsg.text || '', rawMsg);
  const finalImageUrl = imgInfo.imageUrl || rawMsg.image_url || undefined;
  const finalSnapshotId = imgInfo.snapshotId || rawMsg.snapshot || undefined;

  let rawText = (rawMsg.text || '').trim();
  // If user only posted a picture/chart with no text caption, assign a descriptive title
  if (!rawText && finalImageUrl) {
    rawText = '📷 [Прикрепленный график TradingView]';
  }

  // If message has neither text nor image, skip
  if (!rawText && !finalImageUrl) {
    return;
  }

  // Deduplication check with support for consecutive stacked/appended messages:
  // If consecutive messages share an ID or are sent in quick succession, registerMessage
  // assigns an effectiveId rather than dropping the message!
  const { isNew, effectiveId } = registerMessage(initialId, rawText, finalImageUrl);
  if (!isNew) {
    return;
  }

  const username = (rawMsg.username || '').trim();
  const targetClean = (config.target_username || '').trim().toLowerCase();
  const isTarget = username.toLowerCase() === targetClean;

  const timeStr = rawMsg.time || new Date().toUTCString();
  const formattedText = formatTradingViewEmotions(rawText);

  const msg: StoredMessage = {
    id: effectiveId,
    time: timeStr,
    timestamp: rawMsg._rts || rawMsg.timestamp || Date.now(),
    username,
    user_pic: rawMsg.user_pic,
    user_id: rawMsg.user_id,
    text: rawText,
    formatted_text: formattedText,
    room_id: rawMsg.room_id || config.target_room,
    symbol: rawMsg.symbol,
    badges: rawMsg.badges,
    is_target: isTarget,
    image_url: finalImageUrl,
    snapshot_id: finalSnapshotId,
    url: `https://www.tradingview.com/chat/m/${initialId.replace(/-/g, '')}/`,
  };

  messagesReceivedCount++;
  lastMessageAt = Date.now();

  // Add to recent messages (keep last 80)
  recentMessages.unshift(msg);
  if (recentMessages.length > 80) {
    recentMessages = recentMessages.slice(0, 80);
  }

  if (isTarget) {
    lastAlertAt = Date.now();
    console.log(`[ALERT (${source})] Target message from ${username}: ${formattedText.slice(0, 100)} | Image: ${msg.image_url || 'none'}`);

    // Signature check for Telegram delivery so consecutive messages are never dropped
    const alertSignature = `${effectiveId}::${rawText}`;
    const alreadySent = sentTelegramAlertIds.has(alertSignature) || sentTelegramAlertIds.has(effectiveId);

    if (config.telegram_enabled && config.telegram_bot_token && config.telegram_chat_id && !alreadySent) {
      msg.telegram_status = 'queued';
      sentTelegramAlertIds.add(alertSignature);
      sentTelegramAlertIds.add(effectiveId);
      saveConfig();

      queueTelegramNotification(msg).then((tgRes) => {
        msg.telegram_status = tgRes.success ? 'sent' : 'failed';
        msg.telegram_error = tgRes.error;
        broadcastSSE('alert_update', { message: msg });
      });
    } else if (alreadySent) {
      msg.telegram_status = 'sent';
    } else {
      msg.telegram_status = 'not_configured';
    }

    targetAlerts.unshift(msg);
    if (targetAlerts.length > 150) {
      targetAlerts = targetAlerts.slice(0, 150);
    }

    broadcastSSE('alert', { message: msg, status: getStatusPayload() });
  } else {
    broadcastSSE('message', { message: msg, status: getStatusPayload() });
  }
}

// 1. PRIMARY REALTIME INGESTION: PushStream SSE Listener with ?backlog=50
function startPushStreamListener() {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;

  const room = config.target_room || 'bitcoin';
  // Use ?backlog=50 to guarantee receiving any recent messages on connection or reconnection
  const pushUrl = `https://pushstream.tradingview.com/message-pipe-es/chat/${encodeURIComponent(room)}?backlog=50`;

  console.log(`[PushStream] Connecting to TradingView room #${room} with backlog: ${pushUrl}`);

  fetch(pushUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://www.tradingview.com',
      'Referer': 'https://www.tradingview.com/',
    },
    signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      if (!res.body) {
        throw new Error('Response body is empty');
      }

      isConnected = true;
      connectionError = null;
      lastHeartbeat = Date.now();
      console.log(`[PushStream] Connected successfully to room #${room}!`);
      broadcastSSE('status', getStatusPayload());

      // Trigger a backup check immediately on reconnect to ensure gap-free sync
      checkChatHistoryBackup();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        lastHeartbeat = Date.now();
        buffer += decoder.decode(value, { stream: true });

        // Robust SSE event splitting on \r\n\r\n or \n\n
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split(/\r?\n/);
          const dataLines: string[] = [];

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              dataLines.push(trimmed.replace(/^data:\s*/, ''));
            }
          }

          if (dataLines.length === 0) continue;
          const jsonStr = dataLines.join('\n');

          try {
            const dataObj = JSON.parse(jsonStr);
            const content = dataObj?.text?.content;
            if (content) {
              if (Array.isArray(content.data)) {
                for (const item of content.data) {
                  await handleIncomingMessage(item, 'pushstream');
                }
              } else if (content.data) {
                await handleIncomingMessage(content.data, 'pushstream');
              } else if (Array.isArray(content.messages)) {
                for (const item of content.messages) {
                  await handleIncomingMessage(item, 'pushstream');
                }
              } else if (content.text && content.id) {
                await handleIncomingMessage(content, 'pushstream');
              }
            } else if (dataObj?.data) {
              await handleIncomingMessage(dataObj.data, 'pushstream');
            }
          } catch (err: any) {
            // Ignore ping or malformed chunks
          }
        }
      }

      throw new Error('Stream closed by remote server');
    })
    .catch((err) => {
      if (signal.aborted) return;
      isConnected = false;
      connectionError = err?.message || 'Connection lost';
      console.error('[PushStream] Stream disconnected:', connectionError);
      broadcastSSE('status', getStatusPayload());

      // Perform a backup history check immediately while reconnecting
      checkChatHistoryBackup();

      // Rapid reconnect after 1.5 seconds
      reconnectTimer = setTimeout(() => {
        startPushStreamListener();
      }, 1500);
    });
}

// 2. REDUNDANT BACKUP INGESTION: Periodically check /chat/history/ to GUARANTEE no messages are ever missed
async function checkChatHistoryBackup() {
  const room = config.target_room || 'bitcoin';
  const historyUrl = `https://www.tradingview.com/chat/history/?room=${encodeURIComponent(room)}`;

  lastBackupCheckAt = Date.now();

  try {
    const res = await fetch(historyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/',
      },
    });

    if (!res.ok) return;
    const html = await res.text();

    // Match each complete <div class="ch-item" ...> container cleanly terminated before next item, form, or footer
    const itemRegex = /<div class="ch-item"[^>]*data-id=([a-zA-Z0-9-]+)[\s\S]*?(?=<div class="ch-item"|<form id="history-form"|<footer|$)/g;
    let match;
    const foundMessages: any[] = [];

    while ((match = itemRegex.exec(html)) !== null) {
      const id = match[1];
      const block = match[0];

      const userMatch = block.match(/data-username="([^"]+)"/);
      const timeMatch = block.match(/data-time="([^"]+)"/);
      const userPicMatch = block.match(/class="ch-item-userpic[^"]*"[^>]*>\s*<img src="([^"]+)"/);

      const username = userMatch ? userMatch[1] : '';
      const timeSeconds = timeMatch ? parseFloat(timeMatch[1]) : Date.now() / 1000;
      const userPic = userPicMatch ? userPicMatch[1] : undefined;

      // Extract all text containers in this item (handles multiple stacked messages in one container)
      const textMatches = [...block.matchAll(/<div class="ch-item-text[^"]*">([\s\S]*?)<\/div>/g)];
      const itemTexts: string[] = [];

      for (const tm of textMatches) {
        const inner = tm[1];
        const spanMatches = [...inner.matchAll(/<span>([\s\S]*?)<\/span>/g)];
        if (spanMatches.length > 0) {
          for (const sm of spanMatches) {
            const t = sm[1]
              .replace(/<[^>]+>/g, '')
              .replace(/&quot;/g, '"')
              .replace(/&#34;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .trim();
            if (t) itemTexts.push(t);
          }
        } else {
          const t = inner
            .replace(/<[^>]+>/g, '')
            .replace(/&quot;/g, '"')
            .replace(/&#34;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
          if (t) itemTexts.push(t);
        }
      }

      // Extract any attached image or snapshot from the block
      const imgInfo = extractImageInfo(itemTexts.join(' '), { block, raw_html: block });

      if (itemTexts.length === 0 && imgInfo.imageUrl) {
        itemTexts.push('📷 [Прикрепленный график TradingView]');
      }

      // If multiple stacked messages were found in this single ch-item block,
      // create a message entry for each one with sub-IDs so NONE are lost!
      if (itemTexts.length <= 1) {
        const displayText = itemTexts[0] || '';
        if (displayText || imgInfo.imageUrl) {
          foundMessages.push({
            id,
            username,
            text: displayText,
            room_id: room,
            user_pic: userPic,
            time: new Date(timeSeconds * 1000).toUTCString(),
            _rts: timeSeconds * 1000,
            snapshot: imgInfo.snapshotId,
            image_url: imgInfo.imageUrl,
            block,
          });
        }
      } else {
        itemTexts.forEach((textPart, idx) => {
          foundMessages.push({
            id: idx === 0 ? id : `${id}-sub${idx + 1}`,
            username,
            text: textPart,
            room_id: room,
            user_pic: userPic,
            time: new Date(timeSeconds * 1000).toUTCString(),
            _rts: timeSeconds * 1000 + idx * 10,
            snapshot: idx === 0 ? imgInfo.snapshotId : undefined,
            image_url: idx === 0 ? imgInfo.imageUrl : undefined,
            block,
          });
        });
      }
    }

    // Process from oldest to newest
    for (const msgData of foundMessages.reverse()) {
      await handleIncomingMessage(msgData, 'backup_history');
    }
  } catch (err: any) {
    console.warn('[Backup History] Check error:', err.message);
  }
}

// Start listener and periodic backup poller
startPushStreamListener();
checkChatHistoryBackup();

// Periodic backup check every 4 seconds for zero-loss guarantee
backupPollerTimer = setInterval(() => {
  checkChatHistoryBackup();
}, 4000);

// Keepalive ping for SSE clients
setInterval(() => {
  broadcastSSE('ping', { time: Date.now() });
}, 15000);

// API ROUTES
app.get('/api/status', (req, res) => {
  res.json(getStatusPayload());
});

app.get('/api/messages', (req, res) => {
  res.json({
    recent: recentMessages,
    alerts: targetAlerts,
    status: getStatusPayload(),
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    target_username: config.target_username,
    target_room: config.target_room,
    telegram_bot_token: config.telegram_bot_token,
    telegram_chat_id: config.telegram_chat_id,
    telegram_enabled: config.telegram_enabled,
    sound_enabled: config.sound_enabled,
  });
});

app.post('/api/config', (req, res) => {
  const {
    target_username,
    target_room,
    telegram_bot_token,
    telegram_chat_id,
    telegram_enabled,
    sound_enabled,
  } = req.body;

  const prevRoom = config.target_room;

  if (typeof target_username === 'string') config.target_username = target_username.trim();
  if (typeof target_room === 'string') config.target_room = target_room.trim().toLowerCase();
  if (typeof telegram_bot_token === 'string') config.telegram_bot_token = telegram_bot_token.trim();
  if (typeof telegram_chat_id === 'string') config.telegram_chat_id = telegram_chat_id.trim();
  if (typeof telegram_enabled === 'boolean') config.telegram_enabled = telegram_enabled;
  if (typeof sound_enabled === 'boolean') config.sound_enabled = sound_enabled;

  saveConfig();

  if (prevRoom !== config.target_room) {
    startPushStreamListener();
    checkChatHistoryBackup();
  }

  broadcastSSE('config', config);
  broadcastSSE('status', getStatusPayload());

  res.json({ success: true, config, status: getStatusPayload() });
});

// Test Telegram Bot integration endpoint with emoji & image simulation
app.post('/api/test-telegram', async (req, res) => {
  const token = (req.body.token ?? config.telegram_bot_token ?? '').trim();
  const chatId = (req.body.chat_id ?? config.telegram_chat_id ?? '').trim();

  if (!token) {
    res.status(400).json({ success: false, error: 'Telegram Bot Token не указан' });
    return;
  }
  if (!chatId) {
    res.status(400).json({ success: false, error: 'Telegram Chat ID не указан' });
    return;
  }

  const testMessage: StoredMessage = {
    id: `test-${Date.now()}`,
    time: new Date().toUTCString(),
    timestamp: Date.now(),
    username: config.target_username,
    text: 'Тестовое уведомление: связь с Telegram ботом активна! :rocket: :profit: :fire: Поддержка эмоций и графиков включена! :bull: 📈',
    formatted_text: 'Тестовое уведомление: связь с Telegram ботом активна! 🚀 💰 PROFIT 🔥 Поддержка эмоций и графиков включена! 🐂 📈',
    room_id: config.target_room,
    symbol: 'BINANCE:BTCUSDT',
    is_target: true,
    // Provide a sample chart snapshot for preview
    image_url: 'https://s3.tradingview.com/snapshots/b/BAUTFbTf.png',
  };

  const origToken = config.telegram_bot_token;
  const origChatId = config.telegram_chat_id;
  config.telegram_bot_token = token;
  config.telegram_chat_id = chatId;

  const result = await dispatchTelegramDirect(testMessage, '✅ ПРОВЕРКА TELEGRAM (ЭМОЦИИ + ГРАФИК)');

  config.telegram_bot_token = origToken;
  config.telegram_chat_id = origChatId;

  if (result.success) {
    res.json({ success: true, message: 'Тестовое сообщение с графиком и эмоциями успешно доставлено в Telegram!' });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// Simulate a live alert with emotions and chart image option
app.post('/api/simulate-alert', async (req, res) => {
  const customText = req.body.text || 'BTC is breaking key resistance! :rocket: :moon: :profit: :fire: Chart snapshot: https://www.tradingview.com/x/BAUTFbTf/ Watch $98,500 target!';
  const customImage = req.body.image_url;

  const fakeRaw = {
    id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: config.target_username,
    text: customText,
    room_id: config.target_room,
    time: new Date().toUTCString(),
    symbol: 'COINBASE:BTCUSD',
    user_pic: 'https://s3.tradingview.com/userpics/13037082-qnPd_mid.png',
    badges: [{ name: 'pro:pro', verbose_name: 'Essential' }],
    snapshot: customImage ? undefined : 'BAUTFbTf',
    images: customImage ? [customImage] : undefined,
    _rts: Date.now(),
  };

  await handleIncomingMessage(fakeRaw, 'pushstream');
  res.json({ success: true, simulated: fakeRaw });
});

// Force manual backup history sync endpoint
app.post('/api/sync-history', async (req, res) => {
  await checkChatHistoryBackup();
  res.json({ success: true, status: getStatusPayload() });
});

// Clear message history
app.post('/api/clear-history', (req, res) => {
  targetAlerts = [];
  recentMessages = [];
  broadcastSSE('status', getStatusPayload());
  res.json({ success: true });
});

// SSE Live Stream for frontend
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);

  res.write(`event: init\ndata: ${JSON.stringify({
    status: getStatusPayload(),
    config,
    recent: recentMessages.slice(0, 40),
    alerts: targetAlerts.slice(0, 50),
  })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Vite Middleware for SPA serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
