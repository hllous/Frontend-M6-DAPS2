import { redirect } from "next/navigation";
import { connection } from "next/server";

import { LoginForm } from "@/components/auth/login-form";
import { getAuthMode, getSession } from "@/lib/session";
import { scenarios } from "@/lib/scenarios";

export default async function LoginPage() {
  await connection();
  const session = await getSession();
  if (session) redirect("/app");

  return <LoginForm scenarios={Object.values(scenarios)} authMode={getAuthMode()} />;
}
