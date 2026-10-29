import type { Metadata } from "next";

const destinationTitles = {
  work: "Mi trabajo",
  services: "Servicios",
  referrals: "Derivaciones",
  inventory: "Inventario urbano",
  environment: "Control Ambiental",
  map: "Mapa",
  catalog: "Configuración",
  dashboards: "Tableros",
} as const;

type AppPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: AppPageProps): Promise<Metadata> {
  const { destination } = await searchParams;
  const title = typeof destination === "string"
    ? Object.entries(destinationTitles).find(([id]) => id === destination)?.[1]
    : undefined;

  return { title: `${title ?? destinationTitles.work} — Ambiente e Higiene` };
}

export default function AppPage() {
  return null;
}
