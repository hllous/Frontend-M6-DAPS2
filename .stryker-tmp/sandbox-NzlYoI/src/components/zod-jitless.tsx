// @ts-nocheck
"use client";

import { z } from "zod";

// Zod compila sus validadores con `new Function`. Con la CSP sin 'unsafe-eval' (#956) ese intento falla, queda atrapado y
// igual se reporta como violación en la consola. `jitless` evita el intento; los esquemas siguen validando igual.
z.config({ jitless: true });

export function ZodJitless() {
  return null;
}
