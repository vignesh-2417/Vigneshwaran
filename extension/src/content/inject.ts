import { StrictMode, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  HOST_ELEMENT_ID,
  isApprovedSalesforceHost
} from "@sfcopilot/shared";
import { BackgroundAssistantApi } from "../api/backgroundClient.js";
import { MockAssistantApi } from "../api/assistantApi.js";
import { analyzeRequirementLocally } from "../api/localAnalyze.js";
import { DEFAULT_ICON_POSITION, STORAGE_KEYS, normalizeIconPosition } from "../config.js";
import { CopilotApp, browserContext } from "../ui/App.js";
import { COPILOT_CSS } from "../ui/styles.js";

const roots = new WeakMap<Element, Root>();
let hostObserver: MutationObserver | null = null;

function isTopWindow(): boolean {
  try {
    return window.top === window;
  } catch {
    return true;
  }
}

function readStoredPosition(): Promise<typeof DEFAULT_ICON_POSITION> {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve(DEFAULT_ICON_POSITION);
      return;
    }
    chrome.storage.local.get(STORAGE_KEYS.iconPosition, (value) => {
      resolve(normalizeIconPosition(value[STORAGE_KEYS.iconPosition]));
    });
  });
}

function persistPosition(position: { top: number; right: number }) {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return;
  }
  void chrome.storage.local.set({ [STORAGE_KEYS.iconPosition]: position });
}

function mountNativeFallback(doc: Document, shadow: ShadowRoot, position: typeof DEFAULT_ICON_POSITION) {
  if (shadow.querySelector("button[aria-label='Salesforce Metadata Copilot']")) {
    return;
  }
  const button = doc.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.setAttribute("aria-label", "Salesforce Metadata Copilot");
  button.style.top = `${position.top}px`;
  button.style.right = `${position.right}px`;
  button.textContent = "SF";
  shadow.append(button);
}

export interface InjectOptions {
  hostname?: string;
  isTop?: boolean;
  useBackgroundApi?: boolean;
}

export async function injectAssistant(
  doc: Document = document,
  options: InjectOptions = {}
): Promise<void> {
  const hostname = options.hostname ?? window.location.hostname;
  const top = options.isTop ?? isTopWindow();
  if (!top || !isApprovedSalesforceHost(hostname)) {
    return;
  }

  const existing = doc.getElementById(HOST_ELEMENT_ID);
  if (existing) {
    return;
  }

  const host = doc.createElement("div");
  host.id = HOST_ELEMENT_ID;
  host.setAttribute("data-sf-metadata-copilot", "true");
  host.setAttribute("data-sf-metadata-copilot-version", "v2");
  host.style.cssText =
    "all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;";
  (doc.body ?? doc.documentElement).appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const style = doc.createElement("style");
  style.textContent = COPILOT_CSS;
  const mount = doc.createElement("div");
  mount.setAttribute("id", "sfcopilot-app");
  shadow.append(style, mount);

  const position = await readStoredPosition();
  const useBackground =
    options.useBackgroundApi ??
    (typeof chrome !== "undefined" && Boolean(chrome.runtime?.sendMessage));
  const api = useBackground
    ? new BackgroundAssistantApi()
    : new MockAssistantApi(analyzeRequirementLocally);

  try {
    const root = createRoot(mount);
    roots.set(host, root);
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(CopilotApp, {
          api,
          getContext: browserContext,
          initialPosition: position,
          initialOpen: true,
          onPositionChange: persistPosition
        })
      )
    );
  } catch {
    mountNativeFallback(doc, shadow, position);
  }
}

export function removeAssistant(doc: Document = document): void {
  hostObserver?.disconnect();
  hostObserver = null;
  const host = doc.getElementById(HOST_ELEMENT_ID);
  if (!host) {
    return;
  }
  roots.get(host)?.unmount();
  host.remove();
}

function watchHostPresence(doc: Document): void {
  hostObserver?.disconnect();
  hostObserver = new MutationObserver(() => {
    if (!doc.getElementById(HOST_ELEMENT_ID)) {
      void injectAssistant(doc, { hostname: window.location.hostname });
    }
  });
  hostObserver.observe(doc.documentElement, { childList: true, subtree: true });
}

let lastHref = "";

export function watchLightningNavigation(doc: Document = document): void {
  const sync = () => {
    if (window.location.href === lastHref) {
      return;
    }
    lastHref = window.location.href;
    void injectAssistant(doc, { hostname: window.location.hostname });
  };

  lastHref = window.location.href;
  window.addEventListener("popstate", sync);
  window.addEventListener("hashchange", sync);
  window.setInterval(sync, 1000);
  watchHostPresence(doc);
}

export function bootstrap(): void {
  const run = () => {
    void injectAssistant();
    watchLightningNavigation();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}
