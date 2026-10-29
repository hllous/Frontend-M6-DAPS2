import Link from "next/link";
import type { ReactNode } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const CONFIGURATION_HREF = "/app?destination=catalog";
export const INVENTORY_HREF = "/app?destination=inventory";

type CatalogPageHeaderProps = {
  title: string;
  /** Sección del menú a la que pertenece la pantalla; por defecto Configuración. */
  section?: "configuration" | "inventory";
  titleId?: string;
  description?: ReactNode;
  actions?: ReactNode;
};

/** Shared header of every catalog screen: breadcrumb back to its menu section (Configuración or Inventario urbano), page title, description and primary actions. */
export function CatalogPageHeader({ title, section = "configuration", titleId, description, actions }: CatalogPageHeaderProps) {
  const inventory = section === "inventory";
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={inventory ? INVENTORY_HREF : CONFIGURATION_HREF} />}>{inventory ? "Inventario urbano" : "Configuración"}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 id={titleId} className="text-[28px] leading-[34px] max-[760px]:text-[26px] max-[760px]:leading-[32px] font-bold tracking-tight">{title}</h1>
        {description ? <p className="max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
