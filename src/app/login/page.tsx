import { redirect } from "next/navigation";
import { connection } from "next/server";

import { LoginForm } from "@/components/auth/login-form";
import { getAuthMode, getSession } from "@/lib/session";
import { returnPathFor } from "@/lib/login-return";
import { scenarios } from "@/lib/scenarios";

type LoginSearchParams = Promise<{ destination?: string | string[]; expired?: string | string[] }>;

export default async function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  await connection();
  const params = await searchParams;
  const returnPath = returnPathFor(params.destination);
  const session = await getSession();
  if (session) redirect(returnPath);

  return <LoginForm scenarios={Object.values(scenarios)} authMode={getAuthMode()} redirectTo={returnPath} sessionExpired={params.expired === "1"} />;
}
