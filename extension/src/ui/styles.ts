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
:host {
  all: initial;
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483000;
  font-family: "Salesforce Sans", "Segoe UI", system-ui, sans-serif;
}

*, *::before, *::after {
  box-sizing: border-box;
}

.copilot-root {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

button, textarea {
  font: inherit;
}

.icon-button {
  pointer-events: auto;
  position: fixed;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid #0b5cab;
  background: #0176d3;
  color: #ffffff;
  cursor: grab;
  display: grid;
  place-items: center;
  box-shadow: 0 8px 20px rgba(1, 68, 134, 0.28);
  z-index: 2;
}

.icon-button:hover,
.icon-button:focus-visible {
  background: #0b5cab;
  outline: 3px solid #90d0fe;
  outline-offset: 2px;
}

.icon-button[aria-pressed="true"],
.icon-button:active {
  background: #014486;
  cursor: grabbing;
}

.icon-button svg {
  width: 22px;
  height: 22px;
  fill: currentColor;
}

.panel {
  pointer-events: auto;
  position: fixed;
  width: min(420px, calc(100vw - 32px));
  max-height: min(640px, calc(100vh - 120px));
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #181818;
  border: 1px solid #c9c9c9;
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(24, 24, 24, 0.2);
  overflow: hidden;
  z-index: 3;
}

.panel[data-minimized="true"] {
  max-height: none;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #032d60;
  color: #ffffff;
}

.panel-title {
  flex: 1;
  font-size: 14px;
  font-weight: 650;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.icon-action {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.icon-action:hover,
.icon-action:focus-visible {
  background: rgba(255, 255, 255, 0.16);
  outline: 2px solid #90d0fe;
}

.panel-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  background: #f3f3f3;
}

.privacy-banner {
  margin: 12px 12px 0;
  padding: 8px 10px;
  background: #fef7e6;
  border: 1px solid #dd7a01;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
}

.conversation {
  flex: 1;
  overflow: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message {
  max-width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.message-user {
  align-self: flex-end;
  background: #e4f3ff;
}

.message-assistant,
.message-system {
  align-self: stretch;
  background: #ffffff;
  border: 1px solid #e5e5e5;
}

.status {
  padding: 8px 12px;
  font-size: 13px;
}

.status-loading {
  color: #032d60;
}

.status-error {
  color: #ba0517;
}

.section {
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  padding: 10px 12px;
}

.section h3 {
  margin: 0 0 8px;
  font-size: 13px;
}

.section ol,
.section ul {
  margin: 0;
  padding-left: 18px;
}

.diff {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  background: #1e1e1e;
  color: #f3f3f3;
  border-radius: 8px;
  padding: 8px;
  overflow: auto;
  white-space: pre-wrap;
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #ffffff;
  border-top: 1px solid #e5e5e5;
}

.composer textarea {
  width: 100%;
  min-height: 72px;
  resize: vertical;
  border: 1px solid #aeaeae;
  border-radius: 8px;
  padding: 8px;
}

.composer textarea:focus-visible {
  outline: 2px solid #0176d3;
  border-color: #0176d3;
}

.composer-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.primary,
.secondary {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  cursor: pointer;
}

.primary {
  border: 0;
  background: #0176d3;
  color: #ffffff;
}

.primary:hover,
.primary:focus-visible {
  background: #0b5cab;
}

.primary:disabled,
.secondary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.secondary {
  border: 1px solid #c9c9c9;
  background: #ffffff;
}

.org-target {
  font-size: 12px;
  color: #444;
}

@media (max-width: 480px) {
  .panel {
    width: calc(100vw - 16px);
    right: 8px !important;
    bottom: 64px !important;
  }
}
`;
