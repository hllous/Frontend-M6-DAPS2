"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCheck, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { IndicatorPoint } from "@/lib/indicators";

import styles from "./breakdown-bar-chart.module.css";

type IndicatorTone = NonNullable<IndicatorPoint["tone"]>;
type BreakdownBarChartProps = {
  points: IndicatorPoint[];
  selectedId?: string;
  onSelect: (pointId: string) => void;
  title: string;
  formatValue: (point: IndicatorPoint) => string;
  formatDetail: (point: IndicatorPoint) => string;
};

const indicatorToneColors: Record<IndicatorTone, string> = {
  primary: "var(--color-action)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
};

export function BreakdownBarChart({ points, selectedId, onSelect, title, formatValue, formatDetail }: BreakdownBarChartProps) {
  const [localSelectedId, setLocalSelectedId] = useState(selectedId);
  const [hoveredId, setHoveredId] = useState<string>();
  const [pinnedId, setPinnedId] = useState<string>();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const currentSelectedId = selectedId ?? localSelectedId;
  const activeId = pinnedId ?? hoveredId;
  const activePoint = points.find((point) => point.id === activeId);
  const maxValue = Math.max(0, ...points.map((point) => point.value));

  const dismissDetail = useCallback(() => {
    const trigger = activeId ? triggerRefs.current[activeId] : undefined;
    if (pinnedId && currentSelectedId === pinnedId) {
      setLocalSelectedId(undefined);
      onSelect(pinnedId);
    }
    setPinnedId(undefined);
    setHoveredId(undefined);
    trigger?.focus();
  }, [activeId, currentSelectedId, onSelect, pinnedId]);

  useEffect(() => {
    if (!activeId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissDetail();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node) && pinnedId) {
        event.preventDefault();
        dismissDetail();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeId, dismissDetail, pinnedId]);

  const pinPoint = (pointId: string) => {
    setLocalSelectedId(pointId);
    setPinnedId(pointId);
    setHoveredId(undefined);
    onSelect(pointId);
  };

  return <div className={styles.chartView} ref={rootRef}>
    <div className={styles.chartRows} role="group" aria-label={`Barras de ${title.toLowerCase()}`}>
      {points.map((point) => {
        const tone = point.tone ?? "primary";
        const toneCue = point.tone === "success"
          ? { label: "Favorable", Icon: CheckCheck }
          : point.tone === "warning"
            ? { label: "Atención", Icon: TriangleAlert }
            : point.tone === "danger"
              ? { label: "Prioritario", Icon: TriangleAlert }
              : undefined;
        const remainder = maxValue === 0 ? 1 : Math.max(0, maxValue - point.value);

        return <Button
          key={point.id}
          ref={(element) => { triggerRefs.current[point.id] = element; }}
          type="button"
          variant={currentSelectedId === point.id ? "secondary" : "ghost"}
          className={styles.chartRow}
          aria-label={`${point.label}: ${formatDetail(point)}${toneCue ? ` · ${toneCue.label}` : ""}`}
          aria-pressed={currentSelectedId === point.id}
          onFocus={() => { if (!pinnedId) setHoveredId(point.id); }}
          onMouseEnter={() => { if (!pinnedId) setHoveredId(point.id); }}
          onMouseLeave={() => { if (!pinnedId) setHoveredId(undefined); }}
          onClick={() => pinPoint(point.id)}
        >
          <span className={styles.chartLabelColumn}>
            <span className={styles.chartLabel}>{point.label}</span>
            {toneCue ? <span className={styles.chartToneCue}><toneCue.Icon size={13} aria-hidden />{toneCue.label}</span> : null}
          </span>
          <span className={styles.chartPlot} aria-hidden="true">
            <span className={styles.chartBar} style={{ flexGrow: point.value }}>
              <svg className={styles.chartMark} aria-hidden="true" viewBox="0 0 100 24" preserveAspectRatio="none">
                <rect width="100" height="24" fill={indicatorToneColors[tone]} />
              </svg>
            </span>
            <span className={styles.chartValue}>{formatValue(point)}</span>
            <span className={styles.chartRemainder} style={{ flexGrow: remainder }} />
          </span>
        </Button>;
      })}
    </div>
    {/* La región de estado queda montada para anunciar el detalle al enfocar o fijar una barra. */}
    <Alert role="status" variant="info" className={activePoint ? styles.pinnedDetail : "sr-only"} aria-label={activePoint ? `${pinnedId ? "Detalle fijado" : "Detalle"} de ${activePoint.label}` : undefined}>
      {activePoint ? <AlertDescription>
        <strong>{activePoint.label}</strong>
        <span>{formatDetail(activePoint)}{activePoint.note ? ` · ${activePoint.note}` : ""}</span>
        {pinnedId ? <Button type="button" variant="link" size="sm" className={styles.closeDetail} onClick={dismissDetail}>Cerrar detalle</Button> : null}
      </AlertDescription> : null}
    </Alert>
  </div>;
}
