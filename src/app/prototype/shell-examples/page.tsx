import { appShellExamples, shellStateExamples } from "@/components/shell/app-shell.examples";

const shellVariantLabels: Record<keyof typeof appShellExamples, string> = {
  officeQueue: "Oficina · cola de decisiones",
  fieldLeaderRoute: "Campo · responsable de recorrido",
  fieldMemberRoute: "Campo · integrante de cuadrilla",
  limitedOfficeIntake: "Oficina · ingreso con alcance limitado",
};

const shellStateLabels: Record<keyof typeof shellStateExamples, string> = {
  loading: "Cargando",
  unauthenticated: "Sesión requerida",
  forbidden: "Acceso no disponible",
  error: "Error recuperable",
};

/**
 * Stable review surface for the shell's approved tokens, navigation, and shared state
 * primitives (acceptance criterion of #88). Not linked from the operational app; opened
 * directly for design/accessibility review and by the Playwright accessibility suite.
 */
export default function ShellExamplesPage() {
  return (
    <main className="flex flex-col gap-16 p-8">
      <header className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Catálogo de ejemplos del shell</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Referencia visual estable de los tokens aprobados, la navegación por capacidad y los
          estados compartidos del shell operativo, para revisión de diseño y accesibilidad.
        </p>
        <nav aria-label="Ejemplos disponibles">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {Object.keys(shellStateExamples).map((key) => (
              <li key={key}>
                <a className="underline" href={`#state-${key}`}>
                  {shellStateLabels[key as keyof typeof shellStateExamples]}
                </a>
              </li>
            ))}
            {Object.keys(appShellExamples).map((key) => (
              <li key={key}>
                <a className="underline" href={`#${key}`}>
                  {shellVariantLabels[key as keyof typeof appShellExamples]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <section aria-labelledby="shared-states-heading" className="flex flex-col gap-6">
        <h2 id="shared-states-heading" className="text-lg font-medium">Estados compartidos</h2>
        {Object.entries(shellStateExamples).map(([key, element]) => (
          <div key={key} id={`state-${key}`} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {shellStateLabels[key as keyof typeof shellStateExamples]}
            </h3>
            <div className="max-w-2xl rounded-xl border border-border p-6">{element}</div>
          </div>
        ))}
      </section>

      <section aria-labelledby="shell-variants-heading" className="flex flex-col gap-10">
        <h2 id="shell-variants-heading" className="text-lg font-medium">Variantes de escenario</h2>
        {Object.entries(appShellExamples).map(([key, element]) => (
          <div key={key} id={key} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {shellVariantLabels[key as keyof typeof appShellExamples]}
            </h3>
            <div className="overflow-hidden rounded-xl border border-border">{element}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
