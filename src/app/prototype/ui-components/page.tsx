import { notFound } from "next/navigation";

import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Review surface and Playwright fixture for the shared shadcn components in
 * `src/components/ui/`. One `<section data-testid="ui-<group>">` per component group;
 * later tickets append their own sections. Not linked from the operational app.
 * Available outside production only: it returns 404 when NODE_ENV is "production",
 * like `/prototype/shell-examples`.
 */
export default function UiComponentsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="flex flex-col gap-12 p-6 max-[760px]:p-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Componentes base</h1>
        <p className="text-sm text-muted-foreground">Referencia visual de los componentes shadcn compartidos.</p>
      </header>

      {/* Section: field, label, input, textarea (#543) */}
      <section data-testid="ui-field-inputs" aria-labelledby="ui-field-inputs-title" className="flex max-w-md flex-col gap-4">
        <h2 id="ui-field-inputs-title" className="text-lg font-semibold">
          Campo, etiqueta, texto y área de texto
        </h2>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="fx-name">Nombre</FieldLabel>
            <Input id="fx-name" aria-describedby="fx-name-help" />
            <FieldDescription id="fx-name-help">Como figura en el padrón</FieldDescription>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="fx-email">Correo</FieldLabel>
            <Input id="fx-email" aria-invalid aria-errormessage="fx-email-error" aria-describedby="fx-email-error" />
            <FieldError id="fx-email-error">El correo es obligatorio</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="fx-notes">Notas</FieldLabel>
            <Textarea id="fx-notes" />
          </Field>
          <Field>
            <Label htmlFor="fx-solo">Etiqueta suelta</Label>
            <Input id="fx-solo" />
          </Field>
        </FieldGroup>
      </section>
    </main>
  );
}
