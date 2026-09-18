export function createCorrelationId(): string {
  return crypto.randomUUID();
}

export function logSafeEvent(
  correlationId: string,
  event: string,
  details: Record<string, string | number | boolean | null>
): void {
  const payload = {
    correlationId,
    event,
    ...details
  };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}
