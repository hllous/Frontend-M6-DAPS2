let startPromise: Promise<void> | undefined;

/**
 * MSW's `worker.start()` throws ("cannot configure an already enabled network")
 * if called a second time on an already-running worker — which React's Strict
 * Mode triggers by double-invoking mount effects in development. Memoizing the
 * start attempt makes every caller share the same in-flight/completed start.
 */
export function ensureMockWorkerStarted(): Promise<void> {
  startPromise ??= (async () => {
    const { worker } = await import("./browser");
    await worker.start({ onUnhandledRequest: "bypass" });
  })();
  return startPromise;
}
