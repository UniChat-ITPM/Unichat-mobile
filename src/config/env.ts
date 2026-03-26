import Constants from 'expo-constants';

type Environment = 'development' | 'staging' | 'production';

interface EnvConfig {
  API_BASE_URL: string;
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

const ENV_CONFIGS: Record<Environment, EnvConfig> = {
  development: {
    API_BASE_URL: getDevApiUrl(),
    REQUEST_TIMEOUT: 15_000,
  },
  staging: {
    API_BASE_URL: 'https://staging-api.unichat.app/api',
    REQUEST_TIMEOUT: 15_000,
  },
  production: {
    API_BASE_URL: 'https://api.unichat.app/api',
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
