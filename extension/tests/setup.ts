import "@testing-library/jest-dom/vitest";

class StorageMock {
  public get = (
    _keys: string | string[] | Record<string, unknown>,
    callback: (items: Record<string, unknown>) => void
  ) => {
    callback({});
  };
  public set = (_items: Record<string, unknown>) => Promise.resolve();
  public remove = (_keys: string | string[]) => Promise.resolve();
}

const chromeMock = {
  storage: { local: new StorageMock(), session: new StorageMock() },
  runtime: {
    sendMessage: undefined,
    onMessage: { addListener: () => undefined },
    onInstalled: { addListener: () => undefined }
  }
};

Object.defineProperty(globalThis, "chrome", {
  value: chromeMock,
  configurable: true
});
