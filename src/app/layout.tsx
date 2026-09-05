import type { Metadata } from "next";
import "@fontsource-variable/archivo";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = { title: "M6 — Ambiente e Higiene", description: "Frontend del Módulo 6 — Ambiente, Higiene y Servicios Urbanos. Municipalidad UADE." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className="antialiased"><TooltipProvider>{children}</TooltipProvider></body></html>;
}
