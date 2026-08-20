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
  z-index: 2147483647;
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
  width: 56px;
  height: 56px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 50%;
  border: 1px solid #ffb347;
  background: radial-gradient(circle at 28% 22%, #ffe566 0%, #ff7a00 36%, #ff2d00 70%, #7a0c00 100%);
  color: #fff8e7;
  cursor: grab;
  display: grid;
  place-items: center;
  box-shadow:
    0 0 6px #ffd27a,
    0 0 16px #ff6a00,
    0 0 28px rgba(255, 40, 0, 0.75);
  z-index: 2;
}

.icon-button:hover,
.icon-button:focus-visible {
  background: radial-gradient(circle at 28% 22%, #fff1a8 0%, #ff9100 34%, #ff1f00 100%);
  outline: 3px solid #ffb347;
  outline-offset: 2px;
  box-shadow:
    0 0 10px #ffe08a,
    0 0 24px #ff4d00,
    0 0 40px rgba(255, 32, 0, 0.9);
}

.icon-button[aria-pressed="true"],
.icon-button:active {
  background: radial-gradient(circle at 28% 22%, #ffb347 0%, #e03600 68%, #4a0600 100%);
  cursor: grabbing;
}

@media (prefers-reduced-motion: no-preference) {
  .icon-button {
    animation: lava-pulse 2.4s ease-in-out infinite;
  }
}

@keyframes lava-pulse {
  0%, 100% {
    box-shadow:
      0 0 6px #ffd27a,
      0 0 16px #ff6a00,
      0 0 28px rgba(255, 40, 0, 0.75);
  }
  50% {
    box-shadow:
      0 0 12px #ffe08a,
      0 0 26px #ff3b00,
      0 0 42px rgba(255, 16, 0, 0.95);
  }
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
  background: #fff7ef;
  color: #3b1400;
  border: 1px solid #ffb347;
  border-radius: 12px;
  box-shadow:
    0 0 12px rgba(255, 122, 0, 0.35),
    0 16px 40px rgba(122, 12, 0, 0.28);
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
  background: linear-gradient(135deg, #ff9a1f 0%, #ff6a00 42%, #e03600 100%);
  color: #fff8e7;
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
  background: rgba(255, 248, 231, 0.2);
  outline: 2px solid #ffe08a;
}

.signed-in-as {
  font-size: 11px;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #fff8e7;
}

.panel-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  background: #fff1e2;
}

.privacy-banner {
  margin: 12px 12px 0;
  padding: 8px 10px;
  background: #fff4d6;
  border: 1px solid #ff7a00;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
  color: #7a0c00;
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
  background: #ffe0b8;
  border: 1px solid #ffb347;
}

.message-assistant,
.message-system {
  align-self: stretch;
  background: #fffaf3;
  border: 1px solid #ffd27a;
}

.prompt-card {
  background: #fffaf3;
  border: 1px solid #ff7a00;
  border-radius: 10px;
  padding: 10px 12px;
}

.prompt-card h3 {
  margin: 0 0 6px;
  font-size: 12px;
  color: #e03600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.prompt-card p {
  margin: 0;
  font-size: 13px;
}

.status-loading {
  color: #e03600;
  background: #fff4d6;
  border: 1px solid #ffb347;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.processing-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff6a00;
  box-shadow: 0 0 10px #ff6a00;
  animation: lava-pulse 1.2s ease-in-out infinite;
}

.processing-prompt {
  margin: 0;
  color: #3b1400;
}

.status {
  padding: 8px 12px;
  font-size: 13px;
}

.status-error {
  color: #ba0517;
}

.section {
  background: #fffaf3;
  border: 1px solid #ffd27a;
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
  background: #fffaf3;
  border-top: 1px solid #ffb347;
}

.composer textarea {
  width: 100%;
  min-height: 72px;
  resize: vertical;
  border: 1px solid #ffb347;
  border-radius: 8px;
  padding: 8px;
  background: #fffdf8;
}

.composer textarea:focus-visible {
  outline: 2px solid #ff6a00;
  border-color: #ff6a00;
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
  background: linear-gradient(180deg, #ff9100 0%, #ff4d00 100%);
  color: #fff8e7;
  font-weight: 650;
}

.primary:hover,
.primary:focus-visible {
  background: linear-gradient(180deg, #ffb347 0%, #e03600 100%);
  outline: 2px solid #ffe08a;
}

.primary:disabled,
.secondary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.secondary {
  border: 1px solid #ffb347;
  background: #fff7ef;
  color: #7a0c00;
}

.org-target {
  font-size: 12px;
  color: #444;
}

.login-card {
  pointer-events: auto;
  margin: 0;
  padding: 10px 12px;
  background: #fff7ef;
  border: 1px solid #ffb347;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #3b1400;
  box-shadow: 0 0 16px rgba(255, 106, 0, 0.35);
}

.login-float {
  pointer-events: auto;
  position: fixed;
  width: min(340px, calc(100vw - 24px));
  z-index: 5;
}

.login-card h3 {
  margin: 0;
  font-size: 14px;
}

.login-card input {
  width: 100%;
  min-height: 32px;
  border: 1px solid #aeaeae;
  border-radius: 8px;
  padding: 6px 8px;
}

.login-card-ok {
  background: #fff4d6;
  border-color: #ff7a00;
  align-items: stretch;
}

@media (max-width: 480px) {
  .panel {
    width: calc(100vw - 16px);
    right: 8px !important;
    top: 64px !important;
  }
}
`;
