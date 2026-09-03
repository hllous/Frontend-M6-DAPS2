"use client"

// PROTOTYPE: three visual-system directions for issue 12, switchable via
// ?variant=A|B|C. This route is evidence for a design decision, not production UI.

import type { CSSProperties, ReactNode } from "react"
import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Layers3,
  ListFilter,
  MapPinned,
  Menu,
  Search,
  SlidersHorizontal,
  Trees,
  Truck,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const VARIANTS = ["A", "B", "C"] as const
type Variant = (typeof VARIANTS)[number]

const VARIANT_NAMES: Record<Variant, string> = {
  A: "Cívico nítido",
  B: "Territorio vivo",
  C: "Sala de señales",
}

const services = [
  { id: "SRV-2841", service: "Recolección de voluminosos", zone: "Villa del Parque", crew: "Cuadrilla 12", time: "08:30", status: "Asignado" },
  { id: "SRV-2839", service: "Mantenimiento de espacio verde", zone: "Agronomía", crew: "Sin asignar", time: "09:15", status: "Planificado" },
  { id: "SRV-2836", service: "Inspección ambiental", zone: "Paternal", crew: "Cuadrilla 7", time: "10:00", status: "Demorado" },
  { id: "SRV-2828", service: "Vaciado de contenedor", zone: "Devoto", crew: "Cuadrilla 4", time: "10:30", status: "En curso" },
]

type PrototypeStyle = CSSProperties & Record<`--${string}`, string>

function Status({ children, tone }: { children: ReactNode; tone: "neutral" | "info" | "success" | "warning" }) {
  const Icon = tone === "success" ? Check : tone === "warning" ? AlertTriangle : tone === "info" ? Clock3 : Layers3
  return (
    <span className={cn("inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap px-2 text-xs font-semibold [&_svg]:size-3.5 [&_svg]:shrink-0", tone === "neutral" && "bg-muted text-muted-foreground", tone === "info" && "bg-[var(--status-info-bg)] text-[var(--status-info-fg)]", tone === "success" && "bg-[var(--status-success-bg)] text-[var(--status-success-fg)]", tone === "warning" && "bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]")} style={{ borderRadius: "var(--status-radius)" }}>
      <Icon aria-hidden="true" />
      {children}
    </span>
  )
}

function MapScene({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative min-h-72 overflow-hidden bg-[var(--map-ground)]" aria-label="Mapa ilustrativo de servicios; la tabla ofrece la misma información">
      <svg className="absolute inset-0 size-full" viewBox="0 0 700 440" role="img" aria-label="Vista esquemática de barrios y recorridos">
        <path d="M0 80 170 52l76 78 164-56 126 68 164-18v316H0Z" fill="var(--map-land)" />
        <path d="M-20 310C122 249 167 332 290 262s210-55 430-160" fill="none" stroke="var(--map-road)" strokeWidth="26" />
        <path d="M64 0c42 122 136 145 187 236s125 118 206 204M357-15c-5 120 78 164 132 224s105 85 211 74" fill="none" stroke="var(--map-line)" strokeWidth="3" />
        <path d="m112 92 106 12 38 96-106 42-82-54Zm334 79 116-8 69 75-51 98-127-13-32-76Z" fill="var(--map-zone)" stroke="var(--map-line)" strokeWidth="2" />
        <path d="M132 282c80-25 107-5 159 27s121 41 191-11" fill="none" stroke="var(--accent)" strokeDasharray="10 8" strokeWidth="5" />
      </svg>
      {[
        ["24%", "37%", "1"], ["47%", "62%", "2"], ["69%", "43%", "3"], ["81%", "68%", "4"],
      ].map(([left, top, label], index) => (
        <button key={label} type="button" aria-label={`Servicio ${label}`} className="absolute flex size-9 items-center justify-center border-2 border-white bg-primary text-xs font-bold text-primary-foreground shadow-[0_5px_14px_rgb(15_23_42/0.28)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring" style={{ left, top, borderRadius: "var(--marker-radius)" }}>
          {index === 2 ? <AlertTriangle aria-hidden="true" /> : label}
        </button>
      ))}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-card px-3 py-2 text-xs font-medium text-card-foreground shadow-[0_8px_20px_rgb(15_23_42/0.16)]" style={{ borderRadius: "var(--radius)" }}>
        <span className="size-2 bg-[var(--accent)]" style={{ borderRadius: "var(--marker-radius)" }} />
        {compact ? "4 servicios visibles" : "Actualizado 10:42 · 4 servicios en esta vista"}
      </div>
    </div>
  )
}

function ServiceRows({ cards = false }: { cards?: boolean }) {
  if (cards) {
    return (
      <div className="flex flex-col gap-2">
        {services.map((item, index) => (
          <button key={item.id} type="button" className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 border border-border bg-card p-3 text-left text-card-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring" style={{ borderRadius: "var(--radius)" }}>
            <span className="flex size-9 items-center justify-center bg-muted font-mono text-xs font-bold text-muted-foreground" style={{ borderRadius: "var(--marker-radius)" }}>{index + 1}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{item.service}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.zone} · {item.time}</span>
            </span>
            <Status tone={item.status === "Demorado" ? "warning" : item.status === "En curso" ? "success" : item.status === "Asignado" ? "info" : "neutral"}>{item.status}</Status>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto" tabIndex={0} aria-label="Servicios operativos, tabla desplazable">
      <table className="w-full min-w-[660px] border-collapse text-left text-sm">
        <thead className="bg-muted text-xs text-muted-foreground">
          <tr>{["Servicio", "Zona", "Cuadrilla", "Hora", "Estado"].map((heading) => <th key={heading} scope="col" className="px-3 py-2.5 font-semibold">{heading}</th>)}</tr>
        </thead>
        <tbody>
          {services.map((item) => (
            <tr key={item.id} className="border-t border-border bg-card text-card-foreground transition-colors hover:bg-muted/70">
              <th scope="row" className="px-3 py-3 font-medium"><span className="block">{item.service}</span><span className="mt-0.5 block font-mono text-[11px] font-normal text-muted-foreground">{item.id}</span></th>
              <td className="px-3 py-3">{item.zone}</td><td className="px-3 py-3">{item.crew}</td><td className="px-3 py-3 font-mono tabular-nums">{item.time}</td>
              <td className="px-3 py-3"><Status tone={item.status === "Demorado" ? "warning" : item.status === "En curso" ? "success" : item.status === "Asignado" ? "info" : "neutral"}>{item.status}</Status></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PrototypeNotice({ variant }: { variant: Variant }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-[var(--notice)] px-4 py-2 text-xs text-[var(--notice-fg)] sm:px-6">
      <span><strong>Prototipo · Iteración 1.</strong> Compara dirección visual, no funcionalidad ni arquitectura.</span>
      <span className="hidden font-mono sm:block">{variant} · {VARIANT_NAMES[variant]}</span>
    </div>
  )
}

function VariantA() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PrototypeNotice variant="A" />
      <div className="grid min-h-[calc(100vh-33px)] lg:grid-cols-[220px_1fr]">
        <aside className="hidden border-r border-[var(--nav-border)] bg-[var(--nav)] text-[var(--nav-fg)] lg:flex lg:flex-col">
          <div className="flex min-h-16 items-center gap-3 border-b border-[var(--nav-border)] px-5"><Trees aria-hidden="true" /><div><strong className="block text-sm">M6 Operaciones</strong><span className="text-xs text-[var(--nav-muted)]">Municipalidad UADE</span></div></div>
          <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Navegación principal">{["Mi trabajo", "Servicios", "Inventario", "Control ambiental", "Mapa", "Tableros"].map((item, index) => <button key={item} type="button" className={cn("flex min-h-10 items-center gap-3 px-3 text-left text-sm font-medium", index === 1 ? "bg-[var(--nav-active)] text-white" : "text-[var(--nav-muted)] hover:bg-white/10 hover:text-white")} style={{ borderRadius: "var(--radius)" }}><span className="size-1.5 bg-current" style={{ borderRadius: "var(--marker-radius)" }} />{item}</button>)}</nav>
          <div className="border-t border-[var(--nav-border)] p-4 text-xs text-[var(--nav-muted)]">Turno mañana · Oficina central</div>
        </aside>
        <main className="min-w-0">
          <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border bg-card px-4 sm:px-6"><div className="flex items-center gap-3"><button type="button" className="lg:hidden" aria-label="Abrir navegación"><Menu aria-hidden="true" /></button><div><h1 className="text-lg font-bold tracking-[-0.02em]">Servicios</h1><p className="text-xs text-muted-foreground">Planificación y seguimiento territorial</p></div></div><Button>Asignar cuadrilla</Button></header>
          <section className="px-4 py-5 sm:px-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-bold tracking-[-0.025em]">Operación de hoy</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Encontrá servicios sin asignar y revisá su contexto geográfico antes de actuar.</p></div><div className="flex gap-2"><Button variant="outline"><ListFilter data-icon="inline-start" />Filtrar</Button><Button variant="outline"><Search data-icon="inline-start" />Buscar</Button></div></div>
            <div className="grid overflow-hidden border border-border bg-card shadow-[0_10px_30px_rgb(15_44_89/0.08)] xl:grid-cols-[minmax(480px,0.9fr)_minmax(460px,1.1fr)]" style={{ borderRadius: "var(--radius)" }}><div className="min-w-0"><div className="flex items-center justify-between border-b border-border px-4 py-3"><strong className="text-sm">12 servicios · 3 requieren atención</strong><span className="text-xs text-muted-foreground">Orden: horario</span></div><ServiceRows /></div><div className="border-t border-border xl:border-l xl:border-t-0"><MapScene /></div></div>
          </section>
        </main>
      </div>
    </div>
  )
}

function VariantB() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PrototypeNotice variant="B" />
      <header className="border-b border-border bg-card"><div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-5 px-4 sm:px-7"><div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center bg-primary text-primary-foreground" style={{ borderRadius: "var(--marker-radius)" }}><Trees aria-hidden="true" /></div><div><strong className="block text-base tracking-[-0.02em]">Ambiente y servicios urbanos</strong><span className="text-xs text-muted-foreground">Centro operativo municipal</span></div></div><nav className="hidden items-center gap-6 text-sm font-semibold lg:flex" aria-label="Navegación principal"><a href="#queue">Trabajo</a><a href="#queue" className="text-primary underline decoration-2 underline-offset-8">Servicios</a><a href="#map">Territorio</a><a href="#queue">Catálogos</a></nav><Button>Programar servicio</Button></div></header>
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7">
        <div className="mb-6 grid gap-5 border-b border-border pb-6 lg:grid-cols-[1fr_auto]"><div><h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-[-0.025em] sm:text-4xl">El territorio ordena el trabajo de hoy.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">La prioridad es sostener el servicio, anticipar demoras y asignar cada recorrido con contexto suficiente.</p></div><div className="flex items-center gap-6 text-sm"><div><span className="block text-2xl font-bold tabular-nums">12</span><span className="text-muted-foreground">planificados</span></div><div><span className="block text-2xl font-bold text-[var(--status-warning-fg)] tabular-nums">3</span><span className="text-muted-foreground">con atención</span></div></div></div>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.75fr)]">
          <div id="map" className="overflow-hidden border border-border bg-card" style={{ borderRadius: "var(--radius)" }}><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"><div><h2 className="text-lg font-bold">Situación territorial</h2><p className="text-xs text-muted-foreground">Capas: servicios · cuadrillas · zonas</p></div><Button variant="outline"><SlidersHorizontal data-icon="inline-start" />Ajustar vista</Button></div><MapScene /></div>
          <div id="queue" className="border border-border bg-[var(--queue)] p-4" style={{ borderRadius: "var(--radius)" }}><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold">Próximos servicios</h2><p className="text-xs text-muted-foreground">Ordenados por horario</p></div><Status tone="warning">3 alertas</Status></div><ServiceRows cards /><button type="button" className="mt-3 flex min-h-10 w-full items-center justify-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring">Ver los 12 servicios <ChevronRight aria-hidden="true" /></button></div>
        </section>
      </main>
    </div>
  )
}

function VariantC() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PrototypeNotice variant="C" />
      <header className="bg-[var(--nav)] text-[var(--nav-fg)]"><div className="flex min-h-14 items-center justify-between gap-4 px-4 sm:px-6"><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center bg-[var(--signal)] text-[var(--signal-fg)]" style={{ borderRadius: "var(--marker-radius)" }}><Trees aria-hidden="true" /></div><strong className="text-sm tracking-wide">M6 · CONTROL OPERATIVO</strong></div><div className="hidden items-center gap-5 text-xs text-[var(--nav-muted)] md:flex"><span className="inline-flex items-center gap-1.5"><span className="size-2 bg-[var(--status-success-fg)]" style={{ borderRadius: "var(--marker-radius)" }} />Datos al día</span><span className="font-mono tabular-nums">Mié 02 Sep · 10:42 ART</span></div><Button>Nuevo servicio</Button></div></header>
      <nav className="flex min-h-11 items-center gap-1 overflow-x-auto border-b border-border bg-card px-3 text-xs font-semibold" aria-label="Navegación principal">{["Mi trabajo", "Servicios", "Mapa", "Inventario", "Control ambiental", "Tableros"].map((item, index) => <button key={item} type="button" className={cn("min-h-8 whitespace-nowrap px-3", index === 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")} style={{ borderRadius: "var(--radius)" }}>{item}</button>)}</nav>
      <main className="p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold tracking-[-0.02em]">Servicios en curso</h1><p className="text-xs text-muted-foreground">Turno mañana · todas las zonas · actualización automática</p></div><div className="flex gap-2"><Button variant="outline"><Search data-icon="inline-start" />Buscar</Button><Button variant="outline"><ListFilter data-icon="inline-start" />Filtros 2</Button></div></div>
        <div className="grid min-h-[690px] overflow-hidden border border-border bg-card lg:grid-cols-[310px_minmax(400px,1fr)_280px]" style={{ borderRadius: "var(--radius)" }}>
          <section className="border-b border-border p-3 lg:border-b-0 lg:border-r"><div className="mb-3 flex items-center justify-between"><strong className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Cola priorizada</strong><span className="font-mono text-xs">12</span></div><ServiceRows cards /></section>
          <section className="min-w-0 border-b border-border lg:border-b-0 lg:border-r"><div className="flex min-h-11 items-center justify-between border-b border-border px-3"><strong className="text-sm">Mapa sincronizado</strong><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPinned aria-hidden="true" />4 visibles</span><span className="inline-flex items-center gap-1"><Layers3 aria-hidden="true" />3 capas</span></div></div><MapScene compact /></section>
          <aside className="p-4"><div className="mb-5"><Status tone="info">Asignado</Status><h2 className="mt-3 text-lg font-bold">Recolección de voluminosos</h2><p className="mt-1 font-mono text-xs text-muted-foreground">SRV-2841 · 08:30–11:30</p></div><dl className="flex flex-col gap-4 text-sm"><div><dt className="text-xs font-semibold text-muted-foreground">Zona</dt><dd className="mt-1 font-medium">Villa del Parque</dd></div><div><dt className="text-xs font-semibold text-muted-foreground">Cuadrilla</dt><dd className="mt-1 inline-flex items-center gap-2"><Users aria-hidden="true" />Cuadrilla 12</dd></div><div><dt className="text-xs font-semibold text-muted-foreground">Vehículo</dt><dd className="mt-1 inline-flex items-center gap-2"><Truck aria-hidden="true" />VH-042 · Compactador</dd></div></dl><div className="my-5 h-px bg-border" /><Button className="w-full">Abrir detalle</Button><Button variant="outline" className="mt-2 w-full">Reasignar</Button></aside>
        </div>
      </main>
    </div>
  )
}

const STYLES: Record<Variant, PrototypeStyle> = {
  A: { "--background": "oklch(0.975 0.006 245)", "--foreground": "oklch(0.24 0.035 252)", "--card": "oklch(1 0 0)", "--card-foreground": "oklch(0.22 0.035 252)", "--popover": "oklch(1 0 0)", "--popover-foreground": "oklch(0.22 0.035 252)", "--primary": "oklch(0.38 0.105 252)", "--primary-foreground": "oklch(0.99 0 0)", "--secondary": "oklch(0.94 0.02 245)", "--secondary-foreground": "oklch(0.28 0.05 252)", "--muted": "oklch(0.955 0.008 245)", "--muted-foreground": "oklch(0.46 0.03 252)", "--accent": "#C34F3D", "--accent-foreground": "#FFFFFF", "--border": "oklch(0.88 0.018 245)", "--input": "oklch(0.88 0.018 245)", "--ring": "oklch(0.5 0.12 246)", "--radius": "10px", "--status-radius": "999px", "--marker-radius": "50%", "--status-info-bg": "#E4F0F8", "--status-info-fg": "#164F78", "--status-success-bg": "#E3F3EC", "--status-success-fg": "#176047", "--status-warning-bg": "#FCE9E4", "--status-warning-fg": "#8F3224", "--nav": "#102D4F", "--nav-fg": "#FFFFFF", "--nav-muted": "#C6D5E4", "--nav-border": "#294663", "--nav-active": "#245C91", "--notice": "#E8F0F7", "--notice-fg": "#24435F", "--map-ground": "#DCE8EC", "--map-land": "#EEF3F1", "--map-road": "#FFFFFF", "--map-line": "#A5B8BE", "--map-zone": "#D1E1D9", "--queue": "#FFFFFF", "--signal": "#FFFFFF", "--signal-fg": "#102D4F" },
  B: { "--background": "oklch(0.955 0.018 104)", "--foreground": "oklch(0.25 0.04 155)", "--card": "oklch(0.992 0.008 100)", "--card-foreground": "oklch(0.23 0.04 155)", "--popover": "oklch(0.992 0.008 100)", "--popover-foreground": "oklch(0.23 0.04 155)", "--primary": "oklch(0.41 0.095 158)", "--primary-foreground": "oklch(0.99 0.005 100)", "--secondary": "oklch(0.91 0.035 105)", "--secondary-foreground": "oklch(0.3 0.05 155)", "--muted": "oklch(0.935 0.018 110)", "--muted-foreground": "oklch(0.46 0.035 150)", "--accent": "#B85B3C", "--accent-foreground": "#FFFFFF", "--border": "oklch(0.82 0.035 105)", "--input": "oklch(0.82 0.035 105)", "--ring": "oklch(0.49 0.11 157)", "--radius": "6px", "--status-radius": "4px", "--marker-radius": "50%", "--status-info-bg": "#DCEDE7", "--status-info-fg": "#15523C", "--status-success-bg": "#DDEBD8", "--status-success-fg": "#2C5A2D", "--status-warning-bg": "#F3E4CC", "--status-warning-fg": "#7A4518", "--nav": "#173B2E", "--nav-fg": "#FFFDF3", "--nav-muted": "#C9D8CF", "--nav-border": "#345949", "--nav-active": "#28674F", "--notice": "#E8E9D8", "--notice-fg": "#3C4A38", "--map-ground": "#D9E2D4", "--map-land": "#EEF0E1", "--map-road": "#FFFDF6", "--map-line": "#9CAD99", "--map-zone": "#C5D7C0", "--queue": "#F9F5E9", "--signal": "#E5B84E", "--signal-fg": "#173B2E" },
  C: { "--background": "oklch(0.945 0.008 230)", "--foreground": "oklch(0.2 0.025 236)", "--card": "oklch(0.99 0.004 230)", "--card-foreground": "oklch(0.19 0.025 236)", "--popover": "oklch(0.99 0.004 230)", "--popover-foreground": "oklch(0.19 0.025 236)", "--primary": "oklch(0.34 0.045 235)", "--primary-foreground": "oklch(0.99 0 0)", "--secondary": "oklch(0.91 0.012 230)", "--secondary-foreground": "oklch(0.24 0.03 236)", "--muted": "oklch(0.93 0.01 230)", "--muted-foreground": "oklch(0.43 0.03 235)", "--accent": "#087F8C", "--accent-foreground": "#FFFFFF", "--border": "oklch(0.78 0.018 230)", "--input": "oklch(0.78 0.018 230)", "--ring": "oklch(0.52 0.11 205)", "--radius": "3px", "--status-radius": "3px", "--marker-radius": "3px", "--status-info-bg": "#D6EBEE", "--status-info-fg": "#075965", "--status-success-bg": "#D9ECE3", "--status-success-fg": "#155D42", "--status-warning-bg": "#F4DFE2", "--status-warning-fg": "#8A2937", "--nav": "#1E2C36", "--nav-fg": "#F8FAFB", "--nav-muted": "#C0CBD1", "--nav-border": "#41515C", "--nav-active": "#344A59", "--notice": "#DDE6EA", "--notice-fg": "#263C48", "--map-ground": "#D6E1E3", "--map-land": "#E8EDEE", "--map-road": "#FAFCFC", "--map-line": "#8CA2A8", "--map-zone": "#BCD3D1", "--queue": "#FFFFFF", "--signal": "#B8D641", "--signal-fg": "#162027" },
}

function PrototypeSwitcher({ variant }: { variant: Variant }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const select = (next: Variant) => {
    const nextParams = new URLSearchParams(params.toString())
    nextParams.set("variant", next)
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }

  const cycle = (direction: -1 | 1) => {
    const current = VARIANTS.indexOf(variant)
    select(VARIANTS[(current + direction + VARIANTS.length) % VARIANTS.length])
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.matches("input, textarea, [contenteditable='true']")) return
      if (event.key === "ArrowLeft") cycle(-1)
      if (event.key === "ArrowRight") cycle(1)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  if (process.env.NODE_ENV === "production") return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-950 p-1.5 text-white shadow-[0_12px_32px_rgb(0_0_0/0.3)]" aria-label="Selector de variante del prototipo">
      <button type="button" onClick={() => cycle(-1)} className="flex size-10 items-center justify-center rounded-full hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Variante anterior"><ArrowLeft aria-hidden="true" /></button>
      <span className="min-w-40 px-2 text-center text-sm font-semibold">{variant} · {VARIANT_NAMES[variant]}</span>
      <button type="button" onClick={() => cycle(1)} className="flex size-10 items-center justify-center rounded-full hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Variante siguiente"><ArrowRight aria-hidden="true" /></button>
    </div>
  )
}

export function DesignSystemPrototype() {
  const params = useSearchParams()
  const requested = params.get("variant")?.toUpperCase()
  const variant: Variant = requested === "B" || requested === "C" ? requested : "A"

  return (
    <div style={STYLES[variant]} data-prototype-variant={variant}>
      {variant === "A" ? <VariantA /> : variant === "B" ? <VariantB /> : <VariantC />}
      <PrototypeSwitcher variant={variant} />
    </div>
  )
}
