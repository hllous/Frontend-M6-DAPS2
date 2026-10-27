import { redirect } from "next/navigation";
import { connection } from "next/server";

import { LoginForm } from "@/components/auth/login-form";
import { getAuthMode, getSession } from "@/lib/session";
import { scenarios } from "@/lib/scenarios";

type LoginSearchParams = Promise<{ destination?: string | string[] }>;

function getLoginReturnPath(searchParams: Awaited<LoginSearchParams>) {
  const destination = Array.isArray(searchParams.destination) ? searchParams.destination[0] : searchParams.destination;
  return destination === "services" ? "/app?destination=services" : "/app";
}

export default async function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  await connection();
  const returnPath = getLoginReturnPath(await searchParams);
  const session = await getSession();
  if (session) redirect(returnPath);

  return <LoginForm scenarios={Object.values(scenarios)} authMode={getAuthMode()} redirectTo={returnPath} />;
}
