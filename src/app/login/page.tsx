import { redirect } from "next/navigation";
import { connection } from "next/server";

import { LoginForm } from "@/components/auth/login-form";
import { getAuthMode, getSession } from "@/lib/session";
import { scenarios } from "@/lib/scenarios";

type LoginSearchParams = Promise<{ destination?: string | string[]; variant?: string | string[] }>;

function getPrototypeReturnPath(searchParams: Awaited<LoginSearchParams>) {
  const destination = Array.isArray(searchParams.destination) ? searchParams.destination[0] : searchParams.destination;
  const variant = Array.isArray(searchParams.variant) ? searchParams.variant[0] : searchParams.variant;

  return ["a", "b", "c", "d", "e", "f", "1", "2", "3"].includes(variant ?? "") && (!destination || destination === "services")
    ? `/app?destination=services&variant=${variant}`
    : "/app";
}

export default async function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  await connection();
  const returnPath = getPrototypeReturnPath(await searchParams);
  const session = await getSession();
  if (session) redirect(returnPath);

  return <LoginForm scenarios={Object.values(scenarios)} authMode={getAuthMode()} redirectTo={returnPath} />;
}
