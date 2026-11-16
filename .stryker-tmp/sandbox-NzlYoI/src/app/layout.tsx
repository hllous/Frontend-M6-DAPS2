// @ts-nocheck
import type { Metadata } from "next";
import { connection } from "next/server";
import "@fontsource-variable/archivo";
import "./globals.css";
import { ZodJitless } from "@/components/zod-jitless";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = { title: "Ambiente e Higiene", description: "Ambiente, Higiene y Servicios Urbanos" };

// La CSP lleva un nonce por pedido (src/proxy.ts): las páginas se renderizan en cada pedido, nunca prerenderizadas.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return <html lang="es"><body className="antialiased"><ZodJitless /><TooltipProvider delay={400}>{children}</TooltipProvider><Toaster position="top-right" /></body></html>;
}
