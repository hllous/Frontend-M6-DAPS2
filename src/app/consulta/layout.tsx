import type { Metadata } from "next";

import { PublicShell } from "@/components/public/public-shell";

export const metadata: Metadata = { title: "Consulta ciudadana · Ambiente e Higiene" };

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PublicShell>{children}</PublicShell>;
}
