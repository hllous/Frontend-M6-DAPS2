export async function requestPageBeforeDeadline(url, deadline, fetchImpl = fetch) {
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) return { timedOut: true };

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, remainingMs);

  try {
    const response = await fetchImpl(url, {
      redirect: "manual",
      signal: controller.signal,
    });
    const html = response.status === 200 ? await response.text() : "";
    if (timedOut || Date.now() >= deadline) return { timedOut: true };
    return { timedOut: false, response, html };
  } catch (error) {
    if (timedOut || Date.now() >= deadline) return { timedOut: true };
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
