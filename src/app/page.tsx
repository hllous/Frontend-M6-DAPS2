import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSession } from "@/lib/session";

export default async function Home() {
  await connection();
  redirect((await getSession()) ? "/app" : "/login");
}
