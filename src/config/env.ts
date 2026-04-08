import Constants from 'expo-constants';

type Environment = 'development' | 'staging' | 'production';

interface EnvConfig {
  API_BASE_URL: string;
  /** Socket.IO handshake URL (no `/api` path). Often a dedicated realtime port in dev. */
  REALTIME_BASE_URL: string;
  /** Singlish → Sinhala Flask service (no `/api` prefix). */
  SINGLISH_CONVERSION_BASE_URL: string;
  REQUEST_TIMEOUT: number;
}

type ManifestExtra = {
  apiBaseUrl?: string;
  realtimeBaseUrl?: string;
  /** Call signaling Socket.IO origin (no path; uses `/call/socket.io`). Defaults to API host without `/api`. */
  callSignalingBaseUrl?: string;
  /** Override Singlish conversion service origin, e.g. `http://192.168.1.5:5050` */
  singlishConversionBaseUrl?: string;
  /** PC LAN IPv4 for physical devices when Metro uses a tunnel URL (`*.exp.direct`, ngrok). Not used when Metro is `localhost` (simulator / same machine). */
  devLanHost?: string;
  releaseChannel?: string;
};

function getManifestExtra(): ManifestExtra | undefined {
  return (Constants.expoConfig?.extra ?? Constants.manifest?.extra) as ManifestExtra | undefined;
}

/**
 * Expo `hostUri` / `debuggerHost` is where the **Metro bundler** is reached.
 * With `--tunnel`, that is `*.exp.direct` — not your machine, so `http://that:4225` never reaches the API.
 * `localhost` / `127.0.0.1` is the device itself on a physical phone.
 */
function extractReachableDevHost(): string | null {
  const debuggerHost =
    Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost;
  if (!debuggerHost) return null;

  const host = debuggerHost.split(':')[0].trim();
  if (!host) return null;

  const lower = host.toLowerCase();
  if (lower === 'localhost' || lower === '127.0.0.1') return null;
  if (lower.endsWith('.exp.direct')) return null;
  if (lower.includes('ngrok') || lower.endsWith('.ngrok.io') || lower.endsWith('.ngrok-free.app')) {
    return null;
  }

  return host;
}

function getMetroDevHostname(): string {
  const raw = Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost ?? '';
  return raw.split(':')[0].trim();
}

function isTunnelMetroHost(hostLower: string): boolean {
  return (
    hostLower.endsWith('.exp.direct') ||
    hostLower.includes('ngrok') ||
    hostLower.endsWith('.ngrok.io') ||
    hostLower.endsWith('.ngrok-free.app')
  );
}

/**
 * Host for local HTTP API and Socket.IO in dev (no port).
 * Matches `staging_v1` when Metro is LAN or localhost; uses `devLanHost` only for tunnel/proxy Metro hosts.
 */
function resolveDevBackendHost(): string {
  const ex = getManifestExtra();
  const manual = ex?.devLanHost?.trim();
  const metro = getMetroDevHostname();
  const lower = metro.toLowerCase();

  const lanHost = extractReachableDevHost();
  if (lanHost) {
    return lanHost;
  }

  // Simulator / same machine: staging_v1 used Metro's localhost here — do not override with devLanHost.
  if (!metro || lower === 'localhost' || lower === '127.0.0.1') {
    return 'localhost';
  }

  if (isTunnelMetroHost(lower)) {
    if (manual) {
      return manual;
    }
    if (__DEV__) {
      console.warn(
        '[env] Metro is on a tunnel/proxy host (',
        metro,
        ') — set expo.extra.devLanHost in app.json to your PC IPv4 (same Wi‑Fi) so the phone can reach :4225 and :8228.',
      );
    }
    return 'localhost';
  }

  if (manual) {
    return manual;
  }

  if (__DEV__) {
    console.warn('[env] Could not infer backend host from Metro; using localhost.');
  }
  return 'localhost';
}

function getDevApiUrl(): string {
  const h = resolveDevBackendHost();
  return `http://${h}:4225/api`;
}

function getDevRealtimeUrl(): string {
  const h = resolveDevBackendHost();
  return `http://${h}:8228`;
}

function getDevSinglishConversionUrl(): string {
  const h = resolveDevBackendHost();
  return `http://${h}:5050`;
}

const ENV_CONFIGS: Record<Environment, EnvConfig> = {
  development: {
    API_BASE_URL: getDevApiUrl(),
    REALTIME_BASE_URL: getDevRealtimeUrl(),
    SINGLISH_CONVERSION_BASE_URL: getDevSinglishConversionUrl(),
    // Local stack (gateway → otp → WhatsApp / auth / RabbitMQ) often needs >15s on first call.
    REQUEST_TIMEOUT: 60_000,
  },
  staging: {
    API_BASE_URL: 'https://staging-api.unichat.app/api',
    REALTIME_BASE_URL: 'https://staging-api.unichat.app',
    /** Deploy the Flask converter on this host:port, or override via `expo.extra.singlishConversionBaseUrl`. */
    SINGLISH_CONVERSION_BASE_URL: 'https://staging-api.unichat.app:5050',
    REQUEST_TIMEOUT: 15_000,
  },
  production: {
    API_BASE_URL: 'https://api.unichat.app/api',
    REALTIME_BASE_URL: 'https://api.unichat.app',
    SINGLISH_CONVERSION_BASE_URL: 'https://api.unichat.app:5050',
    REQUEST_TIMEOUT: 10_000,
  },
};

function getCurrentEnvironment(): Environment {
  const channel = Constants.expoConfig?.extra?.releaseChannel as string | undefined;

  if (channel?.startsWith('prod')) return 'production';
  if (channel?.startsWith('staging')) return 'staging';
  return 'development';
}

export const ENV = ENV_CONFIGS[getCurrentEnvironment()];

/** Optional overrides from `app.config` / `app.json` → `expo.extra`. */
const extra = getManifestExtra();

/**
 * Axios `baseURL` must end with exactly one `/api` (paths are `/auth/...`, `/conversations/...`).
 * Collapses mistaken `.../api/api` from config and appends `/api` if only an origin was set.
 */
export function normalizeHttpApiBaseUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, '');
  if (!u) {
    return u;
  }
  // Collapse accidental repeats: .../api/api -> .../api (matches how Express reports /api/api/… 404s)
  u = u.replace(/(\/api)+$/g, '/api');
  if (!u.endsWith('/api')) {
    u = `${u}/api`;
  }
  return u;
}

/**
 * HTTP API root including `/api` (REST lives under this).
 * Override: `expo.extra.apiBaseUrl` (e.g. `http://192.168.1.5:4225` or `...:4225/api`).
 */
export const API_BASE_URL_RESOLVED = normalizeHttpApiBaseUrl(
  extra?.apiBaseUrl && extra.apiBaseUrl.length > 0 ? extra.apiBaseUrl : ENV.API_BASE_URL,
);

/**
 * Socket.IO server origin only (no `/api`). Override: `expo.extra.realtimeBaseUrl`.
 */
export const REALTIME_BASE_URL_RESOLVED =
  extra?.realtimeBaseUrl && extra.realtimeBaseUrl.length > 0
    ? extra.realtimeBaseUrl.replace(/\/$/, '')
    : ENV.REALTIME_BASE_URL;

/**
 * WebRTC signaling: same host as HTTP API in dev/staging/prod (gateway proxies `/call/socket.io` → call-service).
 */
export const CALL_SIGNALING_ORIGIN_RESOLVED =
  extra?.callSignalingBaseUrl && extra.callSignalingBaseUrl.length > 0
    ? extra.callSignalingBaseUrl.replace(/\/$/, '')
    : API_BASE_URL_RESOLVED.replace(/\/api$/, '');

/**
 * Singlish conversion Flask service (origin only). Override: `expo.extra.singlishConversionBaseUrl`.
 * Development default uses the same resolved host as the REST API, port 5050.
 */
export const SINGLISH_CONVERSION_BASE_URL_RESOLVED =
  extra?.singlishConversionBaseUrl && extra.singlishConversionBaseUrl.length > 0
    ? extra.singlishConversionBaseUrl.replace(/\/$/, '')
    : ENV.SINGLISH_CONVERSION_BASE_URL;
