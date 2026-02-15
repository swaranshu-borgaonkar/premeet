// ─── White-Label Branding ─────────────────────────────────
// Applies enterprise branding (logo, colors, extension name)
// from workspace.branding JSONB to extension UI via CSS variables.

const DEFAULT_BRANDING = {
  primary_color: '#2563eb',
  logo_url: null,
  extension_name: 'PrepMeet',
  hide_powered_by: false,
};

let cachedBranding = null;

/**
 * Load branding config from workspace settings (cached in chrome.storage.local)
 */
export async function loadBranding() {
  if (cachedBranding) return cachedBranding;

  const { workspaceBranding } = await chrome.storage.local.get('workspaceBranding');
  cachedBranding = { ...DEFAULT_BRANDING, ...(workspaceBranding || {}) };
  return cachedBranding;
}

/**
 * Save branding config to local storage (called when workspace data is fetched)
 */
export async function saveBranding(branding) {
  cachedBranding = { ...DEFAULT_BRANDING, ...(branding || {}) };
  await chrome.storage.local.set({ workspaceBranding: cachedBranding });
}

/**
 * Apply branding to the current document via CSS custom properties.
 * Call this in popup and options page on load.
 */
export async function applyBranding(doc = document) {
  const branding = await loadBranding();
  const root = doc.documentElement;

  // Primary color and derived shades
  root.style.setProperty('--brand-color', branding.primary_color);
  root.style.setProperty('--brand-color-hover', darkenColor(branding.primary_color, 15));
  root.style.setProperty('--brand-color-light', lightenColor(branding.primary_color, 90));
  root.style.setProperty('--brand-color-ring', hexToRgba(branding.primary_color, 0.1));

  // Logo swap
  if (branding.logo_url) {
    const logos = doc.querySelectorAll('.brand-logo, .nav-brand img');
    logos.forEach(img => {
      img.src = branding.logo_url;
    });
  }

  // Extension name swap
  if (branding.extension_name && branding.extension_name !== 'PrepMeet') {
    const nameEls = doc.querySelectorAll('.brand-name, .nav-brand span, .logo h1');
    nameEls.forEach(el => {
      el.textContent = branding.extension_name;
    });
  }

  // Hide "Powered by PrepMeet" if configured
  if (branding.hide_powered_by) {
    const poweredBy = doc.querySelectorAll('.powered-by');
    poweredBy.forEach(el => {
      el.style.display = 'none';
    });
  }
}

/**
 * Clear cached branding (e.g., on sign out)
 */
export function clearBranding() {
  cachedBranding = null;
  chrome.storage.local.remove('workspaceBranding');
}

// ─── Color Utilities ──────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c =>
    Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')
  ).join('');
}

function darkenColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
}

function lightenColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor
  );
}

function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
