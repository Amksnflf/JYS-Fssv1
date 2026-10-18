/**
 * 行情 WebSocket 客户端单例
 * - 单条 ws 连接，多组件复用
 * - 支持订阅/取消订阅 symbols（引用计数）
 * - 自动重连 + 心跳
 *
 * 使用：
 *   const off = subscribeQuote(['BTCUSDT','ETHUSDT'], (tick) => { ... });
 *   off();
 */

export interface WsTick {
  symbol: string;
  price: string;
  change: string;
  volume?: string;
  ts: number;
}

type Listener = (tick: WsTick) => void;

const subRefs = new Map<string, number>();
const listeners = new Set<Listener>();
const tickCache = new Map<string, WsTick>();
const IDLE_CLOSE_DELAY_MS = 15_000;

let ws: WebSocket | null = null;
let pingTimer: number | null = null;
let idleCloseTimer: number | null = null;
let reconnectDelay = 1000;
let manuallyClosed = false;

function clearIdleCloseTimer() {
  if (idleCloseTimer) {
    window.clearTimeout(idleCloseTimer);
    idleCloseTimer = null;
  }
}

function scheduleIdleClose() {
  clearIdleCloseTimer();
  idleCloseTimer = window.setTimeout(() => {
    if (subRefs.size > 0 || listeners.size > 0) return;
    manuallyClosed = true;
    try { ws?.close(); } catch { /* noop */ }
    ws = null;
    idleCloseTimer = null;
  }, IDLE_CLOSE_DELAY_MS);
}

function buildUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/api/ws/quote`;
}

function ensureConnected() {
  clearIdleCloseTimer();
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  manuallyClosed = false;
  ws = new WebSocket(buildUrl());

  ws.onopen = () => {
    reconnectDelay = 1000;
    const all = Array.from(subRefs.keys());
    if (all.length) sendRaw({ action: 'sub', symbols: all });
    if (pingTimer) window.clearInterval(pingTimer);
    pingTimer = window.setInterval(() => sendRaw({ action: 'ping' }), 20000);
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'tick') {
        const tick: WsTick = {
          symbol: msg.symbol,
          price: msg.price,
          change: msg.change,
          volume: msg.volume,
          ts: msg.ts,
        };
        tickCache.set(tick.symbol, tick);
        listeners.forEach((l) => l(tick));
      }
    } catch {
      // ignore
    }
  };

  ws.onclose = () => {
    if (pingTimer) {
      window.clearInterval(pingTimer);
      pingTimer = null;
    }
    if (manuallyClosed) return;
    window.setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 15000);
      ensureConnected();
    }, reconnectDelay);
  };

  ws.onerror = () => {
    try { ws?.close(); } catch { /* noop */ }
  };
}

function sendRaw(msg: Record<string, unknown>) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function subscribeQuote(symbols: string[], listener: Listener): () => void {
  ensureConnected();
  clearIdleCloseTimer();

  const newOnes: string[] = [];
  symbols.forEach((s) => {
    const cur = subRefs.get(s) || 0;
    subRefs.set(s, cur + 1);
    if (cur === 0) newOnes.push(s);
  });
  if (newOnes.length) sendRaw({ action: 'sub', symbols: newOnes });

  listeners.add(listener);
  symbols.forEach((symbol) => {
    const cached = tickCache.get(symbol);
    if (cached) listener(cached);
  });

  return () => {
    listeners.delete(listener);
    const removeOnes: string[] = [];
    symbols.forEach((s) => {
      const cur = subRefs.get(s) || 0;
      if (cur <= 1) {
        subRefs.delete(s);
        removeOnes.push(s);
      } else {
        subRefs.set(s, cur - 1);
      }
    });
    if (removeOnes.length) sendRaw({ action: 'unsub', symbols: removeOnes });

    if (subRefs.size === 0 && listeners.size === 0) {
      scheduleIdleClose();
    }
  };
}

export function readCachedQuoteTicks(symbols?: string[]): Record<string, WsTick> {
  if (!symbols?.length) {
    return Object.fromEntries(tickCache.entries());
  }
  const next: Record<string, WsTick> = {};
  symbols.forEach((symbol) => {
    const cached = tickCache.get(symbol);
    if (cached) next[symbol] = cached;
  });
  return next;
}
