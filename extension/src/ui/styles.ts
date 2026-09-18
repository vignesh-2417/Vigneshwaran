import type { CSSProperties } from "react";

export function stylesToCssText(styles: Record<string, CSSProperties>): string {
  return Object.entries(styles)
    .map(([selector, rules]) => {
      const body = Object.entries(rules)
        .map(([key, value]) => {
          const cssKey = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
          return `${cssKey}:${String(value)};`;
        })
        .join("");
      return `${selector}{${body}}`;
    })
    .join("");
}

export const COPILOT_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

:host {
  all: initial;
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483647;
  font-family: Inter, "Segoe UI", system-ui, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; }

.copilot-root {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.connect-float {
  pointer-events: auto;
}

.build-stamp {
  margin: 0;
  font-size: 11px;
  color: #706e6b;
  letter-spacing: 0.04em;
}

.status-dot-off { background: #c9c9c9; }
.not-connected { color: #706e6b; }

button, textarea, select { font: inherit; }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
}

.icon-button {
  pointer-events: auto;
  position: fixed;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 0;
  background: linear-gradient(180deg, #1b96ff 0%, #0176d3 100%);
  color: #fff;
  cursor: grab;
  display: grid;
  place-items: center;
  box-shadow: 0 8px 20px rgba(1, 118, 211, 0.35);
  z-index: 2;
}

.icon-button:hover, .icon-button:focus-visible {
  background: linear-gradient(180deg, #58b9ff 0%, #014486 100%);
  outline: 3px solid #90d0fe;
  outline-offset: 2px;
}

.icon-button svg { width: 22px; height: 22px; fill: currentColor; }

.panel {
  pointer-events: auto;
  position: fixed;
  width: min(720px, calc(100vw - 24px));
  max-height: min(780px, calc(100vh - 96px));
  display: flex;
  flex-direction: column;
  background: #f3f3f3;
  color: #181818;
  border: 1px solid #c9c9c9;
  border-radius: 16px;
  box-shadow: 0 18px 40px rgba(24, 24, 24, 0.18);
  overflow: hidden;
}

.panel-wide { width: min(760px, calc(100vw - 24px)); }
.panel[data-minimized="true"] { max-height: 72px; }

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
}

.panel-title { margin: 0; font-size: 18px; font-weight: 700; color: #032d60; }
.eyebrow { margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #0176d3; letter-spacing: 0.02em; }
.connected-status { display: flex; align-items: center; gap: 6px; margin: 4px 0 0; font-size: 12px; color: #2e844a; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #2e844a; display: inline-block; }

.header-actions { display: flex; gap: 6px; margin-left: auto; }
.icon-action {
  border: 1px solid #c9c9c9;
  background: #fff;
  border-radius: 8px;
  min-height: 32px;
  padding: 0 10px;
  cursor: pointer;
  color: #032d60;
}
.icon-action:hover { background: #f3f3f3; }

.panel-body {
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.auth-screen { padding: 8px 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.auth-lead { margin: 0; color: #444; line-height: 1.45; }
.env-fieldset { border: 1px solid #e5e5e5; border-radius: 12px; padding: 12px; background: #fff; display: flex; gap: 16px; }
.env-option { display: flex; gap: 8px; align-items: center; }
.secure-note { margin: 0; color: #3e3e3c; font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
.primary-large { min-height: 44px; font-size: 16px; }

.account-card, .preview-card, .prompt-card, .section, .composer {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

.account-card p, .preview-note { margin: 0 0 8px; }
.account-card-actions, .preview-actions, .composer-actions, .account-dropdown-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.account-menu { position: relative; }
.account-chip {
  border: 1px solid #c9c9c9;
  background: #fff;
  border-radius: 999px;
  min-height: 32px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.account-dropdown {
  position: absolute;
  right: 0;
  top: 40px;
  width: 280px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 12px 24px rgba(0,0,0,0.12);
  z-index: 4;
}
.account-dropdown p { margin: 0 0 8px; font-size: 13px; }
.account-dropdown-title { font-weight: 700; color: #032d60; }

.composer { display: flex; flex-direction: column; gap: 10px; }
.composer-heading { margin: 0; font-size: 20px; color: #032d60; }
.composer textarea, .field-type-select {
  width: 100%;
  border: 1px solid #c9c9c9;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
  color: #181818;
}
.composer textarea { min-height: 96px; resize: vertical; }
.composer textarea:focus-visible, .field-type-select:focus-visible {
  outline: 2px solid #0176d3;
  border-color: #0176d3;
}

.quick-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  border: 1px solid #c9c9c9;
  background: #f3f3f3;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  color: #032d60;
}
.chip:hover { background: #eaf5fe; border-color: #90d0fe; }

.consent { font-size: 13px; color: #3e3e3c; }
.org-target { margin: 0; font-size: 12px; color: #706e6b; }

.primary, .secondary, .danger {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
.primary { border: 0; background: #0176d3; color: #fff; }
.primary:hover, .primary:focus-visible { background: #014486; }
.secondary { border: 1px solid #c9c9c9; background: #fff; color: #032d60; }
.danger { border: 1px solid #ba0517; background: #fff; color: #ba0517; }
.primary:disabled, .secondary:disabled { opacity: 0.55; cursor: not-allowed; }

.conversation { display: flex; flex-direction: column; gap: 12px; }
.message { padding: 10px 12px; border-radius: 10px; background: #fff; border: 1px solid #eee; }
.message-user { background: #eaf5fe; border-color: #90d0fe; }
.status { padding: 12px; border-radius: 10px; display: flex; flex-direction: column; gap: 8px; }
.status-loading { background: #eaf5fe; color: #014486; }
.status-error { background: #fef1ee; color: #ba0517; }
.spinner {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid #90d0fe; border-top-color: #0176d3;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.preview-kicker { margin: 0 0 8px; font-size: 11px; letter-spacing: 0.08em; color: #0176d3; font-weight: 700; }
.preview-grid { display: grid; grid-template-columns: 140px 1fr; gap: 8px 12px; margin: 0 0 12px; }
.preview-grid dt { color: #706e6b; font-size: 12px; }
.preview-grid dd { margin: 0; font-weight: 600; }
.success-title { color: #2e844a; font-weight: 700; }

.mode-rail { display: flex; gap: 6px; list-style: none; padding: 0; margin: 0; flex-wrap: wrap; }
.mode-rail li { font-size: 11px; padding: 4px 8px; border-radius: 999px; background: #eee; }
.mode-rail li[data-active="true"] { background: #0176d3; color: #fff; }

.diff {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  background: #032d60;
  color: #f3f3f3;
  border-radius: 8px;
  padding: 8px;
  overflow: auto;
  white-space: pre-wrap;
}

.component-card, .report-block { margin-bottom: 8px; }
.approval-note { color: #2e844a; font-weight: 600; }
`;
