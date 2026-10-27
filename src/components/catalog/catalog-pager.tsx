"use client";

import { Button } from "@/components/ui/button";

import styles from "./catalog-panel.module.css";

type CatalogPagerProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label: string;
};

export function CatalogPager({ page, pageSize, total, totalPages, onPageChange, label }: CatalogPagerProps) {
  if (total === 0) return null;

  return (
    <nav aria-label={label} className={styles.pager}>
      <span className="text-muted-foreground">Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</span>
      {totalPages > 1 ? <div className={styles.pagerControls}>
        <Button variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</Button>
        <span aria-live="polite">Página {page} de {totalPages}</span>
        <Button variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Siguiente</Button>
      </div> : null}
    </nav>
  );
}
