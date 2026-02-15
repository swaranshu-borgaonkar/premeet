const SENTRY_DSN = ''; // Set via config

/**
 * Lightweight Sentry integration for Chrome extension
 * Uses Sentry's envelope API directly to avoid large SDK bundle
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured');
    return;
  }

  // Catch unhandled errors
  self.addEventListener('error', (event) => {
    captureException(event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  // Catch unhandled promise rejections
  self.addEventListener('unhandledrejection', (event) => {
    captureException(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      { type: 'unhandledrejection' }
    );
  });
}

/**
 * Capture an exception and send to Sentry
 */
export async function captureException(error, extra = {}) {
  if (!SENTRY_DSN) return;

  // Sample at 10%
  if (Math.random() > 0.1) return;

  try {
    const dsn = new URL(SENTRY_DSN);
    const projectId = dsn.pathname.replace('/', '');
    const publicKey = dsn.username;

    const envelope = createEnvelope(error, extra, projectId);
    const url = `https://${dsn.host}/api/${projectId}/envelope/?sentry_key=${publicKey}&sentry_version=7`;

    await fetch(url, {
      method: 'POST',
      body: envelope
    });
  } catch (e) {
    console.error('Failed to send to Sentry:', e);
  }
}

/**
 * Capture a breadcrumb message
 */
export function captureBreadcrumb(message, category = 'default', level = 'info') {
  // Store breadcrumbs in memory for context in error reports
  if (!self._sentryBreadcrumbs) self._sentryBreadcrumbs = [];
  self._sentryBreadcrumbs.push({
    timestamp: Date.now() / 1000,
    message,
    category,
    level
  });
  // Keep last 20 breadcrumbs
  if (self._sentryBreadcrumbs.length > 20) {
    self._sentryBreadcrumbs = self._sentryBreadcrumbs.slice(-20);
  }
}

function createEnvelope(error, extra, projectId) {
  const header = JSON.stringify({
    event_id: crypto.randomUUID().replace(/-/g, ''),
    sent_at: new Date().toISOString()
  });

  const event = JSON.stringify({
    exception: {
      values: [{
        type: error.name || 'Error',
        value: error.message,
        stacktrace: error.stack ? parseStack(error.stack) : undefined
      }]
    },
    level: 'error',
    platform: 'javascript',
    environment: 'production',
    tags: {
      runtime: 'chrome-extension'
    },
    extra,
    breadcrumbs: self._sentryBreadcrumbs || []
  });

  const itemHeader = JSON.stringify({
    type: 'event',
    length: new TextEncoder().encode(event).length
  });

  return `${header}\n${itemHeader}\n${event}`;
}

function parseStack(stack) {
  const frames = stack.split('\n').slice(1).map(line => {
    const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
    if (match) {
      return {
        function: match[1],
        filename: match[2],
        lineno: parseInt(match[3]),
        colno: parseInt(match[4])
      };
    }
    return null;
  }).filter(Boolean);

  return { frames: frames.reverse() };
}
