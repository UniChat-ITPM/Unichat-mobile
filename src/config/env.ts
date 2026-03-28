import Constants from 'expo-constants';

type Environment = 'development' | 'staging' | 'production';

interface EnvConfig {
  API_BASE_URL: string;
  /** Socket.IO handshake URL (no `/api` path). Often a dedicated realtime port in dev. */
  REALTIME_BASE_URL: string;
  REQUEST_TIMEOUT: number;
}

/**
 * In dev mode, Expo's debuggerHost gives us the LAN IP of the machine
 * running the bundler (e.g. "192.168.8.187:8081"). We extract just the IP
 * so the physical device can reach the backend over the local network.
 */
function getDevApiUrl(): string {
  const debuggerHost =
    Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost;

  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0]; // strip the port
    return `http://${ip}:4225/api`;
  }

  // Fallback — only works on emulator / same machine
  return 'http://localhost:4225/api';
}

function getDevRealtimeUrl(): string {
  const debuggerHost =
    Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost;

  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:8228`;
  }
  return 'http://localhost:8228';
}

const ENV_CONFIGS: Record<Environment, EnvConfig> = {
  development: {
    API_BASE_URL: getDevApiUrl(),
    REALTIME_BASE_URL: getDevRealtimeUrl(),
    REQUEST_TIMEOUT: 15_000,
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
const extra = (Constants.expoConfig?.extra ?? Constants.manifest?.extra) as
  | { apiBaseUrl?: string; realtimeBaseUrl?: string }
  | undefined;

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
