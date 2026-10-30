import Link from "next/link";
import { ArrowRightIcon, FileSearchIcon, MapPinIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Entry = {
  title: string;
  description: string;
  icon: typeof FileSearchIcon;
  /** Sin `href` la entrada todavía no está disponible. */
  href?: string;
};

// Cada ticket de la sección pública agrega su `href` acá cuando su pantalla existe.
const ENTRIES: Entry[] = [
  { title: "Seguir mi denuncia", description: "Mirá en qué etapa está tu denuncia con el código de tu comprobante.", icon: FileSearchIcon, href: "/consulta/denuncia" },
  { title: "Servicios", description: "Consultá cuándo pasa cada servicio por tu zona.", icon: Trash2Icon, href: "/consulta/servicios" },
  { title: "Puntos verdes", description: "Encontrá dónde llevar tus residuos y cuáles recibe cada punto.", icon: MapPinIcon },
];

export function PublicLanding() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-[34px]">Consultas para vecinas y vecinos</h1>
        <p className="max-w-[60ch] text-muted-foreground">Elegí qué querés consultar. No hace falta crear una cuenta.</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {ENTRIES.map(({ title, description, icon: Icon, href }) => (
          <li key={title} className="flex">
            <Card className="relative w-full">
              <CardHeader className="gap-3">
                <Icon aria-hidden="true" className="size-6 text-[var(--color-action)]" />
                <CardTitle role="heading" aria-level={2} className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
                {href ? (
                  <Link href={href} aria-label={`${title}: ir a la consulta`} className="mt-1 inline-flex min-h-10 items-center gap-1 rounded-md font-medium text-[var(--color-action)] underline-offset-4 hover:underline after:absolute after:inset-0 max-[760px]:min-h-12">
                    Consultar <ArrowRightIcon aria-hidden="true" className="size-4" />
                  </Link>
                ) : (
                  <Badge variant="neutral" className="w-fit">Próximamente</Badge>
                )}
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
