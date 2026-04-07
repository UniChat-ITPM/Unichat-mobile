import Constants from 'expo-constants';

type Environment = 'development' | 'staging' | 'production';

interface EnvConfig {
  API_BASE_URL: string;
  /** Socket.IO handshake URL (no `/api` path). Often a dedicated realtime port in dev. */
  REALTIME_BASE_URL: string;
  REQUEST_TIMEOUT: number;
}

type ManifestExtra = {
  apiBaseUrl?: string;
  realtimeBaseUrl?: string;
  /** Your PC's LAN IPv4 (e.g. from `ipconfig`) when tunnel / localhost breaks auto-detection. */
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

/**
 * In dev mode, prefer a real LAN hostname for the API (same as Metro when using `--lan`).
 * Otherwise use `expo.extra.devLanHost`, then localhost (emulator / same machine only).
 */
function getDevApiUrl(): string {
  const ex = getManifestExtra();
  const lanHost = extractReachableDevHost();
  if (lanHost) {
    return `http://${lanHost}:4225/api`;
  }

  const manual = ex?.devLanHost?.trim();
  if (manual) {
    return `http://${manual}:4225/api`;
  }

  if (__DEV__) {
    const raw =
      Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost ?? '';
    console.warn(
      '[env] API host: Metro is at',
      raw || '(unknown)',
      '— that address cannot reach your backend on a device when using tunnel or localhost.',
      'Set expo.extra.devLanHost in app.json to your PC IPv4 (same Wi‑Fi), e.g. "192.168.8.192".',
    );
  }

  return 'http://localhost:4225/api';
}

function getDevRealtimeUrl(): string {
  const ex = getManifestExtra();
  const lanHost = extractReachableDevHost();
  if (lanHost) {
    return `http://${lanHost}:8228`;
  }

  const manual = ex?.devLanHost?.trim();
  if (manual) {
    return `http://${manual}:8228`;
  }

  return 'http://localhost:8228';
}

const ENV_CONFIGS: Record<Environment, EnvConfig> = {
  development: {
    API_BASE_URL: getDevApiUrl(),
    REALTIME_BASE_URL: getDevRealtimeUrl(),
    // Local stack (gateway → otp → WhatsApp / auth / RabbitMQ) often needs >15s on first call.
    REQUEST_TIMEOUT: 60_000,
  },
  staging: {
    API_BASE_URL: 'https://staging-api.unichat.app/api',
    REALTIME_BASE_URL: 'https://staging-api.unichat.app',
    REQUEST_TIMEOUT: 15_000,
  },
  production: {
    API_BASE_URL: 'https://api.unichat.app/api',
    REALTIME_BASE_URL: 'https://api.unichat.app',
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
