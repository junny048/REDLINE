type Payload = Record<string, unknown> | undefined;

export function track(event: string, payload?: Payload): void {
  const timestamp = new Date().toISOString();
  console.log("[analytics]", { event, payload, timestamp });
}
