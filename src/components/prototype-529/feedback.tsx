"use client";
// PROTOTYPE #529 (throwaway): action result variants. a = toast, b = inline Alert, c = success toast + error Alert.
import { useEffect, useSyncExternalStore } from "react";
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Toaster } from "@/components/ui/sonner";

import type { PatternVariant } from "./preserve-params";
import { usePattern } from "./use-pattern";

let pageNotice: string | null = null;
const listeners = new Set<() => void>();
function setPageNotice(message: string | null) {
  pageNotice = message;
  listeners.forEach((listener) => listener());
}

/** Success of an action: toast (a, c) or an Alert on the page (b). */
export function announceSuccess(variant: PatternVariant | null, message: string) {
  if (variant === "a" || variant === "c") toast.success(message);
  if (variant === "b") setPageNotice(message);
}

/** Error of an action: toast for a; the Alert inside the form for b and c. */
export function useErrorFeedback(message: string | null | undefined) {
  const variant = usePattern("feedback");
  useEffect(() => {
    if (variant === "a" && message) toast.error(message);
  }, [variant, message]);
  return { variant, inline: variant !== "a" };
}

export function InlineError({ message }: { message: string }) {
  return (
    <Alert variant="destructive" role="alert">
      <CircleAlertIcon />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function PageNotice() {
  const message = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    () => pageNotice,
    () => null,
  );
  if (!message) return null;
  return (
    <Alert role="status" className="w-auto">
      <CircleCheckIcon />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function FeedbackHost() {
  const variant = usePattern("feedback");
  useEffect(() => {
    if (variant !== "b") setPageNotice(null);
  }, [variant]);
  return variant === "a" || variant === "c" ? <Toaster position="top-right" /> : null;
}
