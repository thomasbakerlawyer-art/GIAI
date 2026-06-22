// clean-css.js
// Removes dashboard-only CSS rule blocks from style.css
// Usage: node clean-css.js
// Reads ./style.css, writes ./style.css (backs up original to style.css.bak)

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'style.css');
const backupFile = path.join(__dirname, 'style.css.bak');

if (!fs.existsSync(inputFile)) {
  console.error('ERROR: style.css not found in this folder.');
  process.exit(1);
}

const css = fs.readFileSync(inputFile, 'utf8');

// Selectors that belong to dashboard.html / dashboard.css and should be
// removed from style.css wherever they appear.
const dashboardSelectors = [
  '.dashboard-layout', '.sidebar-logo', '.sidebar-links',
  '.side-btn', '.dash-link', '.active-tab', '.dashboard-main', '.dashboard-top',
  '.user-avatar', '.portfolio-card', '.portfolio-buttons',
  '.deposit-btn', '.withdraw-btn', '.portfolio-stats', '.progress-bar', '.progress-fill',
  '.profit-green', '#claimableProfit', '#userRank', '.active-plan', '.active-plan-card',
  '.plan-status', '.activate-plan-btn', '.choose-plan-btn', '.dashboard-stats',
  '.dashboard-stat', '#reinvestBtn', '.transactions-box', '.transaction',
  '.rep-cards-container', '.rep-card', '.rep-avatar', '.rep-info', '#repImage',
  '.rep-card-live', '.rep-rank-badge', '.rep-total-votes', '.rep-country-counts',
  '.rep-country-row', '.mobile-menu-toggle', '.sidebar-overlay', '.popup-overlay',
  '.popup-box', '.wallet-box', '.wallet-card', '.wallet-address', '.confirm-btn',
  '.paid-btn', '.popup-close', '.close-popup', '.deposit-box', '.deposit-sub',
  '#depositPopup', '#withdrawPopup', '.plans-popup', '.plans-box',
  '.popup-plan', '.popup-scroll', '.admin-layout', '.admin-sidebar', '.admin-links',
  '.admin-main', '.admin-section', '.admin-stats', '.admin-stat-card',
  '.admin-request-card', '.admin-user-card', '.admin-plan-card', '#chatButton',
  '#chatWindow', '.chat-header', '#closeChat', '#chatMessages', '.user-message',
  '.bot-message', '.admin-message', '.chat-input', '.settings-box', '.settings-tabs',
  '.stab', '.stab-content', '.notif-row', '.cards-section', '.cards-title',
  '.cards-subtitle', '.cards-grid', '.giai-card-wrapper', '.giai-card', '.gold-card',
  '.black-card', '.card-top', '.card-tier', '.card-chip', '.card-number', '.card-bottom',
  '.card-label', '.card-value', '.card-shimmer', '.card-status-overlay',
  '.landing-card-banner', '.landing-card-cta', '.cards-actions',
  '.shipment-btn', '.cards-descriptions', '.card-description-box', '.card-btn-locked',
  '.sidebar' // note: also matches ".sidebar h2.logo" via selector containment check below
];

// Parse CSS into top-level blocks: selector(s) { ... } and @media { ... }
// We do a careful brace-matching parse so nested @media blocks are handled.
function parseBlocks(text) {
  const blocks = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    // skip whitespace/comments outside blocks
    while (i < n && /\s/.test(text[i])) i++;
    if (i >= n) break;

    if (text.startsWith('/*', i)) {
      const end = text.indexOf('*/', i + 2);
      const commentEnd = end === -1 ? n : end + 2;
      blocks.push({ type: 'comment', start: i, end: commentEnd, text: text.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    // find next '{'
    const braceIdx = text.indexOf('{', i);
    if (braceIdx === -1) {
      blocks.push({ type: 'other', start: i, end: n, text: text.slice(i) });
      break;
    }
    const selectorText = text.slice(i, braceIdx);

    // find matching closing brace (handles nested braces for @media)
    let depth = 1;
    let j = braceIdx + 1;
    while (j < n && depth > 0) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') depth--;
      j++;
    }
    const blockEnd = j; // exclusive

    blocks.push({
      type: 'rule',
      selector: selectorText.trim(),
      start: i,
      end: blockEnd,
      text: text.slice(i, blockEnd)
    });
    i = blockEnd;
  }
  return blocks;
}

function selectorMatchesDashboard(selectorText) {
  const sel = selectorText.trim();
  if (sel.startsWith('@media')) return null; // handled specially
  if (sel.startsWith('@keyframes')) {
    return dashboardSelectors.some(d => sel.includes(d.replace(/^[.#]/, '')));
  }
  // split multiple comma-separated selectors, check if ALL of them are dashboard-related
  const parts = sel.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return false;
  return parts.every(part =>
    dashboardSelectors.some(d => part === d || part.startsWith(d + ' ') || part.startsWith(d + ':') || part.startsWith(d + '.') || part.startsWith(d + '#') || part.startsWith(d + '>'))
  );
}

function processMediaBlock(block) {
  // block.text is like "@media(...){ ... }" -- extract inner content
  const braceIdx = block.text.indexOf('{');
  const header = block.text.slice(0, braceIdx);
  const inner = block.text.slice(braceIdx + 1, block.text.length - 1);
  const innerBlocks = parseBlocks(inner);
  let keptInner = '';
  for (const ib of innerBlocks) {
    if (ib.type === 'rule') {
      if (!selectorMatchesDashboard(ib.selector)) {
        keptInner += ib.text + '\n\n';
      }
    } else {
      keptInner += ib.text;
    }
  }
  keptInner = keptInner.trim();
  if (!keptInner) return null; // whole media block becomes empty, drop it
  return header + '{\n' + keptInner + '\n}';
}

const topBlocks = parseBlocks(css);
let output = '';
let removedCount = 0;

for (const block of topBlocks) {
  if (block.type === 'comment') {
    output += block.text + '\n';
    continue;
  }
  if (block.type === 'other') {
    output += block.text;
    continue;
  }
  // rule block
  if (block.selector.startsWith('@media')) {
    const kept = processMediaBlock(block);
    if (kept) {
      output += kept + '\n\n';
    } else {
      removedCount++;
    }
    continue;
  }
  if (block.selector.startsWith('@keyframes')) {
    if (selectorMatchesDashboard(block.selector)) {
      removedCount++;
      continue;
    }
    output += block.text + '\n\n';
    continue;
  }

  if (selectorMatchesDashboard(block.selector)) {
    removedCount++;
    continue;
  }
  output += block.text + '\n\n';
}

// backup original
fs.writeFileSync(backupFile, css, 'utf8');
fs.writeFileSync(inputFile, output, 'utf8');

console.log(`Done. Removed ${removedCount} dashboard-related rule blocks.`);
console.log(`Backup of original saved as style.css.bak`);
console.log(`Cleaned file written to style.css`);