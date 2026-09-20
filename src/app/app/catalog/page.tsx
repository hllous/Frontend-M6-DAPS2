import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

export default async function CatalogPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  // Alias heredado: el catalogo vive en /app?destination=catalog, como el resto de los modulos.
  redirect("/app?destination=catalog");
}
