export const STORAGE_KEYS = {
  iconPosition: "sfcopilot.iconPosition"
} as const;

export const DEFAULT_BACKEND_URL = "http://127.0.0.1:8787";

export interface IconPosition {
  top: number;
  right: number;
}

export const DEFAULT_ICON_POSITION: IconPosition = {
  top: 72,
  right: 20
};

export function normalizeIconPosition(stored: unknown): IconPosition {
  if (
    stored &&
    typeof stored === "object" &&
    "top" in stored &&
    "right" in stored &&
    typeof stored.top === "number" &&
    typeof stored.right === "number"
  ) {
    return { top: stored.top, right: stored.right };
  }
  return DEFAULT_ICON_POSITION;
}
