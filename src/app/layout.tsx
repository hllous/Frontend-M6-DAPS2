import type { Metadata } from "next";
import "@fontsource-variable/archivo";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = { title: "Ambiente e Higiene", description: "Ambiente, Higiene y Servicios Urbanos" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className="antialiased"><TooltipProvider delay={400}>{children}</TooltipProvider><Toaster position="top-right" /></body></html>;
}
