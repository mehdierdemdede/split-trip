import * as Sentry from '@sentry/react-native';

let initialized = false;

export function initMonitoring(): void {
  if (initialized) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    enabled: true,
    enableNativeFramesTracking: true,
    tracesSampleRate: 0.2,
  });

  initialized = true;
}
