"use client";

import { CompactPager } from "@/components/ui/compact-pager";
import styles from "./catalog-panel.module.css";

type CatalogPagerProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label: string;
  announceEmpty?: string;
};

export function CatalogPager({ page, pageSize, total, totalPages, onPageChange, label, announceEmpty }: CatalogPagerProps) {
  if (total === 0) return announceEmpty ? <div className={styles.pager}><span role="status" className="text-muted-foreground">{announceEmpty}</span></div> : null;
  return <div className={styles.pager}>
    <span className="text-muted-foreground">Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</span>
    {totalPages > 1 ? <CompactPager page={page} totalPages={totalPages} onPageChange={onPageChange} label={label} /> : null}
  </div>;
}
