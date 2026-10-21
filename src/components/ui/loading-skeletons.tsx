import { cn } from "cn";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Item, ItemContent, ItemGroup, ItemMedia } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";

type TableRowsSkeletonProps = {
  rowCount?: number;
  rowHeight?: string;
  columnWidths?: readonly string[];
  columnLabels?: readonly string[];
  columnClasses?: readonly string[];
  actionColumn?: boolean;
  actionCount?: number;
  className?: string;
  tableClassName?: string;
  actionsClassName?: string;
};

// Pass the loaded table's layout classes so its mobile card layout is preserved too.
function TableRowsSkeleton({ rowCount = 5, rowHeight = "h-10", columnWidths = ["w-24", "w-40", "w-28", "w-20"], columnLabels, columnClasses, actionColumn = false, actionCount = 2, className, tableClassName, actionsClassName }: TableRowsSkeletonProps) {
  return <div data-slot="table-rows-skeleton" aria-hidden="true" className={className}>
    <table className={cn("w-full border-collapse", !tableClassName && "text-sm", tableClassName)}>
      <colgroup>{columnWidths.map((_, column) => <col key={column} className={columnClasses?.[column]} />)}</colgroup>
      <thead><tr>{columnWidths.map((_, column) => <th key={column} scope="col" className={cn(!tableClassName && "border-b bg-muted px-3 py-2.5 text-left")}>{actionColumn && column === columnWidths.length - 1 ? <span className="sr-only">{columnLabels?.[column]}</span> : columnLabels?.[column] ?? <Skeleton className="h-5 w-16" />}</th>)}</tr></thead>
      <tbody>{Array.from({ length: rowCount }, (_, row) => <tr key={row} data-slot="table-row-skeleton" className={rowHeight}>
        {columnWidths.map((width, column) => <td key={column} data-label={columnLabels?.[column]} className={cn(!tableClassName && "border-b px-3 py-2.5", actionColumn && column === columnWidths.length - 1 && actionsClassName)}>
          {actionColumn && column === columnWidths.length - 1 ? Array.from({ length: actionCount }, (_, action) => <Skeleton key={action} className={cn("h-10 max-[760px]:h-12 max-[760px]:flex-1", action === 0 ? "w-14" : "w-24")} />) : <Skeleton className={cn("h-[21px] max-w-full", width)} />}
        </td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

type CardSkeletonProps = { titleClassName?: string; lineWidths?: readonly string[]; className?: string };

// The standard Card shell is shared with loaded cards, including its spacing token.
function CardSkeleton({ titleClassName = "h-5 w-2/3", lineWidths = ["w-full", "w-3/4"], className }: CardSkeletonProps) {
  return <Card data-skeleton="card" aria-hidden="true" className={className}>
    <CardHeader><Skeleton className={titleClassName} /></CardHeader>
    <CardContent className="flex flex-col gap-3">{lineWidths.map((width, line) => <Skeleton key={line} className={cn("h-4", width)} />)}</CardContent>
  </Card>;
}

type DetailPaneSkeletonProps = { fieldCount?: number; fieldHeight?: string; titleWidth?: string; className?: string };

// ServiceDetail: action bar, operational heading, three metadata blocks, territory and related context.
function DetailPaneSkeleton({ fieldCount = 3, fieldHeight = "h-5", titleWidth = "w-1/2", className }: DetailPaneSkeletonProps) {
  return <div data-slot="detail-pane-skeleton" aria-hidden="true" className={cn("flex h-full flex-col overflow-hidden bg-background", className)}>
    <div data-slot="detail-actions-skeleton" className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted px-6 py-3"><Skeleton className="h-8 w-40" /><Skeleton className="h-8 w-28" /></div>
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-6 min-[761px]:p-8">
        <div data-slot="detail-heading-skeleton" className="flex flex-col gap-3"><Skeleton className="h-4 w-32" /><Skeleton className={cn("h-8", titleWidth)} /><div className="flex gap-2 pt-1"><Skeleton className="h-6 w-24" /><Skeleton className="h-6 w-32" /></div></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: fieldCount }, (_, field) => <div key={field} data-slot="detail-field-skeleton" className="rounded-xl border bg-muted p-4"><Skeleton className="h-4 w-32 max-w-full" /><Skeleton className={cn("mt-2 w-3/4", fieldHeight)} /><Skeleton className="mt-1 h-4 w-2/3" /></div>)}</div>
        <div data-slot="detail-territory-skeleton" className="flex flex-col gap-4 rounded-xl border p-5"><Skeleton className="h-5 w-64 max-w-full" /><div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></div>
      </div>
      <aside data-slot="detail-context-skeleton" className="hidden w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l bg-muted p-5 min-[761px]:flex"><Skeleton className="h-4 w-40" />{[0, 1].map((item) => <div key={item} className="flex flex-col gap-1 rounded-lg border bg-background p-3"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-full" /></div>)}</aside>
    </div>
  </div>;
}

type MapPaneSkeletonProps = { height?: string; className?: string };
function MapPaneSkeleton({ height = "h-full min-h-80", className }: MapPaneSkeletonProps) {
  return <div data-slot="map-pane-skeleton" aria-hidden="true" className={cn("relative min-w-0 flex-1 overflow-hidden", height, className)}>
    <Skeleton className="absolute inset-0 rounded-none" />
    <div data-slot="map-zoom-skeleton" className="absolute left-2.5 top-2.5 flex flex-col"><Skeleton className="size-8 rounded-b-none" /><Skeleton className="size-8 rounded-t-none" /></div>
    <Skeleton data-slot="map-attribution-skeleton" className="absolute bottom-0 right-0 h-4 w-44 rounded-none" />
  </div>;
}

type ListItemsSkeletonProps = { itemCount?: number; itemHeight?: string; avatarSize?: string; primaryWidth?: string; secondaryWidth?: string; className?: string };
// Matches the map's ItemGroup / Item size=xs anatomy, without invented trailing badges.
function ListItemsSkeleton({ itemCount = 5, itemHeight = "min-h-12", avatarSize = "size-3", primaryWidth = "w-2/3", secondaryWidth = "w-1/3", className }: ListItemsSkeletonProps) {
  return <ItemGroup data-skeleton="list" aria-hidden="true" className={className}>{Array.from({ length: itemCount }, (_, item) => <Item key={item} size="xs" data-skeleton="list-item" className={itemHeight}>
    <ItemMedia><Skeleton className={cn("shrink-0 rounded-full", avatarSize)} /></ItemMedia>
    <ItemContent className="min-w-0"><Skeleton className={cn("h-5 max-w-full", primaryWidth)} /><Skeleton className={cn("h-5 max-w-full", secondaryWidth)} /></ItemContent>
  </Item>)}</ItemGroup>;
}

export { CardSkeleton, DetailPaneSkeleton, ListItemsSkeleton, MapPaneSkeleton, TableRowsSkeleton };
