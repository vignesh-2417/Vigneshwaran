export const STORAGE_KEYS = {
  iconPosition: "sfcopilot.iconPosition"
} as const;

export const DEFAULT_BACKEND_URL = "http://127.0.0.1:8787";

export interface IconPosition {
  bottom: number;
  right: number;
}

export const DEFAULT_ICON_POSITION: IconPosition = {
  bottom: 72,
  right: 24
};
