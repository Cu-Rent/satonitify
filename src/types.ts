export interface TradingViewMessage {
  id: string;
  time: string;
  timestamp: number;
  username: string;
  user_pic?: string;
  user_id?: number;
  text: string;
  room_id: string;
  symbol?: string;
  badges?: Array<{ name: string; verbose_name: string }>;
  is_target: boolean;
  image_url?: string;
  snapshot_id?: string;
  formatted_text?: string;
  telegram_status?: 'sent' | 'failed' | 'not_configured' | 'skipped' | 'queued';
  telegram_error?: string;
  url?: string;
}

export interface MonitorConfig {
  target_username: string;
  target_room: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
  telegram_enabled: boolean;
  sound_enabled: boolean;
}

export interface MonitorStatus {
  connected: boolean;
  room: string;
  target_username: string;
  messages_received: number;
  target_alerts_count: number;
  last_heartbeat: number;
  last_message_at: number | null;
  last_alert_at: number | null;
  telegram_configured: boolean;
  error: string | null;
  uptime_seconds: number;
  backup_poller_active: boolean;
  last_backup_check_at: number | null;
  telegram_queue_length: number;
}
