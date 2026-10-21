import { delay } from "msw";

/** Delays one test-specific mock handler before it creates the response. */
export async function mockResponseAfter<T>(
  milliseconds: number,
  createResponse: () => T | Promise<T>,
): Promise<Awaited<T>> {
  await delay(milliseconds);
  return await createResponse();
}
