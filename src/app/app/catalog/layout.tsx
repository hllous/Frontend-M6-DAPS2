import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "M6 — Catálogo" };

export default function CatalogLayout({ children }: { children: ReactNode }) {
  return children;
}
