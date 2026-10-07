import { File as NodeFile } from "node:buffer";

// Node 24's Undici parser rejects the File class supplied by Vitest's jsdom realm.
// Use Node's File only while Request.formData() parses the multipart body.
export async function withNodeFile<T>(callback: () => T | Promise<T>): Promise<T> {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "File");
  Object.defineProperty(globalThis, "File", {
    configurable: true,
    writable: true,
    value: NodeFile,
  });

  try {
    return await callback();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "File", descriptor);
    else Reflect.deleteProperty(globalThis, "File");
  }
}
