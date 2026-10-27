import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Catálogo — Ambiente e Higiene" };

export default function CatalogLayout({ children }: { children: ReactNode }) {
  return children;
}
