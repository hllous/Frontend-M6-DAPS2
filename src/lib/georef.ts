import { z } from "zod";

// Permanent validation of the consumed official Georef fields (ADR 0003).
export const georefResponseSchema = z.object({
  direcciones: z.array(z.object({
    nomenclatura: z.string().trim().min(1),
    provincia: z.object({ id: z.literal("02") }),
    ubicacion: z.object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
    }),
  })),
});
