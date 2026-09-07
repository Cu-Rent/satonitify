/**
 * Web Audio API synthesizer for clean, pleasant alert sounds.
 * Avoids any external asset loading issues or browser blocked audio codecs.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playTargetAlertSound(volume = 0.8) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.01, Math.min(volume, 1)), now);
    masterGain.connect(ctx.destination);

    // Two-tone bright chime (A5 -> E6)
    const playTone = (freq: number, start: number, duration: number, decay = 0.3) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.4, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(start);
      osc.stop(start + duration);
    };

    // First tone (A5 = 880Hz)
    playTone(880, now, 0.35);
    // Second tone (C#6 = 1108Hz)
    playTone(1108, now + 0.08, 0.45);
    // Third high harmonic tone (E6 = 1318Hz)
    playTone(1318, now + 0.16, 0.6);
  } catch (err) {
    console.warn('Could not play synthesized audio chime:', err);
  }
}

export function playTestSound() {
  playTargetAlertSound(0.7);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export function sendDesktopNotification(title: string, body: string, icon?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: icon || 'https://www.tradingview.com/static/images/favicon.ico',
      });
    } catch (e) {
      console.warn('Desktop notification failed:', e);
    }
  }
}
