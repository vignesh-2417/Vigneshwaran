import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { handleAnalyze } from "./analyze.js";
import { logSafeEvent } from "./logger.js";

const PORT = Number(process.env.PORT ?? 8787);

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    if (Buffer.concat(chunks).byteLength > 32_000) {
      throw new Error("payload too large");
    }
  }
  if (chunks.length === 0) {
    return null;
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

export function startServer(port = PORT) {
  const server = createServer((req, res) => {
    void (async () => {
      if (req.method === "GET" && req.url === "/health") {
        send(res, 200, { ok: true });
        return;
      }
      if (req.method !== "POST" || req.url !== "/api/requirements/analyze") {
        send(res, 404, { ok: false, message: "Not found" });
        return;
      }
      try {
        const body = await readJson(req);
        const result = await handleAnalyze(body, req.headers.authorization ?? null);
        send(res, result.status, result.body);
      } catch {
        const correlationId = crypto.randomUUID();
        logSafeEvent(correlationId, "internal_error", { status: 500 });
        send(res, 500, {
          ok: false,
          correlationId,
          code: "INTERNAL_ERROR",
          message: "Unexpected server error"
        });
      }
    })();
  });
  server.listen(port);
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
