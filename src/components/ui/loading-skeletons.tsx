import { cn } from "cn";

import { Skeleton } from "@/components/ui/skeleton";

const defaultTableColumnWidths = ["w-24", "flex-1", "w-28", "w-20"] as const;

type TableRowsSkeletonProps = {
  rowCount?: number;
  rowHeight?: string;
  columnWidths?: readonly string[];
  className?: string;
};

function TableRowsSkeleton({
  rowCount = 5,
  rowHeight = "h-12",
  columnWidths = defaultTableColumnWidths,
  className,
}: TableRowsSkeletonProps) {
  return (
    <div data-slot="table-rows-skeleton" aria-hidden="true" className={cn("divide-y divide-border", className)}>
      {Array.from({ length: rowCount }, (_, row) => (
        <div key={row} data-slot="table-row-skeleton" className={cn("flex items-center gap-3 py-2", rowHeight)}>
          {columnWidths.map((width, column) => (
            <Skeleton key={`${row}-${column}`} className={cn("h-4 shrink-0", width)} />
          ))}
        </div>
      ))}
    </div>
  );
}

type CardSkeletonProps = {
  titleClassName?: string;
  lineWidths?: readonly string[];
  className?: string;
};

function CardSkeleton({
  titleClassName = "h-5 w-2/3",
  lineWidths = ["w-full", "w-3/4"],
  className,
}: CardSkeletonProps) {
  return (
    <div data-slot="card-skeleton" aria-hidden="true" className={cn("space-y-3 rounded-lg border border-border bg-card p-4", className)}>
      <Skeleton className={titleClassName} />
      {lineWidths.map((width, line) => (
        <Skeleton key={line} className={cn("h-4", width)} />
      ))}
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

type DetailPaneSkeletonProps = {
  fieldCount?: number;
  fieldHeight?: string;
  titleWidth?: string;
  className?: string;
};

function DetailPaneSkeleton({
  fieldCount = 4,
  fieldHeight = "h-10",
  titleWidth = "w-1/2",
  className,
}: DetailPaneSkeletonProps) {
  return (
    <div data-slot="detail-pane-skeleton" aria-hidden="true" className={cn("space-y-4 rounded-lg border border-border bg-card p-4", className)}>
      <div className="space-y-2 border-b border-border pb-3">
        <Skeleton className={cn("h-5", titleWidth)} />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {Array.from({ length: fieldCount }, (_, field) => (
          <div key={field} data-slot="detail-field-skeleton" className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className={cn("h-10 w-full", fieldHeight)} />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

type MapPaneSkeletonProps = {
  height?: string;
  className?: string;
};

function MapPaneSkeleton({ height = "h-80", className }: MapPaneSkeletonProps) {
  return (
    <div data-slot="map-pane-skeleton" aria-hidden="true" className={cn("relative w-full overflow-hidden rounded-lg border border-border", height, className)}>
      <Skeleton className="absolute inset-0 rounded-none" />
      <Skeleton className="absolute left-[30%] top-[34%] size-5 rounded-full" />
      <Skeleton className="absolute left-[64%] top-[56%] size-4 rounded-full" />
      <Skeleton className="absolute right-3 top-3 size-8" />
      <Skeleton className="absolute bottom-3 left-3 h-8 w-28" />
    </div>
  );
}

type ListItemsSkeletonProps = {
  itemCount?: number;
  itemHeight?: string;
  avatarSize?: string;
  primaryWidth?: string;
  secondaryWidth?: string;
  className?: string;
};

function ListItemsSkeleton({
  itemCount = 5,
  itemHeight = "h-12",
  avatarSize = "size-8",
  primaryWidth = "w-2/3",
  secondaryWidth = "w-1/3",
  className,
}: ListItemsSkeletonProps) {
  return (
    <div data-slot="list-items-skeleton" aria-hidden="true" className={cn("divide-y divide-border", className)}>
      {Array.from({ length: itemCount }, (_, item) => (
        <div key={item} data-slot="list-item-skeleton" className={cn("flex items-center gap-3 py-2", itemHeight)}>
          <Skeleton className={cn("shrink-0 rounded-full", avatarSize)} />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className={cn("h-4", primaryWidth)} />
            <Skeleton className={cn("h-3", secondaryWidth)} />
          </div>
          <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export { CardSkeleton, DetailPaneSkeleton, ListItemsSkeleton, MapPaneSkeleton, TableRowsSkeleton };
