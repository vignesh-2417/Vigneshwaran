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
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.pointerEvents = "none";
  host.style.zIndex = "2147483000";
  doc.documentElement.appendChild(host);

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
        onPositionChange: persistPosition
      })
    )
  );
}

export function removeAssistant(doc: Document = document): void {
  const host = doc.getElementById(HOST_ELEMENT_ID);
  if (!host) {
    return;
  }
  roots.get(host)?.unmount();
  host.remove();
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
}

export function bootstrap(): void {
  void injectAssistant();
  watchLightningNavigation();
}
