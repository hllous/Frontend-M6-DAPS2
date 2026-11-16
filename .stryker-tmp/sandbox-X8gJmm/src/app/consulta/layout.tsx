// @ts-nocheck
import type { Metadata } from "next";

import { PublicShell } from "@/components/public/public-shell";
import { publicMockMode } from "@/lib/public-bff";

export const metadata: Metadata = { title: "Consulta ciudadana · Ambiente e Higiene" };

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PublicShell demo={publicMockMode()}>{children}</PublicShell>;
}
