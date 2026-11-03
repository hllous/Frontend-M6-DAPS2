"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, LabelList, XAxis, YAxis, type BarShapeProps } from "recharts";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
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
type ChartPoint = IndicatorPoint & { valueLabel: string; detailLabel: string; toneCue?: string };
type CategoryTickProps = { x?: number | string; y?: number | string; payload?: { value?: unknown; payload?: ChartPoint }; toneCue?: string };

const ROW_HEIGHT = 56;
const MAX_LABEL_CHARACTERS = 20;

const chartConfig = {
  value: { label: "Valor", color: "var(--color-action)" },
} satisfies ChartConfig;

const indicatorToneColors: Record<IndicatorTone, string> = {
  primary: "var(--color-action)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
};

const toneCueLabels: Partial<Record<IndicatorTone, string>> = {
  success: "Favorable",
  warning: "Atención",
  danger: "Prioritario",
};

function wrapLabel(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  const pieces = words.flatMap((word) => {
    const characters = Array.from(word);
    if (characters.length <= MAX_LABEL_CHARACTERS) return [word];
    const chunks: string[] = [];
    for (let index = 0; index < characters.length; index += MAX_LABEL_CHARACTERS) {
      chunks.push(characters.slice(index, index + MAX_LABEL_CHARACTERS).join(""));
    }
    return chunks;
  });
  const lines: string[] = [];
  let currentLine = "";

  for (const piece of pieces) {
    if (!currentLine) {
      currentLine = piece;
    } else if (`${currentLine} ${piece}`.length <= MAX_LABEL_CHARACTERS) {
      currentLine = `${currentLine} ${piece}`;
    } else {
      lines.push(currentLine);
      currentLine = piece;
    }
  }
  if (currentLine) lines.push(currentLine);
  if (lines.length <= 2) return lines;
  return [lines[0], lines.slice(1).join(" ")];
}

function CategoryTick({ x = 0, y = 0, payload, toneCue: tickToneCue }: CategoryTickProps) {
  const tickX = Number(x);
  const label = String(payload?.value ?? "");
  const lines = wrapLabel(label);
  const toneCue = tickToneCue ?? payload?.payload?.toneCue;
  const visibleLines = toneCue ? [...lines, toneCue] : lines;
  const firstLineY = Number(y) - ((visibleLines.length - 1) * 14) / 2;

  return <text aria-hidden="true" className={styles.categoryTick} textAnchor="end" x={tickX - 8} y={firstLineY}>
    {visibleLines.map((line, index) => <tspan key={`${index}-${line}`} x={tickX - 8} dy={index === 0 ? 0 : 14} className={index >= lines.length ? styles.toneCue : undefined}>{line}</tspan>)}
  </text>;
}

function roundedEndPath({ x, y, width, height }: Pick<BarShapeProps, "x" | "y" | "width" | "height">) {
  const radius = Math.max(0, Math.min(4, height / 2, width / 2));
  const right = x + width;
  const bottom = y + height;
  return `M ${x} ${y} H ${right - radius} Q ${right} ${y} ${right} ${y + radius} V ${bottom - radius} Q ${right} ${bottom} ${right - radius} ${bottom} H ${x} Z`;
}

type BreakdownBarPlotProps = {
  points: ChartPoint[];
  chartHeight: number;
  maxValue: number;
  registerTrigger: (pointId: string, element: HTMLButtonElement | null) => void;
  onHover: (pointId: string) => void;
  onHoverEnd: () => void;
  onSelect: (pointId: string) => void;
};

const BreakdownBarPlot = memo(function BreakdownBarPlot({ points, chartHeight, maxValue, registerTrigger, onHover, onHoverEnd, onSelect }: BreakdownBarPlotProps) {
  const toneCuesByLabel = new Map(points.filter((point) => point.toneCue).map((point) => [point.label, point.toneCue]));

  return <ChartContainer
    config={chartConfig}
    className={styles.chartContainer}
    style={{ height: chartHeight, aspectRatio: "auto" }}
    initialDimension={{ width: 720, height: chartHeight }}
  >
    <BarChart data={points} layout="vertical" margin={{ top: 8, right: 18, bottom: 8, left: 0 }}>
      <XAxis type="number" domain={[0, maxValue === 0 ? 1 : maxValue * 1.45]} hide />
      <YAxis dataKey="label" type="category" width={150} interval={0} tick={(tickProps: CategoryTickProps) => <CategoryTick {...tickProps} toneCue={toneCuesByLabel.get(String(tickProps.payload?.value))} />} tickLine={false} axisLine={false} />
      <Bar
        dataKey="value"
        fill="var(--color-value)"
        barSize={24}
        minPointSize={4}
        radius={[0, 4, 4, 0]}
        isAnimationActive={false}
        shape={(shapeProps: BarShapeProps) => {
          const point = shapeProps.payload as ChartPoint;
          const tone = point.tone ?? "primary";
          return <g>
            <path d={roundedEndPath(shapeProps)} className={styles.barShape} fill={indicatorToneColors[tone]} aria-hidden="true" />
            <foreignObject x={shapeProps.x} y={shapeProps.y} width={Math.max(shapeProps.width, 32)} height={shapeProps.height}>
              <Button
                ref={(element) => registerTrigger(point.id, element)}
                type="button"
                variant="ghost"
                size="icon"
                className={styles.barHitTarget}
                style={{ width: "100%", height: "100%", minWidth: 0, minHeight: 0, padding: 0, border: 0, borderRadius: 2, background: "transparent", color: "transparent" }}
                data-point-id={point.id}
                aria-label={`${point.label}: ${point.detailLabel}${point.toneCue ? ` · ${point.toneCue}` : ""}`}
                aria-pressed="false"
                onFocus={() => onHover(point.id)}
                onMouseEnter={() => onHover(point.id)}
                onMouseLeave={onHoverEnd}
                onClick={() => onSelect(point.id)}
              />
            </foreignObject>
          </g>;
        }}
      >
        <LabelList dataKey="valueLabel" position="right" offset={8} className={styles.valueLabel} />
      </Bar>
    </BarChart>
  </ChartContainer>;
});

export function BreakdownBarChart({ points, selectedId, onSelect, title, formatValue, formatDetail }: BreakdownBarChartProps) {
  const [localSelectedId, setLocalSelectedId] = useState(selectedId);
  const [hoveredId, setHoveredId] = useState<string>();
  const [pinnedId, setPinnedId] = useState<string>();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const currentSelectedId = selectedId ?? localSelectedId;
  const selectedIdRef = useRef(currentSelectedId);
  const onSelectRef = useRef(onSelect);
  const pinnedIdRef = useRef(pinnedId);
  const activeId = pinnedId ?? hoveredId;
  const activePoint = points.find((point) => point.id === activeId);
  const chartPoints = useMemo<ChartPoint[]>(() => points.map((point) => ({
    ...point,
    valueLabel: formatValue(point),
    detailLabel: formatDetail(point),
    toneCue: point.tone ? toneCueLabels[point.tone] : undefined,
  })), [formatDetail, formatValue, points]);
  const maxValue = Math.max(0, ...points.map((point) => point.value));
  const chartHeight = Math.max(ROW_HEIGHT, points.length * ROW_HEIGHT);

  useLayoutEffect(() => {
    selectedIdRef.current = currentSelectedId;
    onSelectRef.current = onSelect;
    pinnedIdRef.current = pinnedId;
    for (const trigger of Object.values(triggerRefs.current)) {
      if (trigger) trigger.setAttribute("aria-pressed", String(trigger.dataset.pointId === currentSelectedId));
    }
  }, [currentSelectedId, onSelect, pinnedId]);

  const registerTrigger = useCallback((pointId: string, element: HTMLButtonElement | null) => {
    triggerRefs.current[pointId] = element;
    if (element) element.setAttribute("aria-pressed", String(element.dataset.pointId === selectedIdRef.current));
  }, []);

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

  const pinPoint = useCallback((pointId: string) => {
    setLocalSelectedId(pointId);
    setPinnedId(pointId);
    setHoveredId(undefined);
    onSelectRef.current(pointId);
  }, []);
  const hoverPoint = useCallback((pointId: string) => {
    if (!pinnedIdRef.current) setHoveredId(pointId);
  }, []);
  const clearHoveredPoint = useCallback(() => {
    if (!pinnedIdRef.current) setHoveredId(undefined);
  }, []);

  return <div className={styles.chartView} ref={rootRef} role="group" aria-label={`Barras de ${title.toLowerCase()}`}>
    <BreakdownBarPlot points={chartPoints} chartHeight={chartHeight} maxValue={maxValue} registerTrigger={registerTrigger} onHover={hoverPoint} onHoverEnd={clearHoveredPoint} onSelect={pinPoint} />
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
