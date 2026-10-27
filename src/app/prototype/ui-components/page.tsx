import { notFound } from "next/navigation";

import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { InboxIcon } from "lucide-react";

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

      {/* Section: select, native select, radio group, switch (#544) */}
      <section data-testid="ui-select-radio-switch" aria-labelledby="ui-select-radio-switch-title" className="flex max-w-md flex-col gap-4">
        <h2 id="ui-select-radio-switch-title" className="text-lg font-semibold">
          Selector, selector nativo, opciones y interruptor
        </h2>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="srs-zone">Zona</FieldLabel>
            <Select defaultValue="norte" items={{ norte: "Norte", sur: "Sur", este: "Este", oeste: "Oeste" }}>
              <SelectTrigger id="srs-zone" aria-describedby="srs-zone-help">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="norte">Norte</SelectItem>
                  <SelectItem value="sur">Sur</SelectItem>
                  <SelectItem value="este">Este</SelectItem>
                  <SelectItem value="oeste">Oeste</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription id="srs-zone-help">Zona de trabajo</FieldDescription>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="srs-type">Tipo</FieldLabel>
            <Select items={{ poda: "Poda", extraccion: "Extracción" }}>
              <SelectTrigger id="srs-type" aria-invalid aria-describedby="srs-type-error">
                <SelectValue placeholder="Elegí un tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="poda">Poda</SelectItem>
                  <SelectItem value="extraccion">Extracción</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError id="srs-type-error">El tipo es obligatorio</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="srs-native">Estado</FieldLabel>
            <NativeSelect id="srs-native" aria-describedby="srs-native-help">
              <NativeSelectOption value="abierto">Abierto</NativeSelectOption>
              <NativeSelectOption value="cerrado">Cerrado</NativeSelectOption>
            </NativeSelect>
            <FieldDescription id="srs-native-help">Selector del sistema</FieldDescription>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="srs-native-invalid">Prioridad</FieldLabel>
            <NativeSelect id="srs-native-invalid" aria-invalid aria-describedby="srs-native-error" defaultValue="">
              <NativeSelectOption value="" disabled>
                Elegí una prioridad
              </NativeSelectOption>
              <NativeSelectOption value="alta">Alta</NativeSelectOption>
            </NativeSelect>
            <FieldError id="srs-native-error">La prioridad es obligatoria</FieldError>
          </Field>
          <FieldSet>
            <FieldLegend variant="label">Turno</FieldLegend>
            <RadioGroup defaultValue="manana" aria-label="Turno">
              {[
                ["manana", "Mañana"],
                ["tarde", "Tarde"],
                ["noche", "Noche"],
              ].map(([value, label]) => (
                <Field key={value} orientation="horizontal">
                  <RadioGroupItem value={value} id={`srs-shift-${value}`} />
                  <FieldLabel htmlFor={`srs-shift-${value}`}>{label}</FieldLabel>
                </Field>
              ))}
            </RadioGroup>
          </FieldSet>
          <FieldSet>
            <FieldLegend variant="label">Frecuencia</FieldLegend>
            <RadioGroup aria-label="Frecuencia" aria-invalid aria-describedby="srs-freq-error">
              <Field orientation="horizontal" data-invalid>
                <RadioGroupItem value="semanal" id="srs-freq-semanal" aria-invalid />
                <FieldLabel htmlFor="srs-freq-semanal">Semanal</FieldLabel>
              </Field>
              <Field orientation="horizontal" data-invalid>
                <RadioGroupItem value="mensual" id="srs-freq-mensual" aria-invalid />
                <FieldLabel htmlFor="srs-freq-mensual">Mensual</FieldLabel>
              </Field>
            </RadioGroup>
            <FieldError id="srs-freq-error">Elegí una frecuencia</FieldError>
          </FieldSet>
          <Field orientation="horizontal">
            <Switch id="srs-notify" aria-describedby="srs-notify-help" />
            <FieldContent>
              <FieldLabel htmlFor="srs-notify">Avisar al vecino</FieldLabel>
              <FieldDescription id="srs-notify-help">Envía un SMS</FieldDescription>
            </FieldContent>
          </Field>
          <Field orientation="horizontal" data-invalid>
            <Switch id="srs-terms" aria-invalid aria-describedby="srs-terms-error" />
            <FieldContent>
              <FieldLabel htmlFor="srs-terms">Confirmo los datos</FieldLabel>
              <FieldError id="srs-terms-error">Confirmá para continuar</FieldError>
            </FieldContent>
          </Field>
        </FieldGroup>
      </section>

      {/* Section: spinner, pagination, item (#545) */}
      <section data-testid="ui-spinner-pagination-item" aria-labelledby="ui-spi-title" className="flex max-w-md flex-col gap-6">
        <h2 id="ui-spi-title" className="text-lg font-semibold">
          Indicador de carga, paginación y fila
        </h2>
        <Spinner />
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#pagina-1" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#pagina-1">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#pagina-2" isActive>
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#pagina-3" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <ItemGroup>
          <Item variant="outline">
            <ItemMedia variant="icon">
              <InboxIcon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Fila estática</ItemTitle>
              <ItemDescription>Sin acción</ItemDescription>
            </ItemContent>
          </Item>
          <ItemSeparator />
          <Item variant="outline" render={<a href="#detalle" />}>
            <ItemContent>
              <ItemTitle>Fila con enlace</ItemTitle>
              <ItemDescription>Se activa con el teclado</ItemDescription>
            </ItemContent>
            <ItemActions>Abrir</ItemActions>
          </Item>
        </ItemGroup>
      </section>
    </main>
  );
}
