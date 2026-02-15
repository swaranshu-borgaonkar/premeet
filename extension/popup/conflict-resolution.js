/**
 * Conflict Resolution UI for offline sync
 * Shows when local and server versions of a note diverge
 */

import { resolveConflict, getPendingConflicts } from '../lib/cache.js';

/**
 * Check for and display any pending conflicts
 * Call this when the popup opens or after sync completes
 */
export async function checkAndShowConflicts() {
  const conflicts = await getPendingConflicts();
  if (conflicts.length === 0) return;

  const resolutions = await processConflicts(conflicts);

  // Apply each resolution
  for (const res of resolutions) {
    const conflict = conflicts.find(c => c.recordId === res.recordId);
    if (!conflict) continue;

    try {
      await resolveConflict(
        res.recordId,
        res.recordType === 'note' ? 'notes' : 'contacts',
        res.resolution,
        conflict.localVersion,
        conflict.serverVersion
      );
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  }
}

/**
 * Show conflict resolution dialog
 * @param {Object} localVersion - The local version of the record
 * @param {Object} serverVersion - The server version of the record
 * @param {string} recordType - Type of record ('note', 'contact')
 * @returns {Promise<string>} Resolution choice: 'keep_local', 'keep_server'
 */
export function showConflictDialog(localVersion, serverVersion, recordType) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'conflict-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'conflict-dialog';

    const localDisplay = formatVersionDisplay(localVersion, recordType);
    const serverDisplay = formatVersionDisplay(serverVersion, recordType);

    dialog.innerHTML = `
      <h3>Sync Conflict</h3>
      <p>This ${recordType} was modified both locally and on the server.</p>

      <div class="conflict-versions">
        <div class="conflict-version">
          <h4>Your Version ${localVersion.version ? `(v${localVersion.version})` : ''}</h4>
          <div class="version-content">
            ${localDisplay}
            <span class="version-date">Modified: ${formatDate(localVersion.updated_at)}</span>
          </div>
        </div>

        <div class="conflict-version">
          <h4>Server Version ${serverVersion.version ? `(v${serverVersion.version})` : ''}</h4>
          <div class="version-content">
            ${serverDisplay}
            <span class="version-date">Modified: ${formatDate(serverVersion.updated_at)}</span>
          </div>
        </div>
      </div>

      <div class="conflict-actions">
        <button class="btn btn-primary" data-choice="keep_local">Keep Mine</button>
        <button class="btn btn-secondary" data-choice="keep_server">Keep Theirs</button>
      </div>
    `;

    dialog.querySelectorAll('[data-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.remove();
        resolve(btn.dataset.choice);
      });
    });

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  });
}

/**
 * Format record data for display in the conflict dialog
 */
function formatVersionDisplay(version, recordType) {
  if (recordType === 'note') {
    return `
      <p class="version-summary">${escapeHtml(version.summary || '')}</p>
      <p class="version-detail">${escapeHtml(version.detailed_notes || '')}</p>
    `;
  }
  if (recordType === 'contact') {
    return `
      <p class="version-summary">${escapeHtml(version.full_name || '')}</p>
      <p class="version-detail">${escapeHtml(version.email || '')}</p>
    `;
  }
  return `<p class="version-detail">${escapeHtml(JSON.stringify(version))}</p>`;
}

/**
 * Process a list of conflicts sequentially
 */
export async function processConflicts(conflicts) {
  const resolutions = [];

  for (const conflict of conflicts) {
    const choice = await showConflictDialog(
      conflict.localVersion,
      conflict.serverVersion,
      conflict.recordType
    );

    resolutions.push({
      recordId: conflict.recordId,
      recordType: conflict.recordType,
      resolution: choice,
      resolvedAt: new Date().toISOString(),
    });
  }

  return resolutions;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(isoString) {
  if (!isoString) return 'Unknown';
  return new Date(isoString).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Inject conflict dialog styles
const style = document.createElement('style');
style.textContent = `
  .conflict-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }
  .conflict-dialog {
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }
  .conflict-dialog h3 {
    font-size: 18px;
    margin-bottom: 8px;
  }
  .conflict-dialog > p {
    color: #6b7280;
    margin-bottom: 16px;
    font-size: 14px;
  }
  .conflict-versions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }
  .conflict-version h4 {
    font-size: 13px;
    color: #374151;
    margin-bottom: 8px;
  }
  .version-content {
    background: #f9fafb;
    border-radius: 8px;
    padding: 12px;
    font-size: 13px;
  }
  .version-summary {
    font-weight: 500;
    margin-bottom: 4px;
  }
  .version-detail {
    color: #6b7280;
    margin-bottom: 8px;
  }
  .version-date {
    font-size: 11px;
    color: #9ca3af;
  }
  .conflict-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
`;
document.head.appendChild(style);
