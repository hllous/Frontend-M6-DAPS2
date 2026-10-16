import { redirect } from "next/navigation";
import { connection } from "next/server";

import { LoginForm } from "@/components/auth/login-form";
import { getAuthMode, getSession } from "@/lib/session";
import { scenarios } from "@/lib/scenarios";
// PROTOTYPE #529 (throwaway)
import { readPrototypeParams } from "@/components/prototype-529/preserve-params";

type LoginSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function getLoginReturnPath(searchParams: Awaited<LoginSearchParams>) {
  const destination = Array.isArray(searchParams.destination) ? searchParams.destination[0] : searchParams.destination;
  const query = new URLSearchParams();
  if (destination === "services") query.set("destination", destination);
  const patterns = readPrototypeParams((key) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  });
  for (const [key, value] of Object.entries(patterns)) query.set(key, value);
  const suffix = query.toString();
  return suffix ? `/app?${suffix}` : "/app";
}

export default async function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  await connection();
  const returnPath = getLoginReturnPath(await searchParams);
  const session = await getSession();
  if (session) redirect(returnPath);

  return <LoginForm scenarios={Object.values(scenarios)} authMode={getAuthMode()} redirectTo={returnPath} />;
}
