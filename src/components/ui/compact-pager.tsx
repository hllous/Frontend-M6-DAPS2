"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";

type CompactPagerProps = { page: number; totalPages: number; onPageChange: (page: number) => void; label?: string; getPageHref?: (page: number) => string };

export function CompactPager({ page, totalPages, onPageChange, label = "Paginación", getPageHref }: CompactPagerProps) {
  return <Pagination aria-label={label} className="w-auto">
    <PaginationContent>
      <PaginationItem>{getPageHref && page > 1 ? <PaginationLink href={getPageHref(page - 1)} aria-label="Página anterior"><ChevronLeft aria-hidden /></PaginationLink> : <Button type="button" variant="outline" size="icon" aria-label="Página anterior" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft aria-hidden /></Button>}</PaginationItem>
      <PaginationItem><span role="status" aria-live="polite" aria-label={`Página ${page} de ${totalPages}`} className="px-2 tabular-nums">{page} / {totalPages}</span></PaginationItem>
      <PaginationItem>{getPageHref && page < totalPages ? <PaginationLink href={getPageHref(page + 1)} aria-label="Página siguiente"><ChevronRight aria-hidden /></PaginationLink> : <Button type="button" variant="outline" size="icon" aria-label="Página siguiente" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}><ChevronRight aria-hidden /></Button>}</PaginationItem>
    </PaginationContent>
  </Pagination>;
}
